'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

type InventoryItem = {
  id: string;
  productId: string;
  product: string;
  sku: string;
  size: string;
  stock: number;
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saveError, setSaveError] = useState<string | null>(null);
  // Per-product size→stock map as stored in the product document (keeps sizes not listed in `sizes`)
  const [productSizeStock, setProductSizeStock] = useState<Record<string, { hasSizes: boolean; sizeStock: Record<string, number> }>>({});
  // Id of the row whose edit has not been committed yet: Enter and the following blur must save only once
  const pendingEditRef = useRef<string | null>(null);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminFetch('/api/products?limit=100&includeHidden=true');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const items: InventoryItem[] = [];
          const sizeStockByProduct: Record<string, { hasSizes: boolean; sizeStock: Record<string, number> }> = {};
          data.data.forEach((p: Record<string, unknown>) => {
            const pId = String(p.$id || p.id || '');
            const pName = String(p.name || 'Untitled');
            const pSlug = String(p.slug || pId);
            const sizes = Array.isArray(p.sizes) ? p.sizes : ['Free Size'];
            const stockTotal = Number(p.stock) || 0;

            let sizeStockMap: Record<string, number> = {};
            if (p.sizeStock) {
              try {
                sizeStockMap = typeof p.sizeStock === 'string' ? JSON.parse(p.sizeStock as string) : (p.sizeStock as Record<string, number>);
              } catch {}
            }

            if (!sizeStockMap || typeof sizeStockMap !== 'object') sizeStockMap = {};
            const hasExactMap = Object.keys(sizeStockMap).length > 0;
            sizeStockByProduct[pId] = { hasSizes: Array.isArray(p.sizes), sizeStock: sizeStockMap };

            // Without a per-size map, split the total evenly (remainder on the first size) so sizes sum to the total
            const evenShare = Math.floor(stockTotal / Math.max(1, sizes.length));
            sizes.forEach((sz, idx) => {
              const szStr = String(sz);
              const exactSizeStock = typeof sizeStockMap[szStr] === 'number'
                ? sizeStockMap[szStr]
                : hasExactMap
                  ? 0
                  : (idx === 0 ? stockTotal - evenShare * (sizes.length - 1) : evenShare);

              items.push({
                id: `${pId}-${sz}`,
                productId: pId,
                product: pName,
                sku: `${pSlug.toUpperCase().slice(0, 10)}-${sz}`,
                size: szStr,
                stock: exactSizeStock,
              });
            });
          });
          setInventory(items);
          setProductSizeStock(sizeStockByProduct);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadInventory(), 0);
    return () => clearTimeout(timer);
  }, [loadInventory]);

  const getStatus = (stock: number) => {
    if (stock === 0) return 'out-of-stock';
    if (stock <= 15) return 'low-stock';
    return 'in-stock';
  };

  const getStatusBadge = (stock: number) => {
    if (stock === 0) {
      return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">Out of Stock</span>;
    }
    if (stock <= 15) {
      return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Low Stock</span>;
    }
    return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-500/10 text-green-500 border border-green-500/20">In Stock</span>;
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.product.toLowerCase().includes(search.toLowerCase()) || 
                          item.sku.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    const status = getStatus(item.stock);
    if (filter === 'all') return true;
    return status === filter;
  });

  const handleEditStart = (item: InventoryItem) => {
    pendingEditRef.current = item.id;
    setEditingId(item.id);
    setEditValue(item.stock.toString());
  };

  const handleEditCancel = () => {
    pendingEditRef.current = null;
    setEditingId(null);
  };

  const handleEditSave = async () => {
    const editId = pendingEditRef.current;
    // Already saved (Enter followed by blur) or cancelled
    if (!editId || editId !== editingId) return;
    pendingEditRef.current = null;
    setEditingId(null);

    const numValue = parseInt(editValue, 10);
    const targetItem = inventory.find(i => i.id === editId);
    if (isNaN(numValue) || numValue < 0 || !targetItem || targetItem.stock === numValue) return;

    const previousStock = targetItem.stock;
    const nextInventory = inventory.map(item =>
      item.id === editId ? { ...item, stock: numValue } : item
    );
    setInventory(prev => prev.map(item => (item.id === editId ? { ...item, stock: numValue } : item)));
    setSaveError(null);

    if (!targetItem.productId) return;

    // The product stores per-size stock in `sizeStock` and the total in `stock`: update both together
    const meta = productSizeStock[targetItem.productId];
    const payload: Record<string, unknown> = {};
    if (meta && !meta.hasSizes) {
      // Product without sizes: the single row is the total stock
      payload.stock = numValue;
    } else {
      const sizeStock: Record<string, number> = { ...(meta?.sizeStock || {}) };
      nextInventory
        .filter(item => item.productId === targetItem.productId)
        .forEach(item => {
          sizeStock[item.size] = item.stock;
        });
      payload.sizeStock = JSON.stringify(sizeStock);
      payload.stock = Object.values(sizeStock).reduce((sum, n) => sum + (Number(n) || 0), 0);
    }

    try {
      const res = await adminFetch(`/api/products/${targetItem.productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to save stock');
      if (typeof payload.sizeStock === 'string') {
        setProductSizeStock(prev => ({
          ...prev,
          [targetItem.productId]: { hasSizes: true, sizeStock: JSON.parse(payload.sizeStock as string) },
        }));
      }
    } catch (err) {
      setInventory(prev => prev.map(item => (item.id === editId ? { ...item, stock: previousStock } : item)));
      setSaveError(`${targetItem.product} (${targetItem.size}): ${err instanceof Error ? err.message : 'Failed to save stock'}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleEditSave();
    if (e.key === 'Escape') handleEditCancel();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-[#0a0a0a] min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Inventory Management</h1>
          <p className="text-[#a3a3a3]">Track and update your product stock levels in real-time from the database.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={loadInventory} className="border border-[#262626] text-white px-4 py-2 rounded-lg hover:bg-[#1a1a1a] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {saveError && (
        <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center justify-between gap-4">
          <span>Stock not saved — {saveError}</span>
          <button onClick={() => setSaveError(null)} className="text-red-300 hover:text-white">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-[#262626] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'in-stock', label: 'In Stock' },
              { id: 'low-stock', label: 'Low Stock' },
              { id: 'out-of-stock', label: 'Out of Stock' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as "all" | "in-stock" | "low-stock" | "out-of-stock")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filter === tab.id 
                    ? 'bg-[#262626] text-white' 
                    : 'text-[#a3a3a3] hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="relative w-full md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#737373] text-[18px]">search</span>
            <input 
              type="text" 
              placeholder="Search products or SKUs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-white focus:border-[#d2f000] outline-none text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left divide-y divide-[#262626]">
            <thead>
              <tr className="bg-[#1a1a1a] text-[#737373] text-sm">
                <th className="px-6 py-3 font-medium">Product / SKU</th>
                <th className="px-6 py-3 font-medium">Size</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="w-6 h-6 border-2 border-electric-lime border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-[#a3a3a3]">Loading inventory from database...</p>
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-[#262626] mb-2">inventory_2</span>
                    <p className="text-[#a3a3a3]">No inventory items found.</p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map(item => (
                  <tr key={item.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{item.product}</span>
                        <span className="text-[#737373] text-sm">{item.sku}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#a3a3a3]">{item.size}</td>
                    <td className="px-6 py-4">{getStatusBadge(item.stock)}</td>
                    <td className="px-6 py-4 text-right">
                      {editingId === item.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input 
                            type="number" 
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                            onBlur={handleEditSave}
                            className="w-20 bg-[#1a1a1a] border border-[#d2f000] rounded px-2 py-1 text-white text-right outline-none"
                          />
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleEditStart(item)}
                          className="text-white hover:text-[#d2f000] flex items-center justify-end gap-2 w-full group"
                          title="Click to edit stock level"
                        >
                          <span className="opacity-0 group-hover:opacity-100 material-symbols-outlined text-[16px] text-[#737373]">edit</span>
                          <span className="font-medium text-lg">{item.stock}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
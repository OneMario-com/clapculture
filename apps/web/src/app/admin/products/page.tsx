/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { resolveImageUrl } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  img: string;
  category: string;
  price: string;
  stock: number;
  isActive: boolean;
  stockStatus: string;
  created: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [visibilityFilter, setVisibilityFilter] = useState<'ALL' | 'ACTIVE' | 'HIDDEN'>('ALL');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; msg: string; isError?: boolean }>({ show: false, msg: '' });

  const showNotification = (msg: string, isError = false) => {
    setToast({ show: true, msg, isError });
    setTimeout(() => setToast({ show: false, msg: '' }), 3500);
  };
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('adminToken');
        const res = await fetch('/api/products?limit=100&includeHidden=true', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            const mapped: AdminProduct[] = data.data.map((doc: Record<string, unknown>) => {
              const images = Array.isArray(doc.images) ? doc.images : [];
              const rawImg = images[0] || '';
              const image = resolveImageUrl(rawImg) || '/herobg1-desktop.png';
              
              const isDocActive = doc.isActive !== false && !(Array.isArray(doc.badges) && (doc.badges.includes('HIDDEN') || doc.badges.includes('DISABLED')));
              
              return {
                id: (doc.$id || doc.id || '') as string,
                slug: (doc.slug || doc.$id || '') as string,
                name: (doc.name || 'Untitled Product') as string,
                image,
                category: (doc.category || 'Tees') as string,
                price: `₹${doc.price || 699}`,
                stock: Number(doc.stock) || 0,
                isActive: isDocActive,
                stockStatus: (Number(doc.stock) || 0) > 0 ? 'In Stock' : 'Sold Out',
                created: doc.$createdAt ? new Date(doc.$createdAt as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recently',
              };
            });
            setProducts(mapped);
          }
        }
      } catch {
        if (!cancelled) showNotification('Failed to load products from database', true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleToggleVisibility = async (productId: string, currentIsActive: boolean) => {
    setTogglingId(productId);
    const newIsActive = !currentIsActive;
    
    // Optimistic UI update
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, isActive: newIsActive } : p));

    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          isActive: newIsActive,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showNotification(
          newIsActive 
            ? '✓ Product is now ACTIVE on storefront!' 
            : '✓ Product is now HIDDEN (users will see 404 page)'
        );
      } else {
        // Revert on failure
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, isActive: currentIsActive } : p));
        showNotification(json.error || 'Failed to update visibility', true);
      }
    } catch {
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, isActive: currentIsActive } : p));
      showNotification('Network error while toggling visibility', true);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'All Categories' || p.category === selectedCategory;
    const matchesVisibility = 
      visibilityFilter === 'ALL' || 
      (visibilityFilter === 'ACTIVE' && p.isActive) || 
      (visibilityFilter === 'HIDDEN' && !p.isActive);
    return matchesSearch && matchesCat && matchesVisibility;
  });

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom ${
          toast.isError ? 'bg-red-600 text-white' : 'bg-[#d2f000] text-black'
        }`}>
          <span className="material-symbols-outlined text-xl">
            {toast.isError ? 'error' : 'check_circle'}
          </span>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Products Catalog</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">
            Manage inventory and toggle storefront visibility (hidden products return 404).
          </p>
        </div>
        <Link href="/admin/products/new" className="bg-[#d2f000] text-black font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-[#b8d400] transition-colors">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Product
        </Link>
      </div>

      {/* Visibility Quick Filters */}
      <div className="flex flex-wrap gap-2 pt-1 border-b border-[#262626] pb-3">
        <button
          onClick={() => setVisibilityFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-colors ${
            visibilityFilter === 'ALL'
              ? 'bg-white text-black'
              : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#262626]'
          }`}
        >
          All ({products.length})
        </button>
        <button
          onClick={() => setVisibilityFilter('ACTIVE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-colors ${
            visibilityFilter === 'ACTIVE'
              ? 'bg-[#d2f000] text-black'
              : 'bg-[#1a1a1a] text-green-400 hover:text-green-300 border border-[#262626]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Active Live ({products.filter(p => p.isActive).length})
        </button>
        <button
          onClick={() => setVisibilityFilter('HIDDEN')}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-colors ${
            visibilityFilter === 'HIDDEN'
              ? 'bg-amber-500 text-black'
              : 'bg-[#1a1a1a] text-amber-400 hover:text-amber-300 border border-[#262626]'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          Hidden / 404 ({products.filter(p => !p.isActive).length})
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-[#737373]">search</span>
          <input
            type="text"
            placeholder="Search products by name or URL slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#141414] border border-[#262626] rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#d2f000] transition-colors"
          />
        </div>
        <select 
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="bg-[#141414] border border-[#262626] rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-[#d2f000]"
        >
          <option>All Categories</option>
          <option>T-Shirts</option>
          <option>Hoodies</option>
          <option>Bottoms</option>
          <option>Accessories</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-electric-lime border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-400 text-sm font-mono">Loading product catalog from database...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] bg-[#1a1a1a]">
                  <th className="p-4 text-xs font-medium text-[#737373] uppercase">Product</th>
                  <th className="p-4 text-xs font-medium text-[#737373] uppercase">Category</th>
                  <th className="p-4 text-xs font-medium text-[#737373] uppercase">Price</th>
                  <th className="p-4 text-xs font-medium text-[#737373] uppercase">Inventory</th>
                  <th className="p-4 text-xs font-medium text-[#737373] uppercase">Storefront Visibility</th>
                  <th className="p-4 text-xs font-medium text-[#737373] uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-[#1a1a1a] transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={resolveImageUrl(product.img)} alt={product.name} className="w-12 h-12 rounded bg-[#262626] object-cover" />
                        <div>
                          <p className="text-white font-medium text-sm flex items-center gap-1.5">
                            {product.name}
                            {!product.isActive && (
                              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                                404
                              </span>
                            )}
                          </p>
                          <p className="text-[#737373] text-xs font-mono">/product/{product.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-[#a3a3a3]">{product.category}</td>
                    <td className="p-4 text-sm text-white font-medium">{product.price}</td>
                    <td className="p-4">
                      <span className={`text-sm ${product.stock === 0 ? 'text-red-500' : product.stock < 15 ? 'text-yellow-500' : 'text-green-500'}`}>
                        {product.stock} in stock
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => handleToggleVisibility(product.id, product.isActive)}
                        disabled={togglingId === product.id}
                        title={product.isActive ? 'Click to hide/disable product (customers will see 404)' : 'Click to activate product on storefront'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border transition-all ${
                          product.isActive
                            ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                        } ${togglingId === product.id ? 'opacity-50 animate-pulse' : ''}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${product.isActive ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></span>
                        <span>{product.isActive ? 'ACTIVE (LIVE)' : 'HIDDEN (404)'}</span>
                        <span className="material-symbols-outlined text-[14px]">
                          {product.isActive ? 'visibility' : 'visibility_off'}
                        </span>
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link 
                          href={`/admin/products/${product.id}/edit`} 
                          title="Edit Product"
                          className="p-2 bg-[#262626] text-[#a3a3a3] hover:bg-electric-lime hover:text-black rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-[#737373]">
            <span className="material-symbols-outlined text-4xl mb-2 text-[#737373]">inventory_2</span>
            <p className="text-white text-base font-medium">No products found</p>
            <p className="text-xs text-[#737373] mt-1 mb-4">
              {search || selectedCategory !== 'All Categories' || visibilityFilter !== 'ALL'
                ? 'Try adjusting your search or filters.'
                : 'Get started by creating your first product item.'}
            </p>
            <Link href="/admin/products/new" className="inline-flex items-center gap-2 bg-[#d2f000] text-black font-medium px-4 py-2 rounded-lg text-sm hover:bg-[#b8d400] transition-colors">
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Product
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

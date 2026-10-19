'use client';

import { useState, useEffect, useCallback } from 'react';

type DiscountType = 'Percentage' | 'Flat' | 'Free Shipping';

interface Discount {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  minOrder: number;
  expiry: string;
  usageCount: number;
  usageLimit: number | null;
  isActive: boolean;
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [discountToDelete, setDiscountToDelete] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const loadDiscounts = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const res = await fetch('/api/discounts', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const mapped: Discount[] = data.data.map((d: Record<string, unknown>) => ({
            id: String(d.$id || d.id || ''),
            code: String(d.code || ''),
            type: (d.type as DiscountType) || 'Percentage',
            value: Number(d.value) || 0,
            minOrder: Number(d.minOrder) || 0,
            expiry: String(d.expiry || ''),
            usageCount: Number(d.usageCount) || 0,
            usageLimit: d.usageLimit ? Number(d.usageLimit) : null,
            isActive: d.active !== false && d.isActive !== false,
          }));
          setDiscounts(mapped);
        }
      }
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => loadDiscounts(), 0);
    return () => clearTimeout(timer);
  }, [loadDiscounts]);

  const filteredDiscounts = discounts.filter(d => d.code.toLowerCase().includes(search.toLowerCase()));

  const handleToggleStatus = async (id: string) => {
    const target = discounts.find(d => d.id === id);
    if (!target) return;
    const nextActive = !target.isActive;
    setDiscounts(discounts.map(d => d.id === id ? { ...d, isActive: nextActive } : d));

    const token = localStorage.getItem('adminToken');
    fetch(`/api/discounts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ active: nextActive, isActive: nextActive }),
    }).catch(() => {});
  };

  const handleDelete = async () => {
    if (discountToDelete) {
      const id = discountToDelete;
      setDiscounts(discounts.filter(d => d.id !== id));
      setIsDeleteModalOpen(false);
      setDiscountToDelete(null);

      const token = localStorage.getItem('adminToken');
      try {
        await fetch(`/api/discounts/${id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        showToast('Discount deleted successfully');
      } catch {
        showToast('Failed to delete discount');
      }
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`Copied ${code} to clipboard`);
  };

  const handleSaveDiscount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      code: (formData.get('code') as string || '').toUpperCase(),
      type: formData.get('type') as DiscountType,
      value: Number(formData.get('value')) || 0,
      minOrder: Number(formData.get('minOrder')) || 0,
      expiry: formData.get('expiry') as string,
      usageLimit: formData.get('usageLimit') ? Number(formData.get('usageLimit')) : null,
      active: formData.get('isActive') === 'on',
      isActive: formData.get('isActive') === 'on',
    };

    const token = localStorage.getItem('adminToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      if (editingDiscount) {
        const res = await fetch(`/api/discounts/${editingDiscount.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showToast('Discount updated successfully');
          loadDiscounts();
        }
      } else {
        const res = await fetch('/api/discounts', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showToast('Discount created successfully');
          loadDiscounts();
        }
      }
    } catch {
      showToast('Error saving discount');
    }
    
    setIsModalOpen(false);
    setEditingDiscount(null);
  };

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Discounts</h1>
            <p className="text-[#a3a3a3] text-sm mt-1">Manage promotional discount codes and coupons.</p>
          </div>
          <button 
            onClick={() => { setEditingDiscount(null); setIsModalOpen(true); }}
            className="bg-[#d2f000] text-black font-medium px-4 py-2 rounded-lg hover:bg-[#b8d400] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Discount
          </button>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#262626] flex gap-4">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#737373] text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Search discounts..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg pl-10 pr-3 py-2 text-white focus:border-[#d2f000] outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#1a1a1a] text-[#737373] text-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">Code</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Min Order</th>
                  <th className="px-6 py-3 font-medium">Usage</th>
                  <th className="px-6 py-3 font-medium">Expiry</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626] text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[#737373]">
                      <div className="w-6 h-6 border-2 border-electric-lime border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p>Loading discounts...</p>
                    </td>
                  </tr>
                ) : filteredDiscounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[#737373]">
                      <span className="material-symbols-outlined text-4xl mb-2">sell</span>
                      <p>No discounts found.</p>
                    </td>
                  </tr>
                ) : (
                  filteredDiscounts.map(discount => (
                    <tr key={discount.id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{discount.code}</span>
                          <button onClick={() => handleCopy(discount.code)} className="text-[#737373] hover:text-white" title="Copy code">
                            <span className="material-symbols-outlined text-[16px]">content_copy</span>
                          </button>
                        </div>
                        <div className="text-[#a3a3a3] text-xs mt-1">
                          {discount.type === 'Free Shipping' ? 'Free Shipping' : `${discount.type === 'Percentage' ? discount.value + '%' : '₹' + discount.value} Off`}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[#a3a3a3]">{discount.type}</td>
                      <td className="px-6 py-4 text-[#a3a3a3]">₹{discount.minOrder}</td>
                      <td className="px-6 py-4 text-[#a3a3a3]">
                        {discount.usageCount} {discount.usageLimit ? `/ ${discount.usageLimit}` : 'used'}
                      </td>
                      <td className="px-6 py-4 text-[#a3a3a3]">{discount.expiry}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          discount.isActive 
                            ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          {discount.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => handleToggleStatus(discount.id)}
                            className="text-[#737373] hover:text-white"
                            title={discount.isActive ? 'Disable' : 'Enable'}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {discount.isActive ? 'block' : 'check_circle'}
                            </span>
                          </button>
                          <button 
                            onClick={() => { setEditingDiscount(discount); setIsModalOpen(true); }}
                            className="text-[#737373] hover:text-white"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button 
                            onClick={() => { setDiscountToDelete(discount.id); setIsDeleteModalOpen(true); }}
                            className="text-[#737373] hover:text-red-500"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-[#262626] flex justify-between items-center">
              <h2 className="text-lg font-bold">{editingDiscount ? 'Edit Discount' : 'Create Discount'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#737373] hover:text-white">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSaveDiscount} className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-[#a3a3a3] mb-1">Discount Code</label>
                <input 
                  name="code"
                  type="text" 
                  defaultValue={editingDiscount?.code}
                  required
                  className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white font-mono focus:border-[#d2f000] outline-none uppercase"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#a3a3a3] mb-1">Type</label>
                  <select 
                    name="type"
                    defaultValue={editingDiscount?.type || 'Percentage'}
                    className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                  >
                    <option value="Percentage">Percentage</option>
                    <option value="Flat">Flat Amount</option>
                    <option value="Free Shipping">Free Shipping</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#a3a3a3] mb-1">Value</label>
                  <input 
                    name="value"
                    type="number" 
                    defaultValue={editingDiscount?.value}
                    className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#a3a3a3] mb-1">Min Order Amount</label>
                  <input 
                    name="minOrder"
                    type="number" 
                    defaultValue={editingDiscount?.minOrder}
                    required
                    className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#a3a3a3] mb-1">Usage Limit (optional)</label>
                  <input 
                    name="usageLimit"
                    type="number" 
                    defaultValue={editingDiscount?.usageLimit || ''}
                    className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#a3a3a3] mb-1">Expiry Date</label>
                <input 
                  name="expiry"
                  type="date" 
                  defaultValue={editingDiscount?.expiry}
                  required
                  className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  name="isActive"
                  id="isActive"
                  defaultChecked={editingDiscount ? editingDiscount.isActive : true}
                  className="accent-[#d2f000] w-4 h-4"
                />
                <label htmlFor="isActive" className="text-sm text-white">Active</label>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="border border-[#262626] text-white px-4 py-2 rounded-lg hover:bg-[#1a1a1a]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-[#d2f000] text-black font-medium px-4 py-2 rounded-lg hover:bg-[#b8d400]"
                >
                  Save Discount
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-sm p-6 text-center">
            <span className="material-symbols-outlined text-red-500 text-4xl mb-4">warning</span>
            <h3 className="text-lg font-bold text-white mb-2">Delete Discount</h3>
            <p className="text-[#a3a3a3] text-sm mb-6">Are you sure you want to delete this discount? This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="border border-[#262626] text-white px-4 py-2 rounded-lg hover:bg-[#1a1a1a] flex-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="bg-red-500 text-white font-medium px-4 py-2 rounded-lg hover:bg-red-600 flex-1"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-[#1a1a1a] border border-[#262626] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in z-50">
          <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}
    </div>
  );
}
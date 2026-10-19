/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { resolveImageUrl } from '@/lib/utils';
import { compressImageFile } from '@/lib/image-compression';
import { BadgeTagSelector } from '@/components/admin/BadgeTagSelector';
import { adminFetch } from '@/lib/admin-fetch';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function EditProductClient({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    categoryId: 'tees',
    tags: '',
    price: '',
    compareAtPrice: '',
    freeShipping: false,
    deliveryChargeEnabled: false,
    deliveryFee: '',
    images: [] as string[],
    newImageUrl: '',
    badges: [] as string[],
    isActive: true,
  });

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [existingProductName, setExistingProductName] = useState<string | null>(null);

  const [sizesList, setSizesList] = useState<Array<{ name: string; active: boolean; stock: number }>>([
    { name: 'XS', active: false, stock: 0 },
    { name: 'S', active: true, stock: 10 },
    { name: 'M', active: true, stock: 15 },
    { name: 'L', active: true, stock: 15 },
    { name: 'XL', active: true, stock: 10 },
    { name: 'XXL', active: false, stock: 0 },
  ]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string; isError?: boolean }>({ show: false, msg: '' });
  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = (msg: string, isError = false) => {
    setToast({ show: true, msg, isError });
    setTimeout(() => setToast({ show: false, msg: '' }), 3500);
  };

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminFetch(`/api/products/${productId}?includeHidden=true`);
      if (!res.ok) {
        showNotification('Failed to fetch product details from database', true);
        return;
      }
      const json = await res.json();
      if (json.success && json.data) {
        const p = json.data;
        let parsedSizeStock: Record<string, number> = {};
        if (p.sizeStock) {
          try {
            parsedSizeStock = typeof p.sizeStock === 'string' ? JSON.parse(p.sizeStock) : p.sizeStock;
          } catch {
            parsedSizeStock = {};
          }
        }

        const totalStock = Number(p.stock) || 0;
        const currentSizes = Array.isArray(p.sizes) ? p.sizes : ['S', 'M', 'L', 'XL', 'XXL'];
        const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

        const hasExactMap = Object.keys(parsedSizeStock).length > 0;

        const calculatedList = standardSizes.map((sz) => {
          if (hasExactMap) {
            const stockVal = typeof parsedSizeStock[sz] === 'number' ? parsedSizeStock[sz] : 0;
            const isActive = currentSizes.includes(sz) || stockVal > 0;
            return {
              name: sz,
              active: isActive,
              stock: stockVal,
            };
          }

          const isActive = currentSizes.includes(sz);
          const perSizeStock = isActive ? (totalStock > 0 ? Math.max(1, Math.floor(totalStock / Math.max(1, currentSizes.length))) : 0) : 0;
          return {
            name: sz,
            active: isActive,
            stock: perSizeStock,
          };
        });

        if (!hasExactMap && totalStock > 0 && currentSizes.length > 0) {
          const firstActive = calculatedList.find(s => s.active);
          if (firstActive) {
            const currentSum = calculatedList.filter(s => s.active).reduce((sum, s) => sum + s.stock, 0);
            firstActive.stock += (totalStock - currentSum);
          }
        }

        const isDocActive = p.isActive !== false && !(Array.isArray(p.badges) && (p.badges.includes('HIDDEN') || p.badges.includes('DISABLED')));

        setSizesList(calculatedList);
        setFormData({
          name: p.name || '',
          slug: p.slug || '',
          description: p.description || '',
          categoryId: p.categoryId || 'tees',
          tags: Array.isArray(p.badges) ? p.badges.join(', ') : '',
          price: p.price ? String(p.price) : '',
          compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : '',
          freeShipping: Boolean(p.freeShipping),
          deliveryChargeEnabled: Boolean(p.deliveryChargeEnabled),
          deliveryFee: typeof p.deliveryFee === 'number' && p.deliveryFee > 0 ? String(p.deliveryFee) : '',
          images: Array.isArray(p.images) ? p.images : [],
          newImageUrl: '',
          badges: Array.isArray(p.badges) ? p.badges : [],
          isActive: isDocActive,
        });
      } else {
        showNotification(json.error || 'Product not found', true);
      }
    } catch {
      showNotification('Error loading product details', true);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    setTimeout(() => loadProduct(), 0);
  }, [loadProduct]);

  // Handle Name Change (slug is strictly generated from product name)
  const handleNameChange = (newName: string) => {
    setFormData(prev => ({
      ...prev,
      name: newName,
      slug: slugify(newName),
    }));
  };

  // Real-time slug availability check (excluding this product's own ID)
  useEffect(() => {
    if (!formData.slug.trim()) {
      let cancelled = false;
      setTimeout(() => {
        if (!cancelled) {
          setSlugStatus('idle');
          setExistingProductName(null);
        }
      }, 0);
      return () => { cancelled = true; };
    }

    setTimeout(() => setSlugStatus('checking'), 0);
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);

    checkTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await adminFetch(
          `/api/products/check/slug?slug=${encodeURIComponent(formData.slug)}&excludeId=${encodeURIComponent(productId)}`
        );
        const json = await res.json();
        if (json.success) {
          if (json.available) {
            setSlugStatus('available');
            setExistingProductName(null);
          } else {
            setSlugStatus('taken');
            setExistingProductName(json.existingProduct?.name || 'another product');
          }
        } else {
          setSlugStatus('idle');
        }
      } catch {
        setSlugStatus('idle');
      }
    }, 350);

    return () => {
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    };
  }, [formData.slug, productId]);

  const handleStockChange = (sizeName: string, value: string) => {
    const val = Math.max(0, parseInt(value, 10) || 0);
    setSizesList(prev => prev.map(s => s.name === sizeName ? { ...s, stock: val, active: val > 0 ? true : s.active } : s));
  };

  const toggleSize = (sizeName: string) => {
    setSizesList(prev => prev.map(s => {
      if (s.name === sizeName) {
        const nextActive = !s.active;
        return { ...s, active: nextActive, stock: nextActive ? (s.stock > 0 ? s.stock : 10) : 0 };
      }
      return s;
    }));
  };

  const handleAddImage = () => {
    if (!formData.newImageUrl.trim()) {
      fileInputRef.current?.click();
      return;
    }
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, prev.newImageUrl.trim()],
      newImageUrl: '',
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // Compress image client-side to save bandwidth and storage
        const optimizedFile = await compressImageFile(file, { maxWidth: 1800, maxHeight: 1800, quality: 0.84 });
        const uploadFormData = new FormData();
        uploadFormData.append('file', optimizedFile);
        const res = await adminFetch('/api/media/upload', {
          method: 'POST',
          body: uploadFormData,
        });
        const data = await res.json();
        if (data.success && data.data?.id) {
          return data.data.id;
        } else {
          console.error('File upload API error:', data);
          showNotification(data.error || 'Failed to upload image', true);
          return null;
        }
      });

      const uploadedIds = (await Promise.all(uploadPromises)).filter(Boolean);
      if (uploadedIds.length > 0) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, ...uploadedIds as string[]]
        }));
        showNotification(`Successfully uploaded ${uploadedIds.length} image(s)!`);
      }
    } catch (err) {
      console.error('Upload failed', err);
      showNotification('Failed to upload image. Please try again.', true);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slugStatus === 'taken') {
      showNotification(`A product named "${existingProductName}" already uses this URL slug!`, true);
      return;
    }

    setIsSaving(true);
    try {
      const selectedSizes = sizesList.filter(s => s.active).map(s => s.name);
      const totalStock = sizesList.filter(s => s.active).reduce((sum, s) => sum + s.stock, 0);

      const sizeStockMap: Record<string, number> = {};
      sizesList.forEach(s => {
        if (s.active) {
          sizeStockMap[s.name] = s.stock;
        }
      });

      const payload = {
        name: formData.name,
        slug: formData.slug || slugify(formData.name),
        description: formData.description,
        categoryId: formData.categoryId,
        price: Number(formData.price) || 699,
        compareAtPrice: formData.compareAtPrice ? Number(formData.compareAtPrice) : null,
        sizes: selectedSizes.length > 0 ? selectedSizes : ['M', 'L'],
        stock: totalStock,
        sizeStock: JSON.stringify(sizeStockMap),
        badges: formData.badges,
        isActive: formData.isActive,
        freeShipping: formData.freeShipping,
        deliveryChargeEnabled: formData.deliveryChargeEnabled,
        deliveryFee: formData.deliveryChargeEnabled && formData.deliveryFee ? Number(formData.deliveryFee) : 0,
        images: formData.images.length > 0 ? formData.images : ['/stock/superstar-mockup1.webp'],
      };

      const res = await adminFetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showNotification('✨ Product updated successfully in database!');
        setTimeout(() => router.push('/admin/products'), 1200);
      } else {
        showNotification(json.error || 'Failed to update product', true);
      }
    } catch {
      showNotification('An error occurred while saving', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteModal(false);
    try {
      const res = await adminFetch(`/api/products/${productId}`, { method: 'DELETE' });
      const json = await res.json();
      if (res.ok && json.success) {
        showNotification('Product deleted from database');
        setTimeout(() => router.push('/admin/products'), 1200);
      } else {
        showNotification(json.error || 'Failed to delete product', true);
      }
    } catch {
      showNotification('Error deleting product', true);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#0a0a0a] min-h-screen p-6 text-white flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-electric-lime border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-mono text-sm">Fetching product details from database...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen p-6 text-white">
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-2">Delete Product</h3>
            <p className="text-sm text-[#737373] mb-6">
              Are you sure you want to delete <span className="text-white font-bold">{formData.name}</span> from the database? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-[#262626] text-white rounded-lg text-sm hover:bg-[#333] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-500 transition-colors"
              >
                Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/products" className="p-2 bg-[#141414] border border-[#262626] rounded-lg hover:border-[#d2f000] transition-colors">
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Edit Product</h1>
              <p className="text-xs text-[#737373] font-mono">ID: {productId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600/10 text-red-500 border border-red-500/20 rounded-lg text-sm font-bold hover:bg-red-600/20 transition-colors"
          >
            Delete Product
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Visibility & 404 Status Card */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase text-white">Storefront Visibility &amp; 404 Status</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                    formData.isActive 
                      ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {formData.isActive ? 'LIVE ON STORE' : 'HIDDEN (404 NOT FOUND)'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  {formData.isActive 
                    ? 'Product is currently active, searchable, and visible to all customers.' 
                    : `⚠️ Product is hidden. Anyone visiting /product/${formData.slug || 'slug'} will receive a 404 Not Found error.`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, isActive: !p.isActive }))}
                className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider border flex items-center gap-2 transition-all ${
                  formData.isActive
                    ? 'bg-green-500/20 text-green-300 border-green-500/40 hover:bg-green-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {formData.isActive ? 'visibility' : 'visibility_off'}
                </span>
                <span>{formData.isActive ? 'ACTIVE (SHOW)' : 'HIDDEN (404)'}</span>
              </button>
            </div>
          </div>

          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-4">
            {/* Product Name */}
            <div>
              <label className="block text-xs font-medium text-[#737373] mb-1">Product Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2 text-white focus:border-[#d2f000] outline-none"
                required
              />
            </div>

            {/* URL Slug strictly derived from Product Name */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-[#737373] uppercase tracking-wider">
                  Product URL Slug (Strictly Derived from Name)
                </label>
              </div>

              <div className="relative">
                <div className="flex items-center bg-[#1a1a1a] border border-[#262626] rounded-lg">
                  <span className="pl-3 text-xs text-electric-lime font-mono select-none">/product/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    readOnly
                    className="w-full bg-transparent px-2 py-2 text-xs font-mono outline-none cursor-default text-gray-200"
                    placeholder="e.g. superstar-mahesh-babu-tee"
                    required
                  />
                  {slugStatus === 'checking' && (
                    <div className="pr-3">
                      <div className="w-4 h-4 border-2 border-electric-lime border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  {slugStatus === 'available' && (
                    <div className="pr-3 text-green-400 flex items-center gap-1" title="URL slug is valid & available">
                      <span className="material-symbols-outlined text-base">check_circle</span>
                    </div>
                  )}
                  {slugStatus === 'taken' && (
                    <div className="pr-3 text-red-500 flex items-center gap-1" title="URL slug is already taken">
                      <span className="material-symbols-outlined text-base">cancel</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Notice */}
              {formData.slug.trim() && (
                <div className="mt-1.5 text-xs font-mono">
                  {slugStatus === 'checking' && (
                    <span className="text-gray-400">⏳ Verifying slug uniqueness...</span>
                  )}
                  {slugStatus === 'available' && (
                    <span className="text-green-400 flex items-center gap-1">
                      ✓ URL slug is unique and ready
                    </span>
                  )}
                  {slugStatus === 'taken' && (
                    <div className="p-2.5 rounded bg-red-950/40 border border-red-500/40 text-red-400 flex flex-col gap-0.5">
                      <span className="font-bold flex items-center gap-1">
                        ⚠️ URL slug already used by another product!
                      </span>
                      <span className="text-[11px] text-gray-300">
                        Product <strong className="text-white font-bold">&quot;{existingProductName}&quot;</strong> already uses this URL. Please choose a different name or slug.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[#737373] mb-1">Description</label>
              <textarea
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg p-4 text-white focus:border-[#d2f000] outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#737373] mb-1">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData(p => ({ ...p, categoryId: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2 text-white focus:border-[#d2f000] outline-none"
              >
                <option value="tees">T-Shirts</option>
                <option value="outerwear">Hoodies & Outerwear</option>
                <option value="bottoms">Cargo Pants & Bottoms</option>
                <option value="headwear">Caps & Headwear</option>
              </select>
            </div>

            {/* Interactive Recommended Badges & Tags Selector */}
            <div className="pt-2">
              <BadgeTagSelector
                selectedBadges={formData.badges}
                onChange={(newBadges) => setFormData(p => ({ ...p, badges: newBadges, tags: newBadges.join(', ') }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-[#737373] mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2 text-white focus:border-[#d2f000] outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#737373] mb-1">Compare-at Price (₹)</label>
                <input
                  type="number"
                  value={formData.compareAtPrice}
                  onChange={(e) => setFormData(p => ({ ...p, compareAtPrice: e.target.value }))}
                  placeholder="Optional original price"
                  className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2 text-white focus:border-[#d2f000] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Delivery & Shipping Charges */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase text-white flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-electric-lime text-base">local_shipping</span>
                  Delivery &amp; Shipping Charges
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                  Customize free shipping or specific delivery fee for this product.
                </p>
              </div>
            </div>

            {/* Mode selection */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-[#a3a3a3] uppercase">Delivery Setting</label>
              <div className="grid grid-cols-3 gap-2 bg-[#1a1a1a] p-1.5 rounded-lg border border-[#262626]">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(p => ({
                      ...p,
                      freeShipping: false,
                      deliveryChargeEnabled: false,
                      deliveryFee: '',
                    }));
                  }}
                  className={`py-2 px-3 rounded text-xs font-mono font-bold uppercase transition-all ${
                    !formData.freeShipping && !formData.deliveryChargeEnabled
                      ? 'bg-[#262626] text-white border border-gray-600'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Default
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(p => ({
                      ...p,
                      freeShipping: true,
                      deliveryChargeEnabled: false,
                      deliveryFee: '0',
                    }));
                  }}
                  className={`py-2 px-3 rounded text-xs font-mono font-bold uppercase transition-all ${
                    formData.freeShipping
                      ? 'bg-electric-lime text-black border border-electric-lime'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Free Delivery
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData(p => ({
                      ...p,
                      freeShipping: false,
                      deliveryChargeEnabled: true,
                      deliveryFee: p.deliveryFee || '49',
                    }));
                  }}
                  className={`py-2 px-3 rounded text-xs font-mono font-bold uppercase transition-all ${
                    formData.deliveryChargeEnabled
                      ? 'bg-purple-600 text-white border border-purple-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Custom Fee
                </button>
              </div>
            </div>

            {/* Custom Fee Input */}
            {formData.deliveryChargeEnabled && (
              <div className="space-y-2 pt-2 border-t border-[#262626]">
                <label className="block text-xs text-[#a3a3a3] font-mono">Custom Delivery Fee (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={formData.deliveryFee}
                    onChange={(e) => setFormData(p => ({ ...p, deliveryFee: e.target.value }))}
                    placeholder="49"
                    className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg pl-8 pr-3 py-2 text-white font-mono text-sm focus:border-electric-lime outline-none"
                  />
                </div>
                <p className="text-xs text-purple-300 font-mono">
                  📦 This product will charge ₹{formData.deliveryFee || '0'} for shipping.
                </p>
              </div>
            )}

            {formData.freeShipping && (
              <div className="p-3 bg-electric-lime/10 border border-electric-lime/30 rounded-lg text-xs text-electric-lime font-mono">
                ✓ Free Delivery enabled. Customers will see a &quot;FREE DELIVERY&quot; badge on storefront and won&apos;t be charged shipping for this item.
              </div>
            )}

            {!formData.freeShipping && !formData.deliveryChargeEnabled && (
              <p className="text-xs text-gray-400 font-mono">
                Uses standard store shipping policy (Free above ₹999, otherwise standard shipping fee).
              </p>
            )}
          </div>

          {/* Images Section */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
            <h3 className="text-sm font-bold uppercase text-white mb-4">Product Images</h3>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
              accept="image/*"
            />
            {formData.images.length === 0 ? (
              <div 
                className="border-2 border-dashed border-[#262626] rounded-xl p-6 text-center cursor-pointer hover:border-[#d2f000] hover:bg-[#1a1a1a] transition-all mb-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="material-symbols-outlined text-3xl text-gray-500 mb-1 block">
                  {isUploading ? 'cloud_upload' : 'add_photo_alternate'}
                </span>
                <p className="text-sm text-gray-300 font-medium mb-1">
                  {isUploading ? 'Uploading...' : 'No images added yet'}
                </p>
                <p className="text-xs text-gray-500">
                  {isUploading ? 'Please wait while images are optimized...' : 'Click here to upload files, or paste an image URL below.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative aspect-3/4 bg-[#1a1a1a] border border-[#262626] rounded-lg overflow-hidden group">
                    <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-2 right-2 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm block">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={formData.newImageUrl}
                onChange={(e) => setFormData(p => ({ ...p, newImageUrl: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddImage();
                  }
                }}
                placeholder="Image path or Appwrite ID"
                className="flex-1 bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2 text-sm text-white focus:border-[#d2f000] outline-none"
              />
              <button
                type="button"
                onClick={handleAddImage}
                disabled={isUploading}
                className="px-4 py-2 bg-[#262626] text-white rounded-lg text-sm font-bold hover:bg-electric-lime hover:text-black transition-colors disabled:opacity-50"
              >
                {formData.newImageUrl.trim() ? 'Add URL' : 'Upload File'}
              </button>
            </div>
          </div>

          {/* Size & Inventory Grid */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold uppercase text-white">Size & Stock Quantities</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">
                  Toggle which sizes are available and set individual inventory count.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-[#1a1a1a] border border-[#262626] px-3 py-1.5 rounded-lg text-electric-lime font-bold">
                  Total Stock: {sizesList.filter(s => s.active).reduce((sum, s) => sum + s.stock, 0)} units
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {sizesList.map((sizeItem) => (
                <div
                  key={sizeItem.name}
                  className={`border p-3 rounded-lg text-center transition-all ${
                    sizeItem.active
                      ? 'bg-[#1a1a1a] border-[#d2f000]/60'
                      : 'bg-[#111] border-[#262626] opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold font-mono text-white">{sizeItem.name}</span>
                    <button
                      type="button"
                      onClick={() => toggleSize(sizeItem.name)}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase transition-colors ${
                        sizeItem.active ? 'bg-[#d2f000] text-black' : 'bg-[#262626] text-gray-400 hover:text-white'
                      }`}
                    >
                      {sizeItem.active ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    disabled={!sizeItem.active}
                    value={sizeItem.stock}
                    onChange={(e) => handleStockChange(sizeItem.name, e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-[#262626] text-center text-sm rounded py-1 text-white focus:border-[#d2f000] outline-none disabled:bg-[#151515] disabled:text-gray-600 font-mono"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Link href="/admin/products" className="px-6 py-3 bg-[#1a1a1a] border border-[#262626] text-white rounded-lg font-bold hover:bg-[#262626] transition-colors">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSaving || slugStatus === 'taken'}
              className="px-6 py-3 bg-[#d2f000] text-black font-bold rounded-lg hover:bg-white transition-colors uppercase tracking-wider font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

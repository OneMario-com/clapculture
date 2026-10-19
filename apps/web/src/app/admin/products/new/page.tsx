/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { resolveImageUrl } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { BadgeTagSelector } from '@/components/admin/BadgeTagSelector';
import { compressImageFile } from '@/lib/image-compression';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function AddProductPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string; isError?: boolean }>({ show: false, msg: '' });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [existingProductName, setExistingProductName] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [categoryId, setCategoryId] = useState('tees');
  const [badges, setBadges] = useState<string[]>(['NEW DROP', '320 GSM']);
  const [isActive, setIsActive] = useState(true);
  const [freeShipping, setFreeShipping] = useState(false);
  const [deliveryChargeEnabled, setDeliveryChargeEnabled] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sizes, setSizes] = useState([
    { name: 'XS', active: false, stock: 0 },
    { name: 'S', active: true, stock: 10 },
    { name: 'M', active: true, stock: 15 },
    { name: 'L', active: true, stock: 15 },
    { name: 'XL', active: true, stock: 10 },
    { name: 'XXL', active: false, stock: 0 }
  ]);

  const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-generate slug strictly from name
  const handleNameChange = (newName: string) => {
    setName(newName);
    setSlug(slugify(newName));
  };

  // Check slug availability in real time
  useEffect(() => {
    if (!slug.trim()) {
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
        const token = localStorage.getItem('adminToken');
        const res = await fetch(`/api/products/check/slug?slug=${encodeURIComponent(slug)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json();
        if (json.success) {
          if (json.available) {
            setSlugStatus('available');
            setExistingProductName(null);
          } else {
            setSlugStatus('taken');
            setExistingProductName(json.existingProduct?.name || 'an existing product');
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
  }, [slug]);

  const showNotification = (msg: string, isError = false) => {
    setToast({ show: true, msg, isError });
    setTimeout(() => setToast({ show: false, msg: '' }), 3500);
  };

  const updateSizeStock = (index: number, stock: string) => {
    const num = Math.max(0, parseInt(stock, 10) || 0);
    setSizes(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], stock: num, active: num > 0 ? true : copy[index].active };
      return copy;
    });
  };

  const toggleSize = (index: number) => {
    setSizes(prev => {
      const copy = [...prev];
      const nextActive = !copy[index].active;
      copy[index] = { ...copy[index], active: nextActive, stock: nextActive ? (copy[index].stock > 0 ? copy[index].stock : 10) : 0 };
      return copy;
    });
  };

  const handleAddImage = () => {
    if (!newImageUrl.trim()) {
      // If empty, fallback to opening file picker
      fileInputRef.current?.click();
      return;
    }
    setImages(prev => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token');

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const optimizedFile = await compressImageFile(file, { maxWidth: 1800, maxHeight: 1800, quality: 0.84 });
        const formData = new FormData();
        formData.append('file', optimizedFile);
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
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
        setImages(prev => [...prev, ...uploadedIds as string[]]);
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
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showNotification('Product name is required', true);
      return;
    }
    if (!slug.trim()) {
      showNotification('Product URL slug is required', true);
      return;
    }
    if (slugStatus === 'taken') {
      showNotification(`A product named "${existingProductName}" with this URL slug already exists!`, true);
      return;
    }
    if (!price || Number(price) <= 0) {
      showNotification('Valid price is required', true);
      return;
    }
    if (images.length === 0) {
      showNotification('Please add at least one product image before publishing', true);
      return;
    }

    setIsSubmitting(true);
    try {
      const totalStock = sizes.filter(s => s.active).reduce((sum, s) => sum + s.stock, 0);
      const activeSizes = sizes.filter(s => s.active).map(s => s.name);
      
      const sizeStockMap: Record<string, number> = {};
      sizes.forEach(s => {
        if (s.active) {
          sizeStockMap[s.name] = s.stock;
        }
      });

      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const payload = {
        name,
        slug,
        description,
        categoryId,
        price: Number(price),
        compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
        sizes: activeSizes.length > 0 ? activeSizes : ['M', 'L'],
        stock: totalStock,
        sizeStock: JSON.stringify(sizeStockMap),
        badges: badges.length > 0 ? badges : ['NEW DROP', '320 GSM'],
        isActive,
        freeShipping,
        deliveryChargeEnabled,
        deliveryFee: deliveryChargeEnabled && deliveryFee ? Number(deliveryFee) : 0,
        images: images,
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showNotification('✨ Product published successfully to Appwrite database!');
        setTimeout(() => router.push('/admin/products'), 1200);
      } else {
        showNotification(json.error || 'Failed to publish product', true);
      }
    } catch {
      showNotification('Error creating product in database', true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12">
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

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/admin/products" className="text-[#a3a3a3] hover:text-white transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Add New Product</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/products" className="px-4 py-2 border border-[#262626] text-white rounded-lg hover:bg-[#1a1a1a] transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || slugStatus === 'taken'}
            className="px-6 py-2 bg-[#d2f000] text-black rounded-lg font-bold hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Publishing...' : 'Publish Product'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Visibility & 404 Status Card */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold uppercase text-white">Storefront Visibility &amp; 404 Status</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase border ${
                    isActive 
                      ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {isActive ? 'LIVE ON STORE' : 'HIDDEN (404 NOT FOUND)'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 font-mono">
                  {isActive 
                    ? 'Product will be immediately published, searchable, and visible on storefront.' 
                    : `⚠️ Product will be hidden. Visiting /product/${slug || 'slug'} will return a 404 Not Found error.`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsActive(p => !p)}
                className={`px-4 py-2 rounded-lg font-mono text-xs font-bold uppercase tracking-wider border flex items-center gap-2 transition-all ${
                  isActive
                    ? 'bg-green-500/20 text-green-300 border-green-500/40 hover:bg-green-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {isActive ? 'visibility' : 'visibility_off'}
                </span>
                <span>{isActive ? 'ACTIVE (SHOW)' : 'HIDDEN (404)'}</span>
              </button>
            </div>
          </div>

          {/* Basic Info */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
            <h3 className="text-white font-medium">Basic Information</h3>
            
            {/* Product Name Input */}
            <div>
              <label className="block text-sm text-[#a3a3a3] mb-1">Product Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                placeholder="e.g. SUPERSTAR MAHESH BABU OVERSIZED TEE"
                required
              />
            </div>

            {/* Auto-generated URL Slug strictly derived from Product Name */}
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
                    value={slug}
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
                    <div className="pr-3 text-green-400 flex items-center gap-1" title="URL slug is available">
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

              {/* Slug Availability Status Message */}
              {slug.trim() && (
                <div className="mt-1.5 text-xs font-mono">
                  {slugStatus === 'checking' && (
                    <span className="text-gray-400">⏳ Checking slug availability...</span>
                  )}
                  {slugStatus === 'available' && (
                    <span className="text-green-400 flex items-center gap-1">
                      ✓ URL slug is available for new product
                    </span>
                  )}
                  {slugStatus === 'taken' && (
                    <div className="p-2.5 rounded bg-red-950/40 border border-red-500/40 text-red-400 flex flex-col gap-0.5">
                      <span className="font-bold flex items-center gap-1">
                        ⚠️ Same product name / URL slug already exists!
                      </span>
                      <span className="text-[11px] text-gray-300">
                        This slug is currently used by <strong className="text-white font-bold">&quot;{existingProductName}&quot;</strong>. Please tweak the name or slug.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm text-[#a3a3a3] mb-1">Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none text-sm"
                placeholder="320 GSM French Terry heavyweight bio-washed cotton streetwear tee..."
              />
            </div>
          </div>

          {/* Media */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-medium">Product Images</h3>
              <span className="text-xs text-gray-500 font-mono">({images.length} added)</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
              accept="image/*"
            />
            {images.length === 0 ? (
              <div 
                className="border-2 border-dashed border-[#262626] rounded-xl p-6 text-center cursor-pointer hover:border-[#d2f000] hover:bg-[#1a1a1a] transition-all"
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-3/4 bg-[#1a1a1a] border border-[#262626] rounded-lg overflow-hidden group">

                    <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full transition-colors"
                      title="Remove image"
                    >
                      <span className="material-symbols-outlined text-xs block">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddImage();
                  }
                }}
                placeholder="Enter image URL or Appwrite ID"
                className="flex-1 bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:border-[#d2f000] outline-none"
              />
              <button
                type="button"
                onClick={handleAddImage}
                disabled={isUploading}
                className="px-4 py-2 bg-[#262626] text-white rounded-lg text-sm font-bold hover:bg-[#d2f000] hover:text-black transition-colors disabled:opacity-50"
              >
                {newImageUrl.trim() ? 'Add URL' : 'Upload File'}
              </button>
            </div>
          </div>

          {/* Variants */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h3 className="text-white font-medium">Sizes & Inventory Quantities</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">Toggle sizes ON/OFF and set stock per size.</p>
              </div>
              <span className="text-xs font-mono bg-[#1a1a1a] border border-[#262626] px-3 py-1.5 rounded text-[#d2f000] font-bold">
                Total: {sizes.filter(s => s.active).reduce((sum, s) => sum + s.stock, 0)} units
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sizes.map((size, idx) => (
                <div 
                  key={size.name} 
                  className={`border p-2.5 rounded-lg flex items-center gap-2 transition-all ${
                    size.active ? 'bg-[#1a1a1a] border-[#d2f000]/60' : 'bg-[#111] border-[#262626] opacity-60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleSize(idx)}
                    className={`w-10 h-10 shrink-0 flex flex-col items-center justify-center rounded font-mono font-bold text-xs transition-colors ${
                      size.active ? 'bg-[#d2f000] text-black' : 'bg-[#262626] text-gray-400'
                    }`}
                  >
                    <span>{size.name}</span>
                    <span className="text-[8px] font-bold uppercase leading-none">{size.active ? 'ON' : 'OFF'}</span>
                  </button>
                  <input 
                    type="number"
                    min="0"
                    disabled={!size.active}
                    value={size.stock}
                    onChange={(e) => updateSizeStock(idx, e.target.value)}
                    className="w-full bg-[#0d0d0d] border border-[#262626] rounded h-10 px-3 text-white focus:border-[#d2f000] outline-none disabled:bg-[#151515] disabled:text-gray-600 font-mono text-sm"
                    placeholder="Stock"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Pricing */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
            <h3 className="text-white font-medium">Pricing</h3>
            <div>
              <label className="block text-sm text-[#a3a3a3] mb-1">Price (₹)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="699"
                required
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-[#a3a3a3] mb-1">Compare-at Price (₹)</label>
              <input
                type="number"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                placeholder="1299"
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
              />
            </div>
          </div>

          {/* Organization */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
            <h3 className="text-white font-medium">Organization</h3>
            <div>
              <label className="block text-sm text-[#a3a3a3] mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
              >
                <option value="tees">T-Shirts</option>
                <option value="outerwear">Hoodies & Fleece</option>
                <option value="bottoms">Cargo Pants</option>
                <option value="headwear">Caps & Headwear</option>
              </select>
            </div>

            <div className="pt-2">
              <BadgeTagSelector
                selectedBadges={badges}
                onChange={(newBadges) => setBadges(newBadges)}
              />
            </div>
          </div>

          {/* Delivery & Shipping Charges */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium flex items-center gap-1.5 text-sm">
                <span className="material-symbols-outlined text-electric-lime text-base">local_shipping</span>
                Delivery Charges
              </h3>
            </div>

            {/* Mode selection */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-[#a3a3a3] uppercase">Delivery Setting</label>
              <div className="grid grid-cols-3 gap-1.5 bg-[#1a1a1a] p-1 rounded-lg border border-[#262626]">
                <button
                  type="button"
                  onClick={() => {
                    setFreeShipping(false);
                    setDeliveryChargeEnabled(false);
                    setDeliveryFee('');
                  }}
                  className={`py-2 px-2 rounded text-[11px] font-mono font-bold uppercase transition-all ${
                    !freeShipping && !deliveryChargeEnabled
                      ? 'bg-[#262626] text-white border border-gray-600'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Default
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFreeShipping(true);
                    setDeliveryChargeEnabled(false);
                    setDeliveryFee('0');
                  }}
                  className={`py-2 px-2 rounded text-[11px] font-mono font-bold uppercase transition-all ${
                    freeShipping
                      ? 'bg-electric-lime text-black border border-electric-lime'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Free Delivery
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFreeShipping(false);
                    setDeliveryChargeEnabled(true);
                    if (!deliveryFee) setDeliveryFee('49');
                  }}
                  className={`py-2 px-2 rounded text-[11px] font-mono font-bold uppercase transition-all ${
                    deliveryChargeEnabled
                      ? 'bg-purple-600 text-white border border-purple-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Custom Fee
                </button>
              </div>
            </div>

            {/* Custom Fee Input */}
            {deliveryChargeEnabled && (
              <div className="space-y-1.5 pt-2 border-t border-[#262626]">
                <label className="block text-xs text-[#a3a3a3] font-mono">Custom Delivery Fee (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    placeholder="49"
                    className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg pl-8 pr-3 py-2 text-white font-mono text-sm focus:border-electric-lime outline-none"
                  />
                </div>
                <p className="text-[11px] text-purple-300 font-mono">
                  📦 Product will charge ₹{deliveryFee || '0'} for shipping at checkout.
                </p>
              </div>
            )}

            {freeShipping && (
              <div className="p-3 bg-electric-lime/10 border border-electric-lime/30 rounded-lg text-[11px] text-electric-lime font-mono">
                ✓ Free Delivery enabled. Customers will see a &quot;FREE DELIVERY&quot; badge and won&apos;t pay shipping for this item.
              </div>
            )}

            {!freeShipping && !deliveryChargeEnabled && (
              <p className="text-[11px] text-gray-400 font-mono">
                Uses standard store shipping policy (Free above ₹999, otherwise standard shipping).
              </p>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

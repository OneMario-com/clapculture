/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import { compressImageFile } from '@/lib/image-compression';
import { resolveImageUrl } from '@/lib/utils';

type Collection = {
  $id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  productIds?: string[] | null;
};

type ProductOption = {
  id: string;
  name: string;
  slug: string;
  image: string;
};

type ApiResponse<T> = { success?: boolean; data?: T; error?: string } | null;

type CollectionForm = {
  name: string;
  slug: string;
  description: string;
  image: string;
  productIds: string[];
};

const EMPTY_FORM: CollectionForm = { name: '', slug: '', description: '', image: '', productIds: [] };

const toSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

async function readJson<T>(res: Response): Promise<ApiResponse<T>> {
  return res.json().catch(() => null);
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<CollectionForm>(EMPTY_FORM);
  // Once the slug is edited by hand (or belongs to an existing collection) the name no longer overwrites it
  const [slugTouched, setSlugTouched] = useState(false);

  const showToast = (msg: string, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    const loadCollections = async () => {
      try {
        // no-store: the public GET is cacheable and the admin must see the current list
        const res = await adminFetch('/api/collections', { cache: 'no-store' });
        const json = await readJson<Collection[]>(res);
        if (cancelled) return;
        if (res.ok && json?.success && Array.isArray(json.data)) {
          setCollections(json.data);
        } else {
          setLoadError(json?.error || 'Failed to load collections');
        }
      } catch {
        if (!cancelled) setLoadError('Error connecting to server');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const loadProducts = async () => {
      try {
        const res = await adminFetch('/api/products?limit=500&includeHidden=true');
        const json = await readJson<Record<string, unknown>[]>(res);
        if (cancelled) return;
        if (res.ok && json?.success && Array.isArray(json.data)) {
          setProducts(
            json.data.map((p) => ({
              id: String(p.$id || ''),
              name: String(p.name || 'Untitled Product'),
              slug: String(p.slug || ''),
              image: Array.isArray(p.images) && p.images.length > 0 ? String(p.images[0]) : '',
            })).filter((p) => p.id)
          );
        } else {
          setProductsError(json?.error || 'Failed to load products');
        }
      } catch {
        if (!cancelled) setProductsError('Error connecting to server');
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };
    loadCollections();
    loadProducts();
    return () => { cancelled = true; };
  }, []);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
  }, [products, productSearch]);

  // Selected ids that are not in the loaded catalog (e.g. deleted products) are kept as they are
  const unknownSelectedCount = useMemo(() => {
    if (productsLoading || productsError) return 0;
    const known = new Set(products.map(p => p.id));
    return formData.productIds.filter(id => !known.has(id)).length;
  }, [products, productsLoading, productsError, formData.productIds]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      slug: slugTouched ? prev.slug : toSlug(name),
    }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slug = e.target.value;
    setFormData(prev => ({ ...prev, slug }));
    setSlugTouched(slug !== '');
  };

  const toggleProduct = (id: string) => {
    setFormData(prev => ({
      ...prev,
      productIds: prev.productIds.includes(id) ? prev.productIds.filter(p => p !== id) : [...prev.productIds, id],
    }));
  };

  const openAddModal = () => {
    setEditingCollection(null);
    setFormData(EMPTY_FORM);
    setSlugTouched(false);
    setFormError(null);
    setProductSearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (collection: Collection) => {
    setEditingCollection(collection);
    setFormData({
      name: collection.name || '',
      slug: collection.slug || '',
      description: collection.description || '',
      image: collection.image || '',
      productIds: Array.isArray(collection.productIds) ? collection.productIds : [],
    });
    setSlugTouched(true);
    setFormError(null);
    setProductSearch('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setIsModalOpen(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const optimizedFile = await compressImageFile(file, { maxWidth: 1800, maxHeight: 1800, quality: 0.84 });
      const body = new FormData();
      body.append('file', optimizedFile);
      const res = await adminFetch('/api/media/upload', { method: 'POST', body });
      const json = await readJson<{ url?: string }>(res);
      if (res.ok && json?.success && json.data?.url) {
        const url = json.data.url;
        setFormData(prev => ({ ...prev, image: url }));
      } else {
        showToast(json?.error || 'Image upload failed', true);
      }
    } catch {
      showToast('Image upload failed', true);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (saving) return;
    const name = formData.name.trim();
    const slug = toSlug(formData.slug) || toSlug(name);
    const description = formData.description.trim();
    const image = formData.image.trim();
    const productIds = formData.productIds;

    if (!name || !slug) {
      setFormError('Name and slug are required.');
      return;
    }
    if (collections.some(c => c.slug === slug && c.$id !== editingCollection?.$id)) {
      setFormError(`Another collection already uses the slug "${slug}".`);
      return;
    }

    // Only the live schema's fields; on edit, cleared optional fields are sent as null to clear them
    const payload = editingCollection
      ? { name, slug, description: description || null, image: image || null, productIds }
      : { name, slug, productIds, ...(description ? { description } : {}), ...(image ? { image } : {}) };

    setSaving(true);
    setFormError(null);
    try {
      const res = await adminFetch(
        editingCollection ? `/api/collections/${encodeURIComponent(editingCollection.$id)}` : '/api/collections',
        {
          method: editingCollection ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const json = await readJson<Collection>(res);
      if (!res.ok || !json?.success || !json.data?.$id) {
        setFormError(json?.error || `Failed to save collection (HTTP ${res.status})`);
        return;
      }

      // Use the write response: an immediate re-fetch may still be served the cached list
      const saved = json.data;
      setCollections(prev =>
        editingCollection ? prev.map(c => (c.$id === editingCollection.$id ? saved : c)) : [...prev, saved]
      );
      setIsModalOpen(false);
      showToast(editingCollection ? 'Collection updated successfully' : 'Collection created successfully');
    } catch {
      setFormError('Error connecting to server');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (collection: Collection, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollectionToDelete(collection);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!collectionToDelete || deleting) return;
    const target = collectionToDelete;
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/collections/${encodeURIComponent(target.$id)}`, { method: 'DELETE' });
      const json = await readJson<unknown>(res);
      if (res.ok && json?.success) {
        setCollections(prev => prev.filter(c => c.$id !== target.$id));
        setIsDeleteModalOpen(false);
        setCollectionToDelete(null);
        showToast(`Collection "${target.name}" deleted`);
      } else {
        showToast(json?.error || 'Failed to delete collection', true);
      }
    } catch {
      showToast('Failed to delete collection', true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#a3a3a3] p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Collections</h1>
          <button
            onClick={openAddModal}
            className="bg-[#d2f000] text-black font-medium px-4 py-2 rounded-lg hover:bg-[#b8d400] transition-colors flex items-center space-x-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Create Collection</span>
          </button>
        </div>

        {loading ? (
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-12 flex flex-col items-center justify-center text-center text-[#737373]">
            <div className="w-6 h-6 border-2 border-[#d2f000] border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading collections...</p>
          </div>
        ) : loadError ? (
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-4">error</span>
            <h3 className="text-lg font-medium text-white mb-2">Could not load collections</h3>
            <p className="text-[#737373]">{loadError}</p>
          </div>
        ) : collections.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {collections.map(collection => (
              <div
                key={collection.$id}
                className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden group hover:border-[#737373] transition-colors cursor-pointer flex flex-col"
                onClick={() => openEditModal(collection)}
              >
                <div className="h-32 bg-gradient-to-br from-[#1a1a1a] to-[#262626] relative">
                  {collection.image && (
                    <img
                      src={resolveImageUrl(collection.image)}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-3 right-3 flex space-x-2">
                    <button
                      onClick={(e) => confirmDelete(collection, e)}
                      className="p-1 bg-black/50 text-white rounded hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-[16px] block">delete</span>
                    </button>
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-grow">
                  <h3 className="text-white font-medium text-lg mb-1">{collection.name}</h3>
                  <p className="text-[#737373] text-xs font-mono mb-2">/{collection.slug}</p>
                  <p className="text-[#737373] text-sm mb-3 line-clamp-2 flex-grow">{collection.description}</p>
                  <div className="flex items-center text-[#a3a3a3] text-sm mt-auto">
                    <span className="material-symbols-outlined text-[16px] mr-1">inventory_2</span>
                    <span>{Array.isArray(collection.productIds) ? collection.productIds.length : 0} Products</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-12 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-4xl text-[#262626] mb-4">collections</span>
            <h3 className="text-lg font-medium text-white mb-2">No collections found</h3>
            <p className="text-[#737373] mb-4">Create your first collection to group your products.</p>
            <button
              onClick={openAddModal}
              className="bg-[#d2f000] text-black font-medium px-4 py-2 rounded-lg hover:bg-[#b8d400] transition-colors"
            >
              Create Collection
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium text-white">{editingCollection ? 'Edit Collection' : 'Create Collection'}</h3>
              <button onClick={closeModal} className="text-[#737373] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={handleNameChange}
                  className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none transition-colors"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Slug</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-[#737373] focus:border-[#d2f000] outline-none transition-colors"
                />
                <p className="text-xs text-[#737373]">Generated from the name; lowercase letters, numbers and hyphens.</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none transition-colors resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Hero Image</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({...formData, image: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 min-w-0 bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="border border-[#262626] text-white px-3 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    <span className="text-sm">{uploading ? 'Uploading...' : 'Upload'}</span>
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </div>
                {formData.image && (
                  <img
                    src={resolveImageUrl(formData.image)}
                    alt="Collection hero preview"
                    className="w-full h-32 object-cover rounded-lg border border-[#262626]"
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-white">Products</label>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-[#a3a3a3]">{formData.productIds.length} selected</span>
                    {formData.productIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, productIds: [] }))}
                        className="text-[#737373] hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2 text-[#737373] text-[18px]">search</span>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:border-[#d2f000] outline-none transition-colors"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto border border-[#262626] rounded-lg divide-y divide-[#262626]">
                  {productsLoading ? (
                    <p className="p-4 text-sm text-center text-[#737373]">Loading products...</p>
                  ) : productsError ? (
                    <p className="p-4 text-sm text-center text-red-400">{productsError}</p>
                  ) : filteredProducts.length === 0 ? (
                    <p className="p-4 text-sm text-center text-[#737373]">No products found.</p>
                  ) : (
                    filteredProducts.map(product => (
                      <label
                        key={product.id}
                        className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={formData.productIds.includes(product.id)}
                          onChange={() => toggleProduct(product.id)}
                          className="accent-[#d2f000] w-4 h-4 shrink-0"
                        />
                        {product.image ? (
                          <img src={resolveImageUrl(product.image)} alt="" className="w-8 h-8 rounded object-cover border border-[#262626] shrink-0" />
                        ) : (
                          <span className="w-8 h-8 rounded bg-[#1a1a1a] border border-[#262626] shrink-0" />
                        )}
                        <span className="min-w-0">
                          <span className="block text-sm text-white truncate">{product.name}</span>
                          <span className="block text-xs text-[#737373] font-mono truncate">{product.slug}</span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
                {unknownSelectedCount > 0 && (
                  <p className="text-xs text-amber-400">
                    {unknownSelectedCount} selected product{unknownSelectedCount === 1 ? ' is' : 's are'} no longer in the catalog and will be kept.
                  </p>
                )}
              </div>
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
                {formError}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-[#262626]">
              <button
                onClick={closeModal}
                disabled={saving}
                className="border border-[#262626] text-white px-4 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name.trim() || saving || uploading}
                className="bg-[#d2f000] text-black font-medium px-4 py-2 rounded-lg hover:bg-[#b8d400] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-md p-6 space-y-6">
            <div>
              <h3 className="text-xl font-medium text-white mb-2">Delete Collection</h3>
              <p className="text-[#a3a3a3]">
                Are you sure you want to delete {collectionToDelete ? `"${collectionToDelete.name}"` : 'this collection'}? This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
                className="border border-[#262626] text-white px-4 py-2 rounded-lg hover:bg-[#1a1a1a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-500 text-white font-medium px-4 py-2 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 bg-[#1a1a1a] border border-[#262626] text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in z-50">
          <span className={`material-symbols-outlined text-[20px] ${toast.isError ? 'text-red-500' : 'text-green-500'}`}>
            {toast.isError ? 'error' : 'check_circle'}
          </span>
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { adminFetch } from '@/lib/admin-fetch';
import { compressImageFile } from '@/lib/image-compression';
import { resolveImageUrl } from '@/lib/utils';

type Category = {
  $id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
  $createdAt?: string;
};

type ApiResponse<T> = { success?: boolean; data?: T; error?: string } | null;

const EMPTY_FORM = { name: '', slug: '', description: '', image: '' };

const toSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

async function readJson<T>(res: Response): Promise<ApiResponse<T>> {
  return res.json().catch(() => null);
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Products per category (matched on the product's categoryId); null until products load
  const [productCounts, setProductCounts] = useState<Record<string, number> | null>(null);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState(EMPTY_FORM);
  // Once the slug is edited by hand (or belongs to an existing category) the name no longer overwrites it
  const [slugTouched, setSlugTouched] = useState(false);

  const showToast = (msg: string, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // no-store: the public GET is cacheable and the admin must see the current list
        const res = await adminFetch('/api/categories', { cache: 'no-store' });
        const json = await readJson<Category[]>(res);
        if (cancelled) return;
        if (res.ok && json?.success && Array.isArray(json.data)) {
          setCategories(json.data);
        } else {
          setLoadError(json?.error || 'Failed to load categories');
        }
      } catch {
        if (!cancelled) setLoadError('Error connecting to server');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const loadProductCounts = async () => {
      try {
        const res = await adminFetch('/api/products?limit=500&includeHidden=true');
        const json = await readJson<Record<string, unknown>[]>(res);
        if (cancelled || !res.ok || !json?.success || !Array.isArray(json.data)) return;
        const counts: Record<string, number> = {};
        json.data.forEach((p) => {
          const key = String(p.categoryId || p.category || '');
          if (key) counts[key] = (counts[key] || 0) + 1;
        });
        setProductCounts(counts);
      } catch {
        // Counts are informational only
      }
    };
    load();
    loadProductCounts();
    return () => { cancelled = true; };
  }, []);

  const productCountFor = (category: Category) => {
    if (!productCounts) return '—';
    const bySlug = productCounts[category.slug] || 0;
    const byId = category.$id !== category.slug ? productCounts[category.$id] || 0 : 0;
    return bySlug + byId;
  };

  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

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

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData(EMPTY_FORM);
    setSlugTouched(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      image: category.image || '',
    });
    setSlugTouched(true);
    setFormError(null);
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

    if (!name || !slug) {
      setFormError('Name and slug are required.');
      return;
    }
    if (categories.some(c => c.slug === slug && c.$id !== editingCategory?.$id)) {
      setFormError(`Another category already uses the slug "${slug}".`);
      return;
    }

    // Only the live schema's fields; on edit, cleared optional fields are sent as null to clear them
    const payload = editingCategory
      ? { name, slug, description: description || null, image: image || null }
      : { name, slug, ...(description ? { description } : {}), ...(image ? { image } : {}) };

    setSaving(true);
    setFormError(null);
    try {
      const res = await adminFetch(
        editingCategory ? `/api/categories/${encodeURIComponent(editingCategory.$id)}` : '/api/categories',
        {
          method: editingCategory ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const json = await readJson<Category>(res);
      if (!res.ok || !json?.success || !json.data?.$id) {
        setFormError(json?.error || `Failed to save category (HTTP ${res.status})`);
        return;
      }

      // Use the write response: an immediate re-fetch may still be served the cached list
      const saved = json.data;
      setCategories(prev =>
        editingCategory ? prev.map(c => (c.$id === editingCategory.$id ? saved : c)) : [...prev, saved]
      );
      setIsModalOpen(false);
      showToast(editingCategory ? 'Category updated successfully' : 'Category created successfully');
    } catch {
      setFormError('Error connecting to server');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete || deleting) return;
    const target = categoryToDelete;
    setDeleting(true);
    try {
      const res = await adminFetch(`/api/categories/${encodeURIComponent(target.$id)}`, { method: 'DELETE' });
      const json = await readJson<unknown>(res);
      if (res.ok && json?.success) {
        setCategories(prev => prev.filter(c => c.$id !== target.$id));
        setIsDeleteModalOpen(false);
        setCategoryToDelete(null);
        showToast(`Category "${target.name}" deleted`);
      } else {
        showToast(json?.error || 'Failed to delete category', true);
      }
    } catch {
      showToast('Failed to delete category', true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#a3a3a3] p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-white">Categories</h1>
          <button
            onClick={openAddModal}
            className="bg-[#d2f000] text-black font-medium px-4 py-2 rounded-lg hover:bg-[#b8d400] transition-colors flex items-center space-x-2"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Category</span>
          </button>
        </div>

        <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#262626]">
            <div className="relative max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#737373]">search</span>
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg pl-10 pr-3 py-2 text-white focus:border-[#d2f000] outline-none transition-colors"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center text-center text-[#737373]">
              <div className="w-6 h-6 border-2 border-[#d2f000] border-t-transparent rounded-full animate-spin mb-2" />
              <p>Loading categories...</p>
            </div>
          ) : loadError ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-4xl text-red-500 mb-4">error</span>
              <h3 className="text-lg font-medium text-white mb-2">Could not load categories</h3>
              <p className="text-[#737373]">{loadError}</p>
            </div>
          ) : filteredCategories.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#1a1a1a] border-b border-[#262626]">
                  <tr>
                    <th className="p-4 font-medium text-white">Category Name</th>
                    <th className="p-4 font-medium text-white">Slug</th>
                    <th className="p-4 font-medium text-white">Product Count</th>
                    <th className="p-4 font-medium text-white">Created Date</th>
                    <th className="p-4 font-medium text-white text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {filteredCategories.map(category => (
                    <tr key={category.$id} className="hover:bg-[#1a1a1a] transition-colors">
                      <td className="p-4 text-white font-medium">
                        <div className="flex items-center gap-3">
                          {category.image && (
                            <img
                              src={resolveImageUrl(category.image)}
                              alt=""
                              className="w-8 h-8 rounded object-cover border border-[#262626]"
                            />
                          )}
                          <span>{category.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-[#737373]">{category.slug}</td>
                      <td className="p-4 text-[#a3a3a3]">{productCountFor(category)}</td>
                      <td className="p-4 text-[#737373]">{formatDate(category.$createdAt)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => openEditModal(category)} className="p-2 text-[#737373] hover:text-[#d2f000] transition-colors" title="Edit">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => confirmDelete(category)} className="p-2 text-[#737373] hover:text-red-500 transition-colors" title="Delete">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-4xl text-[#262626] mb-4">category</span>
              <h3 className="text-lg font-medium text-white mb-2">No categories found</h3>
              <p className="text-[#737373]">Adjust your search or add a new category.</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-medium text-white">{editingCategory ? 'Edit Category' : 'Add Category'}</h3>
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
                <label className="block text-sm font-medium text-white">Image (optional)</label>
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
                    alt="Category preview"
                    className="w-full h-32 object-cover rounded-lg border border-[#262626]"
                  />
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
              <h3 className="text-xl font-medium text-white mb-2">Delete Category</h3>
              <p className="text-[#a3a3a3]">
                Are you sure you want to delete {categoryToDelete ? `"${categoryToDelete.name}"` : 'this category'}? This action cannot be undone.
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

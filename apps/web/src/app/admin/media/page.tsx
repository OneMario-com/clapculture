'use client';

import { useState, useEffect, useRef } from 'react';
import { compressImageFile } from '@/lib/image-compression';

type MediaItem = {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  createdAt: string;
};

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default function MediaLibrary() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const res = await fetch('/api/media', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const json = await res.json().catch(() => null);
        if (json?.success && json.data && !cancelled) {
          setMedia(json.data);
        } else if (!cancelled) {
          showToast(json?.error || 'Failed to load media');
        }
      } catch (err) {
        console.error('Failed to fetch media', err);
        if (!cancelled) showToast('Failed to load media');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const filteredMedia = media.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast('URL copied to clipboard');
  };

  const handleDelete = async (id: string) => {
    if(!confirm('Are you sure you want to delete this file?')) return;
    
    try {
      showToast('Deleting...');
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`/api/media/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        setMedia(media.filter(m => m.id !== id));
        showToast('File deleted successfully');
        if (previewItem?.id === id) setPreviewItem(null);
      } else {
        showToast(json?.error || 'Failed to delete file');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to delete file');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await uploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const uploadFile = async (file: File) => {
    try {
      setUploading(true);
      showToast('Optimizing & uploading...');
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
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
      const json = await res.json();
      
      if (json.success && json.data) {
        setMedia((prev) => [json.data, ...prev]);
        showToast('File uploaded successfully');
      } else {
        showToast(json.error || 'Upload failed');
      }
    } catch (err) {
      console.error(err);
      showToast('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-[#0a0a0a] min-h-screen relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#d2f000] text-black px-4 py-2 rounded-lg font-medium shadow-lg z-50 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 max-w-3xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-medium">{previewItem.name}</h3>
              <button onClick={() => setPreviewItem(null)} className="text-[#a3a3a3] hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="bg-[#0a0a0a] rounded-lg flex items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewItem.url} alt={previewItem.name} className="max-h-[60vh] object-contain" />
            </div>
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-[#737373]">
                Uploaded {new Date(previewItem.createdAt).toLocaleDateString()} • {formatBytes(previewItem.size)}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => handleDelete(previewItem.id)}
                  className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg font-medium hover:bg-red-500/20"
                >
                  Delete
                </button>
                <button 
                  onClick={() => handleCopyUrl(previewItem.url)}
                  className="bg-[#d2f000] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#b8d400]"
                >
                  Copy URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Media Library</h1>
          <p className="text-[#a3a3a3]">Manage all images, videos, and files across your store.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#737373] text-[18px]">search</span>
            <input 
              type="text" 
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-white focus:border-[#d2f000] outline-none"
            />
          </div>
          <div className="flex bg-[#1a1a1a] border border-[#262626] rounded-lg p-1">
            <button 
              onClick={() => setView('grid')}
              className={`p-1 rounded flex items-center justify-center ${view === 'grid' ? 'bg-[#262626] text-white' : 'text-[#737373] hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
            <button 
              onClick={() => setView('list')}
              className={`p-1 rounded flex items-center justify-center ${view === 'list' ? 'bg-[#262626] text-white' : 'text-[#737373] hover:text-white'}`}
            >
              <span className="material-symbols-outlined text-[18px]">view_list</span>
            </button>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div 
        className="bg-[#141414] border-2 border-dashed border-[#262626] rounded-xl p-8 flex flex-col items-center justify-center text-center mb-8 hover:border-[#d2f000] hover:bg-[#1a1a1a] transition-all cursor-pointer relative"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
          accept="image/*" 
        />
        <div className="bg-[#1a1a1a] p-3 rounded-full mb-3">
          <span className="material-symbols-outlined text-[#d2f000] text-3xl">
            {uploading ? 'sync' : 'cloud_upload'}
          </span>
        </div>
        <h3 className="text-white font-medium text-lg mb-1">
          {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
        </h3>
        <p className="text-[#737373] text-sm">SVG, PNG, JPG or GIF (max. 10MB)</p>
      </div>

      {/* Media Grid/List */}
      {loading ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl text-[#d2f000] mb-3 animate-spin">refresh</span>
          <h3 className="text-white font-medium">Loading media...</h3>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-4xl text-[#262626] mb-3">image_not_supported</span>
          <h3 className="text-white font-medium">No media found</h3>
          <p className="text-[#737373] text-sm mt-1">Try adjusting your search query or upload a file.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredMedia.map(item => (
            <div key={item.id} className="group relative bg-[#141414] border border-[#262626] rounded-lg overflow-hidden flex flex-col">
              <div className="aspect-square bg-[#1a1a1a] flex items-center justify-center relative overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt={item.name} className="object-cover w-full h-full" />
                
                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => setPreviewItem(item)} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full" title="Preview">
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                  </button>
                  <button onClick={() => handleCopyUrl(item.url)} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full" title="Copy URL">
                    <span className="material-symbols-outlined text-[18px]">content_copy</span>
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="bg-red-500/20 hover:bg-red-500/40 text-red-500 p-2 rounded-full" title="Delete">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm text-white font-medium truncate mb-1" title={item.name}>{item.name}</p>
                <div className="flex justify-between items-center text-xs text-[#737373]">
                  <span>{formatBytes(item.size)}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262626] bg-[#1a1a1a]">
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Date Uploaded</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMedia.map(item => (
                <tr key={item.id} className="border-b border-[#262626] hover:bg-[#1a1a1a] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-[#262626] overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-white font-medium truncate max-w-50 md:max-w-md">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#a3a3a3] text-sm">{formatBytes(item.size)}</td>
                  <td className="px-4 py-3 text-[#a3a3a3] text-sm">{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setPreviewItem(item)} className="text-[#a3a3a3] hover:text-white p-1" title="Preview">
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                      <button onClick={() => handleCopyUrl(item.url)} className="text-[#a3a3a3] hover:text-white p-1" title="Copy URL">
                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-red-500/70 hover:text-red-500 p-1" title="Delete">
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
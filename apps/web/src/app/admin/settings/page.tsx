'use client';
import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

type Tab = 'store' | 'payment' | 'shipping' | 'notifications' | 'social';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('shipping');
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  // State
  const [storeData, setStoreData] = useState({
    name: 'CLAPCULTURE',
    logoUrl: 'https://clapculture.com/logo.png',
    email: 'clapcultureofficial@gmail.com',
    phone: '+91 7569684299',
    address: 'Hyderabad, Telangana, India'
  });

  const [paymentData, setPaymentData] = useState({
    upiId: '8639654299@ybl',
    qrCodeUrl: '/qrcode.png',
    instructions: 'Scan the QR code to pay using any UPI app. Share screenshot on WhatsApp.'
  });

  const [shippingData, setShippingData] = useState({
    shippingFee: 49,
    freeThreshold: 999
  });

  const [notificationData, setNotificationData] = useState({
    orderConfirmation: true,
    paymentSubmitted: true,
    orderConfirmed: true,
    shippingNotification: true
  });

  const [socialData, setSocialData] = useState({
    instagram: 'https://www.instagram.com/clapculture_',
    youtube: 'https://youtube.com/@clapculture',
    whatsapp: '+917569684299',
    twitter: 'https://x.com/clapculture'
  });

  useEffect(() => {
    adminFetch('/api/settings')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data) {
          const d = json.data;
          if (d.storeName) setStoreData(p => ({ ...p, name: d.storeName }));
          if (d.upiId) setPaymentData(p => ({ ...p, upiId: d.upiId }));
          if (d.qrCodeUrl) setPaymentData(p => ({ ...p, qrCodeUrl: d.qrCodeUrl }));
          if (typeof d.freeShippingThreshold === 'number') {
            setShippingData(p => ({ ...p, freeThreshold: d.freeShippingThreshold }));
          }
          if (typeof d.shippingFee === 'number') {
            setShippingData(p => ({ ...p, shippingFee: d.shippingFee }));
          }
        }
      })
      .catch(e => console.error('Failed to load settings:', e));
  }, []);

  const showToast = (msg: string, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const payload = {
        storeName: storeData.name,
        currency: 'INR',
        freeShippingThreshold: Number(shippingData.freeThreshold) || 999,
        shippingFee: Number(shippingData.shippingFee) || 49,
        upiId: paymentData.upiId,
        qrCodeUrl: paymentData.qrCodeUrl,
      };

      const res = await adminFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        showToast('✨ Settings & Delivery rates saved successfully!');
      } else {
        showToast(json.error || 'Failed to save settings', true);
      }
    } catch {
      showToast('Error connecting to server', true);
    } finally {
      setLoading(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'store', label: 'Store Details', icon: 'storefront' },
    { id: 'payment', label: 'Payment', icon: 'payments' },
    { id: 'shipping', label: 'Shipping', icon: 'local_shipping' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications' },
    { id: 'social', label: 'Social Links', icon: 'share' }
  ];

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-8">Settings</h1>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Tabs Sidebar */}
          <div className="w-full md:w-64 shrink-0">
            <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden flex flex-col p-2 gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id 
                      ? 'bg-[#1a1a1a] text-[#d2f000]' 
                      : 'text-[#a3a3a3] hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1">
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
              
              {/* Store Settings */}
              {activeTab === 'store' && (
                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">Store Details</h2>
                    <p className="text-[#a3a3a3] text-sm mb-6">Manage your basic store information</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-[#a3a3a3] mb-2">Store Name</label>
                      <input 
                        type="text" 
                        value={storeData.name}
                        onChange={(e) => setStoreData({...storeData, name: e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#a3a3a3] mb-2">Logo URL</label>
                      <input 
                        type="text" 
                        value={storeData.logoUrl}
                        onChange={(e) => setStoreData({...storeData, logoUrl: e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#a3a3a3] mb-2">Support Email</label>
                      <input 
                        type="email" 
                        value={storeData.email}
                        onChange={(e) => setStoreData({...storeData, email: e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#a3a3a3] mb-2">Support Phone</label>
                      <input 
                        type="text" 
                        value={storeData.phone}
                        onChange={(e) => setStoreData({...storeData, phone: e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-[#a3a3a3] mb-2">Store Address</label>
                      <textarea 
                        rows={3}
                        value={storeData.address}
                        onChange={(e) => setStoreData({...storeData, address: e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none resize-none"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-[#262626] flex justify-end">
                    <button type="submit" disabled={loading} className="bg-[#d2f000] text-black font-medium px-6 py-2 rounded-lg hover:bg-[#b8d400] disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}

              {/* Payment Settings */}
              {activeTab === 'payment' && (
                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">Payment Settings</h2>
                    <p className="text-[#a3a3a3] text-sm mb-6">Configure UPI details for manual payments</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-[#a3a3a3] mb-2">UPI ID</label>
                      <input 
                        type="text" 
                        value={paymentData.upiId}
                        onChange={(e) => setPaymentData({...paymentData, upiId: e.target.value})}
                        className="w-full max-w-md bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#a3a3a3] mb-2">QR Code URL</label>
                      <input 
                        type="text" 
                        value={paymentData.qrCodeUrl}
                        onChange={(e) => setPaymentData({...paymentData, qrCodeUrl: e.target.value})}
                        className="w-full max-w-md bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#a3a3a3] mb-2">Payment Instructions (Shown to customer)</label>
                      <textarea 
                        rows={4}
                        value={paymentData.instructions}
                        onChange={(e) => setPaymentData({...paymentData, instructions: e.target.value})}
                        className="w-full max-w-2xl bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none resize-none"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-[#262626] flex justify-end">
                    <button type="submit" disabled={loading} className="bg-[#d2f000] text-black font-medium px-6 py-2 rounded-lg hover:bg-[#b8d400] disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}

              {/* Shipping Settings */}
              {activeTab === 'shipping' && (
                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">Shipping Configuration</h2>
                    <p className="text-[#a3a3a3] text-sm mb-6">Set standard shipping rates and free shipping threshold</p>
                  </div>
                  
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm text-[#a3a3a3] mb-2">Standard Shipping Fee (₹)</label>
                      <input 
                        type="number" 
                        value={shippingData.shippingFee}
                        onChange={(e) => setShippingData({...shippingData, shippingFee: Number(e.target.value)})}
                        className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#a3a3a3] mb-2">Free Shipping Threshold (₹)</label>
                      <input 
                        type="number" 
                        value={shippingData.freeThreshold}
                        onChange={(e) => setShippingData({...shippingData, freeThreshold: Number(e.target.value)})}
                        className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                      />
                      <p className="text-xs text-[#737373] mt-2">Orders above this amount will get free shipping.</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-[#262626] flex justify-end">
                    <button type="submit" disabled={loading} className="bg-[#d2f000] text-black font-medium px-6 py-2 rounded-lg hover:bg-[#b8d400] disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}

              {/* Notifications Settings */}
              {activeTab === 'notifications' && (
                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">Customer Notifications</h2>
                    <p className="text-[#a3a3a3] text-sm mb-6">Manage automated emails sent to customers</p>
                  </div>
                  
                  <div className="space-y-4 max-w-lg">
                    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#262626] rounded-lg">
                      <div>
                        <h4 className="text-white font-medium text-sm">Order Placement</h4>
                        <p className="text-[#737373] text-xs mt-1">Sent when a customer places an order</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={notificationData.orderConfirmation} onChange={(e) => setNotificationData({...notificationData, orderConfirmation: e.target.checked})} />
                        <div className="w-11 h-6 bg-[#262626] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d2f000]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#262626] rounded-lg">
                      <div>
                        <h4 className="text-white font-medium text-sm">Payment Details Submitted</h4>
                        <p className="text-[#737373] text-xs mt-1">Sent when customer uploads payment proof</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={notificationData.paymentSubmitted} onChange={(e) => setNotificationData({...notificationData, paymentSubmitted: e.target.checked})} />
                        <div className="w-11 h-6 bg-[#262626] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d2f000]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#262626] rounded-lg">
                      <div>
                        <h4 className="text-white font-medium text-sm">Order Confirmed</h4>
                        <p className="text-[#737373] text-xs mt-1">Sent when admin approves the payment</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={notificationData.orderConfirmed} onChange={(e) => setNotificationData({...notificationData, orderConfirmed: e.target.checked})} />
                        <div className="w-11 h-6 bg-[#262626] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d2f000]"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-[#1a1a1a] border border-[#262626] rounded-lg">
                      <div>
                        <h4 className="text-white font-medium text-sm">Shipping Update</h4>
                        <p className="text-[#737373] text-xs mt-1">Sent when tracking info is added</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={notificationData.shippingNotification} onChange={(e) => setNotificationData({...notificationData, shippingNotification: e.target.checked})} />
                        <div className="w-11 h-6 bg-[#262626] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#d2f000]"></div>
                      </label>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-[#262626] flex justify-end">
                    <button type="submit" disabled={loading} className="bg-[#d2f000] text-black font-medium px-6 py-2 rounded-lg hover:bg-[#b8d400] disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}

              {/* Social Settings */}
              {activeTab === 'social' && (
                <form onSubmit={handleSave} className="space-y-6">
                  <div>
                    <h2 className="text-lg font-bold text-white mb-1">Social Media Links</h2>
                    <p className="text-[#a3a3a3] text-sm mb-6">Links displayed in the website footer</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-[#a3a3a3] mb-2">Instagram URL</label>
                      <input 
                        type="url" 
                        value={socialData.instagram}
                        onChange={(e) => setSocialData({...socialData, instagram: e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#a3a3a3] mb-2">YouTube URL</label>
                      <input 
                        type="url" 
                        value={socialData.youtube}
                        onChange={(e) => setSocialData({...socialData, youtube: e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#a3a3a3] mb-2">WhatsApp Number (with country code)</label>
                      <input 
                        type="text" 
                        value={socialData.whatsapp}
                        onChange={(e) => setSocialData({...socialData, whatsapp: e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-[#a3a3a3] mb-2">Twitter/X URL</label>
                      <input 
                        type="url" 
                        value={socialData.twitter}
                        onChange={(e) => setSocialData({...socialData, twitter: e.target.value})}
                        className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-3 py-2 text-white focus:border-[#d2f000] outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-[#262626] flex justify-end">
                    <button type="submit" disabled={loading} className="bg-[#d2f000] text-black font-medium px-6 py-2 rounded-lg hover:bg-[#b8d400] disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 border text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in z-50 ${
          toast.isError ? 'bg-red-950/90 border-red-500/50' : 'bg-[#1a1a1a] border-[#262626]'
        }`}>
          <span className={`material-symbols-outlined text-[20px] ${toast.isError ? 'text-red-400' : 'text-green-500'}`}>
            {toast.isError ? 'error' : 'check_circle'}
          </span>
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
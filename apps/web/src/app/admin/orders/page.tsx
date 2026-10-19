/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatCurrency, resolveImageUrl } from '@/lib/utils';

interface OrderItem {
  id?: string;
  productId?: string;
  name: string;
  image?: string;
  size?: string;
  price: number;
  quantity: number;
  categoryId?: string;
  category?: string;
}

interface OrderCustomer {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  apartment?: string;
  city?: string;
  state?: string;
  pincode?: string;
  screenshotUrl?: string;
  paymentProof?: string;
}

interface AdminOrder {
  id: string;
  docId: string;
  customer: OrderCustomer;
  customerName: string;
  email: string;
  phone: string;
  city: string;
  items: OrderItem[];
  itemCount: number;
  totalQuantity: number;
  total: number;
  subtotal: number;
  shipping: number;
  paymentStatus: string;
  orderStatus: string;
  transactionId: string;
  trackingNumber: string;
  screenshotUrl: string;
  createdAt: string;
  dateFormatted: string;
  isArchived: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 'tees', name: 'T-Shirts & Oversized Tees' },
  { id: 'outerwear', name: 'Hoodies & Sweatshirts' },
  { id: 'bottoms', name: 'Cargos & Bottoms' },
  { id: 'headwear', name: 'Caps & Accessories' },
];

const PAYMENT_STATUSES = ['All', 'SUBMITTED', 'VERIFIED', 'PENDING', 'REJECTED'];
const ORDER_STATUSES = ['All', 'PLACED', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const QUICK_TABS = [
  { id: 'All', label: 'Active Orders' },
  { id: 'SUBMITTED', label: 'Pending Verification' },
  { id: 'VERIFIED', label: 'Payment Verified' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'SHIPPED', label: 'Shipped' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'ARCHIVED', label: '📦 Archived' },
];

function mapOrderDoc(doc: Record<string, unknown>): AdminOrder {
  let customerObj: OrderCustomer = {};
  if (typeof doc.customer === 'string') {
    try { customerObj = JSON.parse(doc.customer as string); } catch {}
  } else if (doc.customer && typeof doc.customer === 'object') {
    customerObj = doc.customer as OrderCustomer;
  }

  let itemsList: OrderItem[] = [];
  if (typeof doc.items === 'string') {
    try { itemsList = JSON.parse(doc.items as string); } catch {}
  } else if (Array.isArray(doc.items)) {
    itemsList = doc.items as OrderItem[];
  }

  const totalQty = itemsList.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const totalNum = Number(doc.total) || 0;

  const createdAtStr = String(doc.$createdAt || doc.createdAt || new Date().toISOString());

  return {
    id: String(doc.orderId || doc.$id || '').replace('#', ''),
    docId: String(doc.$id || doc.orderId || ''),
    customer: customerObj,
    customerName: customerObj.fullName || 'Valued Rebel',
    email: customerObj.email || 'customer@example.com',
    phone: customerObj.phone || '',
    city: customerObj.city || '',
    items: itemsList,
    itemCount: itemsList.length,
    totalQuantity: totalQty,
    total: totalNum,
    subtotal: Number(doc.subtotal) || totalNum,
    shipping: Number(doc.shipping) || 0,
    paymentStatus: String(doc.paymentStatus || 'PENDING'),
    orderStatus: String(doc.orderStatus || 'PLACED'),
    transactionId: String(doc.transactionId || ''),
    trackingNumber: String(doc.trackingNumber || ''),
    screenshotUrl: String(doc.screenshotUrl || customerObj.screenshotUrl || customerObj.paymentProof || ''),
    createdAt: createdAtStr,
    dateFormatted: new Date(createdAtStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    isArchived: Boolean(doc.isArchived),
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES);

  // Filters State
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  // Detailed Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedProduct, setSelectedProduct] = useState<string>('All');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [pricePreset, setPricePreset] = useState<string>('all');
  
  const [minQuantity, setMinQuantity] = useState<string>('');
  const [maxQuantity, setMaxQuantity] = useState<string>('');
  const [quantityPreset, setQuantityPreset] = useState<string>('all');

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('All');
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string>('All');
  const [dateRangePreset, setDateRangePreset] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const [sortBy, setSortBy] = useState<string>('newest');

  // Preview Modal / Drawer State (store the id; the order itself is derived from the live list)
  const [previewOrderId, setPreviewOrderId] = useState<string | null>(null);
  const [, setCopiedText] = useState<string | null>(null);
  const [verifyingIds, setVerifyingIds] = useState<string[]>([]);
  const verifyingRef = useRef<Set<string>>(new Set());
  const loadSeqRef = useRef(0);
  const previewOrder = useMemo(
    () => (previewOrderId ? orders.find((o) => (o.docId || o.id) === previewOrderId) ?? null : null),
    [orders, previewOrderId]
  );
  const [toast, setToast] = useState<{ show: boolean; msg: string; isError?: boolean }>({ show: false, msg: '' });

  const showToast = (msg: string, isError = false) => {
    setToast({ show: true, msg, isError });
    setTimeout(() => setToast({ show: false, msg: '' }), 3500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    showToast(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Callers that want the spinner set `loading` first (initial state is already loading)
  const loadOrders = async () => {
    const seq = ++loadSeqRef.current;
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res = await fetch('/api/orders?limit=250&includePending=true&archived=all', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      // Ignore out-of-order responses from older requests
      if (seq !== loadSeqRef.current) return;
      if (res.ok) {
        const data = await res.json();
        if (seq !== loadSeqRef.current) return;
        if (data.success && Array.isArray(data.data)) {
          const mapped: AdminOrder[] = data.data.map((doc: Record<string, unknown>) => mapOrderDoc(doc));
          setOrders(mapped);
        }
      } else {
        showToast('Failed to load orders from database', true);
      }
    } catch {
      if (seq === loadSeqRef.current) showToast('Error connecting to server', true);
    } finally {
      if (seq === loadSeqRef.current) setLoading(false);
    }
  };

  const refreshOrders = () => {
    setLoading(true);
    loadOrders();
  };

  useEffect(() => {
    const timer = setTimeout(() => loadOrders(), 0);
    // Fetch categories list
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setCategories(json.data.map((c: { $id?: string; id?: string; name: string }) => ({
            id: c.id || c.$id || c.name.toLowerCase(),
            name: c.name,
          })));
        }
      })
      .catch(() => {});
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Extract all distinct product names across all orders and catalog
  const distinctProducts = useMemo(() => {
    const productSet = new Set<string>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.name) productSet.add(item.name);
      });
    });
    return Array.from(productSet).sort();
  }, [orders]);

  // Handle Quick Price Presets
  const handlePricePreset = (preset: string) => {
    setPricePreset(preset);
    if (preset === 'all') {
      setMinPrice('');
      setMaxPrice('');
    } else if (preset === 'under-1000') {
      setMinPrice('0');
      setMaxPrice('1000');
    } else if (preset === '1000-2500') {
      setMinPrice('1000');
      setMaxPrice('2500');
    } else if (preset === '2500-5000') {
      setMinPrice('2500');
      setMaxPrice('5000');
    } else if (preset === 'above-5000') {
      setMinPrice('5000');
      setMaxPrice('');
    }
  };

  // Handle Quick Quantity Presets
  const handleQuantityPreset = (preset: string) => {
    setQuantityPreset(preset);
    if (preset === 'all') {
      setMinQuantity('');
      setMaxQuantity('');
    } else if (preset === '1') {
      setMinQuantity('1');
      setMaxQuantity('1');
    } else if (preset === '2') {
      setMinQuantity('2');
      setMaxQuantity('2');
    } else if (preset === '3-5') {
      setMinQuantity('3');
      setMaxQuantity('5');
    } else if (preset === '5+') {
      setMinQuantity('5');
      setMaxQuantity('');
    }
  };

  // Toggle Size Filter
  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  // Reset All Filters
  const handleResetFilters = () => {
    setActiveTab('All');
    setSearch('');
    setSelectedCategory('All');
    setSelectedProduct('All');
    setMinPrice('');
    setMaxPrice('');
    setPricePreset('all');
    setMinQuantity('');
    setMaxQuantity('');
    setQuantityPreset('all');
    setSelectedSizes([]);
    setSelectedPaymentStatus('All');
    setSelectedOrderStatus('All');
    setDateRangePreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSortBy('newest');
    showToast('Filters cleared');
  };

  // Count active filters (excluding default "All" values)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeTab !== 'All') count++;
    if (search.trim() !== '') count++;
    if (selectedCategory !== 'All') count++;
    if (selectedProduct !== 'All') count++;
    if (minPrice !== '' || maxPrice !== '') count++;
    if (minQuantity !== '' || maxQuantity !== '') count++;
    if (selectedSizes.length > 0) count++;
    if (selectedPaymentStatus !== 'All') count++;
    if (selectedOrderStatus !== 'All') count++;
    if (dateRangePreset !== 'all') count++;
    if (sortBy !== 'newest') count++;
    return count;
  }, [
    activeTab,
    search,
    selectedCategory,
    selectedProduct,
    minPrice,
    maxPrice,
    minQuantity,
    maxQuantity,
    selectedSizes,
    selectedPaymentStatus,
    selectedOrderStatus,
    dateRangePreset,
    sortBy,
  ]);

  // Main Filtering Engine
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        // 1. Search Query (Order ID, Customer Name, Email, Phone, City, UTR, Tracking #)
        if (search.trim()) {
          const q = search.toLowerCase().trim();
          const matchId = order.id.toLowerCase().includes(q);
          const matchCustomer = order.customerName.toLowerCase().includes(q);
          const matchEmail = order.email.toLowerCase().includes(q);
          const matchPhone = order.phone.toLowerCase().includes(q);
          const matchCity = order.city.toLowerCase().includes(q);
          const matchUtr = order.transactionId.toLowerCase().includes(q);
          const matchTracking = order.trackingNumber.toLowerCase().includes(q);
          const matchProduct = order.items.some((item) => item.name.toLowerCase().includes(q));

          if (!matchId && !matchCustomer && !matchEmail && !matchPhone && !matchCity && !matchUtr && !matchTracking && !matchProduct) {
            return false;
          }
        }

        // Archive Filter
        if (activeTab === 'ARCHIVED') {
          if (!order.isArchived) return false;
        } else {
          // In active tabs, hide archived orders
          if (order.isArchived) return false;

          // 2. Quick Tab Filter
          if (activeTab !== 'All') {
            if (activeTab === 'SUBMITTED' && order.paymentStatus !== 'SUBMITTED') return false;
            if (activeTab === 'VERIFIED' && order.paymentStatus !== 'VERIFIED') return false;
            if (activeTab === 'CONFIRMED' && order.orderStatus !== 'CONFIRMED' && order.paymentStatus !== 'VERIFIED') return false;
            if (activeTab === 'SHIPPED' && order.orderStatus !== 'SHIPPED') return false;
            if (activeTab === 'DELIVERED' && order.orderStatus !== 'DELIVERED') return false;
            if (activeTab === 'CANCELLED' && order.orderStatus !== 'CANCELLED') return false;
          }
        }

        // 3. Category / Type Filter
        if (selectedCategory !== 'All') {
          const catLower = selectedCategory.toLowerCase();
          const matchesCategory = order.items.some((item) => {
            const itemCat = (item.categoryId || item.category || '').toLowerCase();
            const itemName = item.name.toLowerCase();

            if (itemCat === catLower) return true;
            if (catLower.includes('tee') || catLower === 'tees') {
              return itemName.includes('tee') || itemName.includes('t-shirt') || itemName.includes('oversized');
            }
            if (catLower.includes('hoodie') || catLower === 'outerwear') {
              return itemName.includes('hoodie') || itemName.includes('jacket') || itemName.includes('sweatshirt');
            }
            if (catLower.includes('bottom') || catLower === 'bottoms') {
              return itemName.includes('cargo') || itemName.includes('pant') || itemName.includes('jogger');
            }
            if (catLower.includes('cap') || catLower === 'headwear') {
              return itemName.includes('cap') || itemName.includes('hat') || itemName.includes('beanie');
            }
            return itemName.includes(catLower);
          });
          if (!matchesCategory) return false;
        }

        // 4. Product Filter
        if (selectedProduct !== 'All') {
          const matchesProd = order.items.some(
            (item) => item.name.toLowerCase() === selectedProduct.toLowerCase()
          );
          if (!matchesProd) return false;
        }

        // 5. Price Range Filter
        const minP = minPrice !== '' ? Number(minPrice) : null;
        const maxP = maxPrice !== '' ? Number(maxPrice) : null;
        if (minP !== null && order.total < minP) return false;
        if (maxP !== null && order.total > maxP) return false;

        // 6. Quantity Filter
        const minQ = minQuantity !== '' ? Number(minQuantity) : null;
        const maxQ = maxQuantity !== '' ? Number(maxQuantity) : null;
        if (minQ !== null && order.totalQuantity < minQ) return false;
        if (maxQ !== null && order.totalQuantity > maxQ) return false;

        // 7. Size Filter
        if (selectedSizes.length > 0) {
          const orderSizes = order.items.map((i) => (i.size || 'M').toUpperCase());
          const hasSelectedSize = selectedSizes.some((s) => orderSizes.includes(s.toUpperCase()));
          if (!hasSelectedSize) return false;
        }

        // 8. Payment Status Filter
        if (selectedPaymentStatus !== 'All' && order.paymentStatus !== selectedPaymentStatus) {
          return false;
        }

        // 9. Order Status Filter
        if (selectedOrderStatus !== 'All' && order.orderStatus !== selectedOrderStatus) {
          return false;
        }

        // 10. Date Range Filter
        if (dateRangePreset !== 'all') {
          const orderDate = new Date(order.createdAt).getTime();
          const now = new Date().getTime();

          if (dateRangePreset === 'today') {
            const startOfToday = new Date().setHours(0, 0, 0, 0);
            if (orderDate < startOfToday) return false;
          } else if (dateRangePreset === 'yesterday') {
            const startOfYesterday = new Date(now - 86400000).setHours(0, 0, 0, 0);
            const endOfYesterday = new Date(now - 86400000).setHours(23, 59, 59, 999);
            if (orderDate < startOfYesterday || orderDate > endOfYesterday) return false;
          } else if (dateRangePreset === '7days') {
            const sevenDaysAgo = now - 7 * 86400000;
            if (orderDate < sevenDaysAgo) return false;
          } else if (dateRangePreset === '30days') {
            const thirtyDaysAgo = now - 30 * 86400000;
            if (orderDate < thirtyDaysAgo) return false;
          } else if (dateRangePreset === 'custom') {
            if (customStartDate) {
              const start = new Date(customStartDate).setHours(0, 0, 0, 0);
              if (orderDate < start) return false;
            }
            if (customEndDate) {
              const end = new Date(customEndDate).setHours(23, 59, 59, 999);
              if (orderDate > end) return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => {
        // Sort engine
        if (sortBy === 'newest') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (sortBy === 'price-high') {
          return b.total - a.total;
        }
        if (sortBy === 'price-low') {
          return a.total - b.total;
        }
        if (sortBy === 'qty-high') {
          return b.totalQuantity - a.totalQuantity;
        }
        if (sortBy === 'customer-az') {
          return a.customerName.localeCompare(b.customerName);
        }
        return 0;
      });
  }, [
    orders,
    search,
    activeTab,
    selectedCategory,
    selectedProduct,
    minPrice,
    maxPrice,
    minQuantity,
    maxQuantity,
    selectedSizes,
    selectedPaymentStatus,
    selectedOrderStatus,
    dateRangePreset,
    customStartDate,
    customEndDate,
    sortBy,
  ]);

  // Aggregate Metrics for Filtered Result
  const aggregateMetrics = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    const totalUnits = filteredOrders.reduce((sum, o) => sum + o.totalQuantity, 0);
    const pendingVerifications = filteredOrders.filter((o) => o.paymentStatus === 'SUBMITTED').length;
    const activeCount = orders.filter((o) => !o.isArchived).length;
    const archivedCount = orders.filter((o) => o.isArchived).length;
    return { totalRevenue, totalUnits, pendingVerifications, activeCount, archivedCount };
  }, [filteredOrders, orders]);

  // Quick verify handler
  const handleQuickVerify = async (order: AdminOrder, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const rowId = order.docId || order.id;
    // In-flight guard: a double-click must not send the update twice
    if (verifyingRef.current.has(rowId)) return;
    verifyingRef.current.add(rowId);
    setVerifyingIds((prev) => [...prev, rowId]);
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const updates: Record<string, string> = { paymentStatus: 'VERIFIED' };
      // Only confirm a freshly placed order; never roll back one that is further along
      if (order.orderStatus === 'PLACED') updates.orderStatus = 'CONFIRMED';
      const res = await fetch(`/api/orders/${encodeURIComponent(rowId)}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(updates),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        // Patch just this row from the updated document instead of reloading the whole list
        const updated =
          json.data && typeof json.data === 'object'
            ? mapOrderDoc(json.data as Record<string, unknown>)
            : { ...order, ...updates };
        setOrders((prev) => prev.map((o) => ((o.docId || o.id) === rowId ? { ...o, ...updated } : o)));
        showToast(`Order #${order.id} verified and confirmed!`);
      } else {
        showToast(json?.error || 'Failed to verify order', true);
      }
    } catch {
      showToast('Error updating order status', true);
    } finally {
      verifyingRef.current.delete(rowId);
      setVerifyingIds((prev) => prev.filter((id) => id !== rowId));
    }
  };

  // Archive / Unarchive single order
  const handleToggleArchive = async (docId: string, shouldArchive: boolean, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res = await fetch(`/api/orders/${docId}/archive`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isArchived: shouldArchive }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setOrders((prev) =>
          prev.map((o) => (o.docId === docId || o.id === docId ? { ...o, isArchived: shouldArchive } : o))
        );
        showToast(shouldArchive ? '📦 Order archived successfully!' : '📂 Order restored to active list!');
      } else {
        showToast(json.error || 'Failed to update archive status', true);
      }
    } catch {
      showToast('Error connecting to server', true);
    }
  };

  // Only act on selected orders that are visible under the current tab / filters / search
  const visibleSelectedIds = useMemo(
    () => filteredOrders.map((o) => o.docId || o.id).filter((id) => selectedOrders.includes(id)),
    [filteredOrders, selectedOrders]
  );
  const allFilteredSelected =
    filteredOrders.length > 0 && filteredOrders.every((o) => selectedOrders.includes(o.docId || o.id));

  // Bulk Archive / Unarchive Handler
  const handleBulkArchive = async (shouldArchive: boolean) => {
    const targetIds = visibleSelectedIds;
    if (targetIds.length === 0) return;
    try {
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const res = await fetch('/api/orders/bulk-archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderIds: targetIds, isArchived: shouldArchive }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setOrders((prev) =>
          prev.map((o) => (targetIds.includes(o.docId || o.id) ? { ...o, isArchived: shouldArchive } : o))
        );
        showToast(shouldArchive ? `📦 Archived ${targetIds.length} order(s)!` : `📂 Restored ${targetIds.length} order(s)!`);
        setSelectedOrders([]);
      } else {
        showToast(json?.error || 'Failed to bulk archive orders', true);
      }
    } catch {
      showToast('Error connecting to server', true);
    }
  };

  const toggleSelectOrder = (docId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedOrders((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(filteredOrders.map((o) => o.docId || o.id));
    }
  };

  // Export filtered orders to CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      showToast('No orders to export', true);
      return;
    }

    const headers = [
      'Order ID',
      'Date',
      'Customer Name',
      'Email',
      'Phone',
      'City',
      'State',
      'PIN',
      'Items Count',
      'Total Qty',
      'Items Detail',
      'Total Amount (INR)',
      'Payment Status',
      'Order Status',
      'UTR / Txn ID',
      'Tracking Number',
    ];

    const rows = filteredOrders.map((o) => [
      `#${o.id}`,
      o.dateFormatted,
      `"${o.customerName.replace(/"/g, '""')}"`,
      o.email,
      o.phone,
      `"${o.city.replace(/"/g, '""')}"`,
      `"${(o.customer.state || '').replace(/"/g, '""')}"`,
      o.customer.pincode || '',
      o.itemCount,
      o.totalQuantity,
      `"${o.items.map((i) => `${i.quantity}x ${i.name} (${i.size || 'M'})`).join('; ').replace(/"/g, '""')}"`,
      o.total,
      o.paymentStatus,
      o.orderStatus,
      `"${o.transactionId}"`,
      `"${o.trackingNumber}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ClapCulture_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Exported ${filteredOrders.length} order(s) to CSV!`);
  };

  const getPaymentBadgeColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-500/15 text-green-400 border-green-500/30';
      case 'SUBMITTED':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'PENDING':
        return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      case 'REJECTED':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    }
  };

  const getOrderBadgeColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
      case 'DELIVERED':
        return 'bg-green-500/15 text-green-400 border-green-500/30';
      case 'PLACED':
        return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
      case 'PROCESSING':
      case 'PACKED':
      case 'SHIPPED':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'CANCELLED':
        return 'bg-red-500/15 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6 max-w-[1920px] mx-auto pb-16">
      {/* Toast */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-6 py-3 rounded-lg font-bold font-mono text-sm shadow-2xl flex items-center gap-2 animate-in slide-in-from-bottom ${
            toast.isError ? 'bg-red-600 text-white' : 'bg-electric-lime text-black'
          }`}
        >
          <span className="material-symbols-outlined text-lg">
            {toast.isError ? 'error' : 'check_circle'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Header & Metrics */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#141414] border border-[#262626] rounded-2xl p-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-white font-mono uppercase tracking-wider">
              Orders Management
            </h1>
            <span className="bg-electric-lime text-black text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
              {filteredOrders.length} / {orders.length}
            </span>
          </div>
          <p className="text-xs text-[#737373] mt-1 font-mono">
            Filter, inspect items, verify UPI payments, and export shipments.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase transition-all flex items-center gap-2 cursor-pointer border ${
              showFilters || activeFilterCount > 0
                ? 'bg-electric-lime text-black border-electric-lime shadow-[0_0_15px_rgba(210,240,0,0.25)]'
                : 'bg-[#1a1a1a] text-white border-[#262626] hover:border-electric-lime'
            }`}
          >
            <span className="material-symbols-outlined text-base">filter_list</span>
            <span>{showFilters ? 'Hide Filters' : 'Filter Orders'}</span>
            {activeFilterCount > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                showFilters ? 'bg-black text-electric-lime' : 'bg-electric-lime text-black'
              }`}>
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#262626] text-white border border-[#262626] hover:border-white font-mono text-xs font-bold uppercase transition-colors flex items-center gap-2 cursor-pointer"
            title="Download CSV of current filtered list"
          >
            <span className="material-symbols-outlined text-base text-green-400">download</span>
            <span>Export CSV</span>
          </button>

          <button
            onClick={refreshOrders}
            className="p-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#262626] text-white border border-[#262626] hover:border-white transition-colors cursor-pointer"
            title="Refresh Orders"
          >
            <span className="material-symbols-outlined text-base block">refresh</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <span className="text-[11px] text-[#737373] font-mono uppercase block mb-1">Active Orders</span>
          <p className="text-2xl font-bold text-white font-mono">{aggregateMetrics.activeCount}</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <span className="text-[11px] text-[#737373] font-mono uppercase block mb-1">Filtered</span>
          <p className="text-2xl font-bold text-cyan-400 font-mono">{filteredOrders.length}</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <span className="text-[11px] text-[#737373] font-mono uppercase block mb-1">Total Value</span>
          <p className="text-2xl font-bold text-electric-lime font-mono">
            {formatCurrency(aggregateMetrics.totalRevenue)}
          </p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <span className="text-[11px] text-[#737373] font-mono uppercase block mb-1">Pending Verify</span>
          <p className="text-2xl font-bold text-yellow-400 font-mono">{aggregateMetrics.pendingVerifications}</p>
        </div>
        <div className="bg-[#141414] border border-[#262626] rounded-xl p-4">
          <span className="text-[11px] text-[#737373] font-mono uppercase block mb-1">Archived Orders</span>
          <p className="text-2xl font-bold text-amber-400 font-mono">{aggregateMetrics.archivedCount}</p>
        </div>
      </div>

      {/* Universal Search & Quick Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Universal Search Input */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-lg">
              search
            </span>
            <input
              type="text"
              placeholder="Search by Order ID (#CLAP...), Customer Name, Email, Phone, UTR number, Product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] focus:border-electric-lime rounded-xl py-3 pl-11 pr-10 text-sm text-white font-mono outline-none transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 bg-[#141414] border border-[#262626] rounded-xl px-3 py-2 shrink-0">
            <span className="material-symbols-outlined text-sm text-[#737373]">sort</span>
            <span className="text-xs text-[#737373] font-mono">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-white font-mono text-xs font-bold outline-none cursor-pointer pr-2"
            >
              <option value="newest" className="bg-[#141414]">Newest First</option>
              <option value="oldest" className="bg-[#141414]">Oldest First</option>
              <option value="price-high" className="bg-[#141414]">Price: High to Low</option>
              <option value="price-low" className="bg-[#141414]">Price: Low to High</option>
              <option value="qty-high" className="bg-[#141414]">Quantity: High to Low</option>
              <option value="customer-az" className="bg-[#141414]">Customer: A to Z</option>
            </select>
          </div>
        </div>

        {/* Quick Status Tabs */}
        <div className="flex overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar gap-2">
          {QUICK_TABS.map((tab) => {
            let tabCount = 0;
            if (tab.id === 'All') tabCount = orders.filter((o) => !o.isArchived).length;
            else if (tab.id === 'ARCHIVED') tabCount = orders.filter((o) => o.isArchived).length;
            else if (tab.id === 'SUBMITTED') tabCount = orders.filter((o) => !o.isArchived && o.paymentStatus === 'SUBMITTED').length;
            else if (tab.id === 'VERIFIED') tabCount = orders.filter((o) => !o.isArchived && o.paymentStatus === 'VERIFIED').length;
            else tabCount = orders.filter((o) => !o.isArchived && o.orderStatus === tab.id).length;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? tab.id === 'ARCHIVED'
                      ? 'bg-amber-400 text-black shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                      : 'bg-electric-lime text-black shadow-[0_0_10px_rgba(210,240,0,0.3)]'
                    : 'bg-[#141414] text-[#a3a3a3] hover:text-white border border-[#262626]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-[#262626] text-gray-400'
                  }`}
                >
                  {tabCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── EXPANDABLE FILTER PANEL ───────────────────────────── */}
      {showFilters && (
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex justify-between items-center border-b border-[#262626] pb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-electric-lime">tune</span>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                Advanced Order Filters
              </h2>
            </div>
            {activeFilterCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-mono text-electric-lime hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                Reset All Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 1. Category / Type Filter */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-gray-300 uppercase block">
                1. Category / Type
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#262626] focus:border-electric-lime rounded-lg p-2.5 text-xs text-white font-mono outline-none"
              >
                <option value="All" className="bg-[#1a1a1a]">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-[#1a1a1a]">
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Specific Product Filter */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-gray-300 uppercase block">
                2. Specific Product
              </label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#262626] focus:border-electric-lime rounded-lg p-2.5 text-xs text-white font-mono outline-none"
              >
                <option value="All" className="bg-[#1a1a1a]">All Products</option>
                {distinctProducts.map((p) => (
                  <option key={p} value={p} className="bg-[#1a1a1a]">
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Payment Status */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-gray-300 uppercase block">
                3. Payment Status
              </label>
              <select
                value={selectedPaymentStatus}
                onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#262626] focus:border-electric-lime rounded-lg p-2.5 text-xs text-white font-mono outline-none"
              >
                {PAYMENT_STATUSES.map((status) => (
                  <option key={status} value={status} className="bg-[#1a1a1a]">
                    {status === 'SUBMITTED' ? 'SUBMITTED (Pending Verification)' : status}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Order Status */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-gray-300 uppercase block">
                4. Order Status
              </label>
              <select
                value={selectedOrderStatus}
                onChange={(e) => setSelectedOrderStatus(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#262626] focus:border-electric-lime rounded-lg p-2.5 text-xs text-white font-mono outline-none"
              >
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status} className="bg-[#1a1a1a]">
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2 border-t border-[#262626]/50">
            {/* 5. Price Filter (Min & Max + Presets) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono font-bold text-gray-300 uppercase">
                  5. Price Range (₹)
                </label>
                {(minPrice || maxPrice) && (
                  <span className="text-[10px] text-electric-lime font-mono">
                    ₹{minPrice || '0'} - ₹{maxPrice || '∞'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={minPrice}
                  onChange={(e) => {
                    setMinPrice(e.target.value);
                    setPricePreset('custom');
                  }}
                  className="w-full bg-[#1a1a1a] border border-[#262626] focus:border-electric-lime rounded-lg p-2 text-xs text-white font-mono outline-none"
                />
                <span className="text-gray-500 font-mono text-xs">to</span>
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={maxPrice}
                  onChange={(e) => {
                    setMaxPrice(e.target.value);
                    setPricePreset('custom');
                  }}
                  className="w-full bg-[#1a1a1a] border border-[#262626] focus:border-electric-lime rounded-lg p-2 text-xs text-white font-mono outline-none"
                />
              </div>
              {/* Quick Price Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'under-1000', label: '< ₹1k' },
                  { id: '1000-2500', label: '₹1k-2.5k' },
                  { id: '2500-5000', label: '₹2.5k-5k' },
                  { id: 'above-5000', label: '> ₹5k' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePricePreset(p.id)}
                    className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                      pricePreset === p.id
                        ? 'bg-electric-lime text-black font-bold'
                        : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#262626]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 6. Quantity Filter (Items per order) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-mono font-bold text-gray-300 uppercase">
                  6. Item Quantity
                </label>
                {(minQuantity || maxQuantity) && (
                  <span className="text-[10px] text-electric-lime font-mono">
                    {minQuantity || '1'} to {maxQuantity || '∞'} items
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min Qty"
                  value={minQuantity}
                  onChange={(e) => {
                    setMinQuantity(e.target.value);
                    setQuantityPreset('custom');
                  }}
                  className="w-full bg-[#1a1a1a] border border-[#262626] focus:border-electric-lime rounded-lg p-2 text-xs text-white font-mono outline-none"
                />
                <span className="text-gray-500 font-mono text-xs">to</span>
                <input
                  type="number"
                  placeholder="Max Qty"
                  value={maxQuantity}
                  onChange={(e) => {
                    setMaxQuantity(e.target.value);
                    setQuantityPreset('custom');
                  }}
                  className="w-full bg-[#1a1a1a] border border-[#262626] focus:border-electric-lime rounded-lg p-2 text-xs text-white font-mono outline-none"
                />
              </div>
              {/* Quick Qty Chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: '1', label: '1 Item' },
                  { id: '2', label: '2 Items' },
                  { id: '3-5', label: '3-5 Items' },
                  { id: '5+', label: '5+ Items' },
                ].map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => handleQuantityPreset(q.id)}
                    className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                      quantityPreset === q.id
                        ? 'bg-electric-lime text-black font-bold'
                        : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#262626]'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 7. Size Filter */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-gray-300 uppercase block">
                7. Size Filter
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SIZES.map((size) => {
                  const isSelected = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(size)}
                      className={`px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-electric-lime text-black shadow-[0_0_8px_rgba(210,240,0,0.3)]'
                          : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#262626]'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 8. Date Range Presets */}
          <div className="pt-2 border-t border-[#262626]/50 space-y-2">
            <label className="text-xs font-mono font-bold text-gray-300 uppercase block">
              8. Order Date Range
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7days', label: 'Last 7 Days' },
                { id: '30days', label: 'Last 30 Days' },
                { id: 'custom', label: 'Custom Range' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDateRangePreset(d.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-colors ${
                    dateRangePreset === d.id
                      ? 'bg-electric-lime text-black font-bold'
                      : 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#262626]'
                  }`}
                >
                  {d.label}
                </button>
              ))}

              {dateRangePreset === 'custom' && (
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#262626] rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none focus:border-electric-lime"
                  />
                  <span className="text-gray-500 text-xs font-mono">to</span>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-[#1a1a1a] border border-[#262626] rounded-lg px-2.5 py-1 text-xs text-white font-mono outline-none focus:border-electric-lime"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Badges Bar */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-[#141414] border border-[#262626] rounded-xl p-3">
          <span className="text-xs text-[#737373] font-mono mr-1">Active Filters:</span>

          {search && (
            <span className="inline-flex items-center gap-1 bg-[#1a1a1a] border border-electric-lime/40 text-electric-lime px-2.5 py-1 rounded-full text-xs font-mono">
              Search: &quot;{search}&quot;
              <button onClick={() => setSearch('')} className="hover:text-white">✕</button>
            </span>
          )}

          {activeTab !== 'All' && (
            <span className="inline-flex items-center gap-1 bg-[#1a1a1a] border border-electric-lime/40 text-electric-lime px-2.5 py-1 rounded-full text-xs font-mono">
              Tab: {activeTab}
              <button onClick={() => setActiveTab('All')} className="hover:text-white">✕</button>
            </span>
          )}

          {selectedCategory !== 'All' && (
            <span className="inline-flex items-center gap-1 bg-[#1a1a1a] border border-electric-lime/40 text-electric-lime px-2.5 py-1 rounded-full text-xs font-mono">
              Category: {categories.find((c) => c.id === selectedCategory)?.name || selectedCategory}
              <button onClick={() => setSelectedCategory('All')} className="hover:text-white">✕</button>
            </span>
          )}

          {selectedProduct !== 'All' && (
            <span className="inline-flex items-center gap-1 bg-[#1a1a1a] border border-electric-lime/40 text-electric-lime px-2.5 py-1 rounded-full text-xs font-mono">
              Product: {selectedProduct}
              <button onClick={() => setSelectedProduct('All')} className="hover:text-white">✕</button>
            </span>
          )}

          {(minPrice || maxPrice) && (
            <span className="inline-flex items-center gap-1 bg-[#1a1a1a] border border-electric-lime/40 text-electric-lime px-2.5 py-1 rounded-full text-xs font-mono">
              Price: ₹{minPrice || '0'} - ₹{maxPrice || '∞'}
              <button
                onClick={() => {
                  setMinPrice('');
                  setMaxPrice('');
                  setPricePreset('all');
                }}
                className="hover:text-white"
              >
                ✕
              </button>
            </span>
          )}

          {(minQuantity || maxQuantity) && (
            <span className="inline-flex items-center gap-1 bg-[#1a1a1a] border border-electric-lime/40 text-electric-lime px-2.5 py-1 rounded-full text-xs font-mono">
              Qty: {minQuantity || '1'} - {maxQuantity || '∞'}
              <button
                onClick={() => {
                  setMinQuantity('');
                  setMaxQuantity('');
                  setQuantityPreset('all');
                }}
                className="hover:text-white"
              >
                ✕
              </button>
            </span>
          )}

          {selectedSizes.length > 0 && (
            <span className="inline-flex items-center gap-1 bg-[#1a1a1a] border border-electric-lime/40 text-electric-lime px-2.5 py-1 rounded-full text-xs font-mono">
              Sizes: {selectedSizes.join(', ')}
              <button onClick={() => setSelectedSizes([])} className="hover:text-white">✕</button>
            </span>
          )}

          {selectedPaymentStatus !== 'All' && (
            <span className="inline-flex items-center gap-1 bg-[#1a1a1a] border border-electric-lime/40 text-electric-lime px-2.5 py-1 rounded-full text-xs font-mono">
              Payment: {selectedPaymentStatus}
              <button onClick={() => setSelectedPaymentStatus('All')} className="hover:text-white">✕</button>
            </span>
          )}

          {selectedOrderStatus !== 'All' && (
            <span className="inline-flex items-center gap-1 bg-[#1a1a1a] border border-electric-lime/40 text-electric-lime px-2.5 py-1 rounded-full text-xs font-mono">
              Order Status: {selectedOrderStatus}
              <button onClick={() => setSelectedOrderStatus('All')} className="hover:text-white">✕</button>
            </span>
          )}

          {dateRangePreset !== 'all' && (
            <span className="inline-flex items-center gap-1 bg-[#1a1a1a] border border-electric-lime/40 text-electric-lime px-2.5 py-1 rounded-full text-xs font-mono">
              Date: {dateRangePreset}
              <button onClick={() => setDateRangePreset('all')} className="hover:text-white">✕</button>
            </span>
          )}

          <button
            onClick={handleResetFilters}
            className="ml-auto text-xs font-mono text-red-400 hover:text-red-300 underline cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-2xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-24 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-2 border-electric-lime border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-mono text-[#a3a3a3]">Loading orders from Appwrite database...</p>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262626] bg-[#181818]">
                  <th className="p-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="accent-electric-lime w-4 h-4 rounded cursor-pointer"
                      title="Select all filtered orders"
                    />
                  </th>
                  <th className="p-4 text-xs font-mono text-[#737373] uppercase tracking-wider">Order</th>
                  <th className="p-4 text-xs font-mono text-[#737373] uppercase tracking-wider">Customer</th>
                  <th className="p-4 text-xs font-mono text-[#737373] uppercase tracking-wider">Items Breakdown</th>
                  <th className="p-4 text-xs font-mono text-[#737373] uppercase tracking-wider">Payment & UTR</th>
                  <th className="p-4 text-xs font-mono text-[#737373] uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-mono text-[#737373] uppercase tracking-wider">Total</th>
                  <th className="p-4 text-xs font-mono text-[#737373] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]/80 text-sm">
                {filteredOrders.map((order) => {
                  const firstItem = order.items[0];
                  const isSelected = selectedOrders.includes(order.docId || order.id);
                  return (
                    <tr
                      key={order.docId || order.id}
                      className={`hover:bg-[#1a1a1a] transition-colors group cursor-pointer ${
                        isSelected ? 'bg-electric-lime/5' : ''
                      }`}
                      onClick={() => setPreviewOrderId(order.docId || order.id)}
                    >
                      {/* Selection Checkbox */}
                      <td className="p-4 align-top w-10 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectOrder(order.docId || order.id, e as unknown as React.MouseEvent)}
                          className="accent-electric-lime w-4 h-4 rounded cursor-pointer mt-1"
                        />
                      </td>

                      {/* 1. Order ID & Date */}
                      <td className="p-4 align-top">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/orders/${order.docId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-white font-bold font-mono text-sm hover:text-electric-lime transition-colors"
                          >
                            #{order.id}
                          </Link>
                          {order.isArchived && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded">
                              ARCHIVED
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(order.id, `Order ID #${order.id}`);
                            }}
                            className="text-gray-500 hover:text-electric-lime text-xs"
                            title="Copy Order ID"
                          >
                            <span className="material-symbols-outlined text-[15px]">content_copy</span>
                          </button>
                        </div>
                        <p className="text-[11px] text-[#737373] font-mono mt-1">{order.dateFormatted}</p>
                      </td>

                      {/* 2. Customer Info */}
                      <td className="p-4 align-top">
                        <p className="font-bold text-white text-sm">{order.customerName}</p>
                        <p className="text-xs text-[#a3a3a3] font-mono mt-0.5">{order.email}</p>
                        {order.phone && (
                          <p className="text-[11px] text-[#737373] font-mono mt-0.5">{order.phone}</p>
                        )}
                        {order.city && (
                          <span className="inline-block text-[10px] text-gray-400 bg-[#242424] px-1.5 py-0.5 rounded mt-1">
                            {order.city}
                          </span>
                        )}
                      </td>

                      {/* 3. Items Breakdown Preview */}
                      <td className="p-4 align-top">
                        <div className="flex items-center gap-3">
                          {firstItem && (
                            <div className="w-10 h-12 bg-[#222] rounded overflow-hidden border border-[#333] shrink-0">
                              <img
                                src={resolveImageUrl(firstItem.image)}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-bold text-white line-clamp-1">
                              {firstItem ? `${firstItem.quantity}x ${firstItem.name}` : 'No items'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {firstItem?.size && (
                                <span className="text-[10px] font-mono text-electric-lime font-bold bg-electric-lime/10 px-1 rounded">
                                  {firstItem.size}
                                </span>
                              )}
                              <span className="text-[11px] text-[#737373] font-mono">
                                {order.totalQuantity} total item{order.totalQuantity !== 1 ? 's' : ''}
                              </span>
                            </div>
                            {order.items.length > 1 && (
                              <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                +{order.items.length - 1} other item{order.items.length - 1 > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Payment & UTR */}
                      <td className="p-4 align-top">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold font-mono border ${getPaymentBadgeColor(
                            order.paymentStatus
                          )}`}
                        >
                          {order.paymentStatus === 'SUBMITTED' ? 'PENDING VERIFY' : order.paymentStatus}
                        </span>

                        {order.transactionId && order.transactionId !== 'UPI-REF-PENDING' && (
                          <div className="flex items-center gap-1 mt-1.5">
                            <span className="text-[11px] font-mono text-gray-300 font-bold bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-[#333]">
                              UTR: {order.transactionId}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(order.transactionId, 'UTR number');
                              }}
                              className="text-gray-400 hover:text-electric-lime"
                              title="Copy UTR"
                            >
                              <span className="material-symbols-outlined text-[14px]">content_copy</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 5. Order Status */}
                      <td className="p-4 align-top">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold font-mono border ${getOrderBadgeColor(
                            order.orderStatus
                          )}`}
                        >
                          {order.orderStatus}
                        </span>
                        {order.trackingNumber && order.trackingNumber !== 'TRK-CLAP-PENDING' && (
                          <p className="text-[10px] text-purple-400 font-mono mt-1 line-clamp-1">
                            {order.trackingNumber}
                          </p>
                        )}
                      </td>

                      {/* 6. Total Amount */}
                      <td className="p-4 align-top">
                        <p className="text-sm text-electric-lime font-bold font-mono">
                          {formatCurrency(order.total)}
                        </p>
                        <p className="text-[10px] text-[#737373] font-mono">
                          Ship: {order.shipping === 0 ? 'FREE' : formatCurrency(order.shipping)}
                        </p>
                      </td>

                      {/* 7. Actions */}
                      <td className="p-4 align-top text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {order.paymentStatus === 'SUBMITTED' && (
                            <button
                              onClick={(e) => handleQuickVerify(order, e)}
                              disabled={verifyingIds.includes(order.docId || order.id)}
                              className="text-xs bg-green-500/20 hover:bg-green-500 text-green-400 hover:text-black border border-green-500/30 px-3 py-1.5 rounded-lg font-mono font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                              title="Verify payment and confirm order"
                            >
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              <span>{verifyingIds.includes(order.docId || order.id) ? 'Verifying...' : 'Verify'}</span>
                            </button>
                          )}

                          {order.isArchived ? (
                            <button
                              onClick={(e) => handleToggleArchive(order.docId || order.id, false, e)}
                              className="p-2 rounded-lg bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-black border border-amber-500/30 transition-all cursor-pointer"
                              title="Restore to Active Orders"
                            >
                              <span className="material-symbols-outlined text-[18px]">unarchive</span>
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleToggleArchive(order.docId || order.id, true, e)}
                              className="p-2 rounded-lg bg-[#262626] text-gray-400 hover:bg-amber-500/20 hover:text-amber-300 hover:border-amber-500/40 border border-transparent transition-all cursor-pointer"
                              title="Archive Order"
                            >
                              <span className="material-symbols-outlined text-[18px]">archive</span>
                            </button>
                          )}

                          <Link
                            href={`/admin/orders/${order.docId}`}
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-[#262626] text-white hover:bg-electric-lime hover:text-black transition-colors"
                            title="Open full order management"
                          >
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-[#737373] space-y-3">
            <span className="material-symbols-outlined text-5xl text-[#555] block">filter_alt_off</span>
            <p className="text-white text-base font-bold font-mono">No matching orders found</p>
            <p className="text-xs text-[#737373] max-w-md mx-auto font-mono">
              Try tweaking your search query, price ranges, selected categories, or clear active filters.
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-2 px-4 py-2 bg-electric-lime text-black font-mono text-xs font-bold rounded-lg hover:bg-white transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Floating Bulk Actions Bar */}
      {visibleSelectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#1a1a1a] border border-electric-lime/50 shadow-[0_10px_35px_rgba(0,0,0,0.9)] rounded-2xl px-5 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-white">
            <span className="w-2 h-2 rounded-full bg-electric-lime animate-pulse" />
            <span>{visibleSelectedIds.length} order{visibleSelectedIds.length > 1 ? 's' : ''} selected</span>
          </div>

          <div className="h-4 w-px bg-[#333]" />

          {activeTab === 'ARCHIVED' ? (
            <button
              onClick={() => handleBulkArchive(false)}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-mono font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">unarchive</span>
              <span>Restore Selected</span>
            </button>
          ) : (
            <button
              onClick={() => handleBulkArchive(true)}
              className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 text-xs font-mono font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">archive</span>
              <span>Archive Selected</span>
            </button>
          )}

          <button
            onClick={() => setSelectedOrders([])}
            className="text-xs font-mono text-gray-400 hover:text-white underline cursor-pointer"
          >
            Deselect
          </button>
        </div>
      )}

      {/* ── QUICK ORDER PREVIEW MODAL ─────────────────────────── */}
      {previewOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewOrderId(null)}
        >
          <div
            className="bg-[#141414] border border-[#262626] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-[#262626] pb-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-2xl font-bold font-mono text-white">#{previewOrder.id}</h3>
                  {previewOrder.isArchived && (
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      📦 ARCHIVED
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono border ${getPaymentBadgeColor(previewOrder.paymentStatus)}`}>
                    {previewOrder.paymentStatus}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono border ${getOrderBadgeColor(previewOrder.orderStatus)}`}>
                    {previewOrder.orderStatus}
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-mono mt-1">Placed on {previewOrder.dateFormatted}</p>
              </div>

              <button
                onClick={() => setPreviewOrderId(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white bg-[#222] hover:bg-[#333]"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Customer Details */}
            <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-4 space-y-2">
              <span className="text-[10px] text-electric-lime font-mono uppercase font-bold tracking-wider">
                Customer & Shipping
              </span>
              <p className="font-bold text-sm text-white">{previewOrder.customerName}</p>
              <p className="text-xs text-gray-300 font-mono">{previewOrder.email} • {previewOrder.phone || 'No phone'}</p>
              <p className="text-xs text-gray-400">
                {previewOrder.customer.address ? `${previewOrder.customer.address}, ${previewOrder.customer.city || ''}, ${previewOrder.customer.state || ''} ${previewOrder.customer.pincode || ''}` : 'Address on file'}
              </p>

              {/* 1-Click WhatsApp Support */}
              {previewOrder.phone && (
                <div className="pt-2 flex gap-2">
                  <a
                    href={`https://wa.me/${previewOrder.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${previewOrder.customerName}, this is CLAPCULTURE regarding your Order #${previewOrder.id}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 px-3 py-1.5 rounded-lg hover:bg-[#25D366]/20 font-bold"
                  >
                    <span>💬</span> WhatsApp Customer
                  </a>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-3">
              <span className="text-[10px] text-electric-lime font-mono uppercase font-bold tracking-wider">
                Order Items ({previewOrder.totalQuantity} total)
              </span>
              <div className="border border-[#262626] rounded-xl divide-y divide-[#262626] overflow-hidden">
                {previewOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-[#181818] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-14 bg-[#222] rounded overflow-hidden border border-[#333] shrink-0">
                        <img src={resolveImageUrl(item.image)} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-electric-lime font-bold bg-electric-lime/10 px-1 rounded">
                            SIZE: {item.size || 'M'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">QTY: {item.quantity}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs font-bold text-white font-mono shrink-0">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Proof & Total */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-4 space-y-1">
                <span className="text-[10px] text-electric-lime font-mono uppercase font-bold">Payment Info</span>
                <p className="text-xs text-gray-300 font-mono">
                  UTR: <strong className="text-white">{previewOrder.transactionId || 'None'}</strong>
                </p>
                {previewOrder.screenshotUrl && (
                  <div className="mt-2">
                    <a
                      href={resolveImageUrl(previewOrder.screenshotUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-electric-lime underline font-mono flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">image</span>
                      View Payment Screenshot
                    </a>
                  </div>
                )}
              </div>

              <div className="bg-[#1a1a1a] border border-[#262626] rounded-xl p-4 space-y-1 text-right">
                <span className="text-[10px] text-gray-400 font-mono uppercase">Grand Total</span>
                <p className="text-2xl font-bold font-mono text-electric-lime">
                  {formatCurrency(previewOrder.total)}
                </p>
                <p className="text-[10px] text-gray-500 font-mono">
                  Subtotal: {formatCurrency(previewOrder.subtotal)} + Shipping: {formatCurrency(previewOrder.shipping)}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-[#262626]">
              {previewOrder.paymentStatus === 'SUBMITTED' && (
                <button
                  onClick={(e) => {
                    handleQuickVerify(previewOrder, e);
                    setPreviewOrderId(null);
                  }}
                  className="flex-1 bg-green-500 hover:bg-green-400 text-black font-mono font-bold text-xs py-3 rounded-xl uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Verify Payment & Confirm
                </button>
              )}

              {previewOrder.isArchived ? (
                <button
                  onClick={(e) => {
                    handleToggleArchive(previewOrder.docId || previewOrder.id, false, e);
                  }}
                  className="px-4 py-3 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 font-mono font-bold text-xs rounded-xl uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">unarchive</span>
                  Restore
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    handleToggleArchive(previewOrder.docId || previewOrder.id, true, e);
                  }}
                  className="px-4 py-3 bg-[#262626] hover:bg-amber-500 text-gray-300 hover:text-black font-mono font-bold text-xs rounded-xl uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">archive</span>
                  Archive
                </button>
              )}

              <Link
                href={`/admin/orders/${previewOrder.docId}`}
                className="flex-1 bg-electric-lime hover:bg-white text-black font-mono font-bold text-xs py-3 rounded-xl uppercase transition-colors text-center flex items-center justify-center gap-1.5"
              >
                <span>Full Order Details</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

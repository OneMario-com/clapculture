'use client';

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  spent: string;
  lastOrder: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoading(true);
        // 1. Fetch direct customers from /api/customers
        const custRes = await adminFetch('/api/customers').catch(() => null);
        const custData = custRes && custRes.ok ? await custRes.json() : null;
        
        // 2. Fetch orders from /api/orders
        const ordersRes = await adminFetch('/api/orders').catch(() => null);
        const ordersData = ordersRes && ordersRes.ok ? await ordersRes.json() : null;

        const customerMap = new Map<string, AdminCustomer>();

        // Populate from customer docs
        if (custData && custData.success && Array.isArray(custData.data)) {
          custData.data.forEach((c: Record<string, unknown>) => {
            const email = String(c.email || '').toLowerCase();
            if (!email) return;
            const firstName = String(c.firstName || '');
            const lastName = String(c.lastName || '');
            const name = `${firstName} ${lastName}`.trim() || 'Valued Rebel';
            let ordersCount = 0;
            try {
              ordersCount = typeof c.orders === 'string' ? JSON.parse(c.orders).length : Array.isArray(c.orders) ? c.orders.length : 0;
            } catch {
              ordersCount = 0;
            }

            customerMap.set(email, {
              id: String(c.$id || email),
              name,
              email,
              phone: String(c.phone || 'N/A'),
              orders: ordersCount,
              spent: '₹0',
              lastOrder: c.$createdAt ? new Date(c.$createdAt as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recently',
            });
          });
        }

        // Merge order totals
        if (ordersData && ordersData.success && Array.isArray(ordersData.data)) {
          ordersData.data.forEach((doc: Record<string, unknown>) => {
            const customerObj = typeof doc.customer === 'string' 
              ? JSON.parse(doc.customer as string) 
              : ((doc.customer || {}) as Record<string, string | undefined>);
            
            const email = (customerObj.email || '').toLowerCase();
            if (!email) return;

            const existing = customerMap.get(email);
            const amount = Number(doc.total) || 0;

            if (existing) {
              const currentSpent = Number(existing.spent.replace('₹', '')) || 0;
              existing.spent = `₹${currentSpent + amount}`;
              if (!existing.orders) existing.orders = 1;
            } else {
              customerMap.set(email, {
                id: String(doc.$id || email),
                name: customerObj.fullName || 'Valued Rebel',
                email,
                phone: customerObj.phone || 'N/A',
                orders: 1,
                spent: `₹${amount}`,
                lastOrder: doc.$createdAt ? new Date(doc.$createdAt as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recently',
              });
            }
          });
        }

        setCustomers(Array.from(customerMap.values()));
      } catch {
        // Handled silently
      } finally {
        setLoading(false);
      }
    }
    loadCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white mb-6">Customers</h1>
      
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#262626]">
          <input
            type="text"
            placeholder="Search customers by name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#d2f000]"
          />
        </div>
        
        {loading ? (
          <div className="py-16 text-center text-[#737373]">
            <div className="w-6 h-6 border-2 border-electric-lime border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading customers from database...</p>
          </div>
        ) : filteredCustomers.length > 0 ? (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#262626] bg-[#1a1a1a] text-[#737373] text-xs uppercase tracking-wider">
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Orders</th>
                <th className="p-4 font-medium">Total Spent</th>
                <th className="p-4 font-medium">Last Order</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626] text-sm">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-[#1a1a1a]">
                  <td className="p-4 font-medium text-white">{customer.name}</td>
                  <td className="p-4 text-[#a3a3a3]">
                    <div>{customer.email}</div>
                    <div className="text-xs text-[#737373]">{customer.phone}</div>
                  </td>
                  <td className="p-4 text-white">{customer.orders}</td>
                  <td className="p-4 font-medium text-[#d2f000]">{customer.spent}</td>
                  <td className="p-4 text-[#737373] text-xs">{customer.lastOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center text-[#737373]">
            <span className="material-symbols-outlined text-4xl mb-2 text-[#737373]">group</span>
            <p className="text-white text-base font-medium">No customers found</p>
            <p className="text-xs text-[#737373] mt-1">Customer profiles will automatically appear here once orders are placed or leads sign up.</p>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Orders', href: '/admin/orders', icon: 'receipt_long' },
  { label: 'Products', href: '/admin/products', icon: 'inventory_2' },
  { label: 'Categories', href: '/admin/categories', icon: 'category' },
  { label: 'Collections', href: '/admin/collections', icon: 'collections_bookmark' },
  { label: 'Homepage', href: '/admin/homepage', icon: 'home' },
  { label: 'Media', href: '/admin/media', icon: 'image' },
  { label: 'Customers', href: '/admin/customers', icon: 'people' },
  { label: 'Inventory', href: '/admin/inventory', icon: 'warehouse' },
  { label: 'Discounts', href: '/admin/discounts', icon: 'sell' },
  { label: 'Settings', href: '/admin/settings', icon: 'settings' },
  { label: 'Activity', href: '/admin/activity', icon: 'history' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(!isLoginPage);
  const [prevIsLoginPage, setPrevIsLoginPage] = useState(isLoginPage);

  // Re-arm the session check when moving between the login page and the admin shell
  if (prevIsLoginPage !== isLoginPage) {
    setPrevIsLoginPage(isLoginPage);
    setIsCheckingAuth(!isLoginPage);
  }

  // Strict session verification: once per mount and again after login (not on every navigation)
  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    let cancelled = false;
    const token = localStorage.getItem('adminToken');
    if (!token) {
      router.push('/admin/login');
      return;
    }

    const rejectSession = () => {
      localStorage.removeItem('adminToken');
      router.push('/admin/login');
    };

    // Validate token with backend /api/admin/me
    fetch('/api/admin/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (cancelled) return;
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && data?.success) {
          // Authenticated successfully
          setIsCheckingAuth(false);
        } else if (res.status === 401 || res.status === 403 || res.ok) {
          // Invalid / expired session
          rejectSession();
        } else {
          // Server error: never trust the token without a successful check
          router.push('/admin/login');
        }
      })
      .catch(() => {
        // Network failure: the session could not be verified, so send the admin back to login
        if (!cancelled) router.push('/admin/login');
      });

    return () => {
      cancelled = true;
    };
  }, [router, isLoginPage]);

  // If on login page, don't show the dashboard shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Show loading indicator while checking session
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#d2f000] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-mono text-xs uppercase tracking-widest text-[#737373]">Verifying Admin Session...</p>
      </div>
    );
  }

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#a3a3a3] font-sans flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#141414] border-r border-[#262626] transform transition-transform duration-200 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } flex flex-col`}
      >
        <div className="h-16 flex items-center px-6 border-b border-[#262626]">
          <h1 className="text-white font-bold text-xl tracking-wider">CLAP ADMIN</h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-[#d2f000]/10 text-[#d2f000]'
                        : 'hover:bg-[#262626] hover:text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {item.icon}
                    </span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-[#262626]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-8 h-8 rounded-full bg-[#d2f000] text-black font-bold flex items-center justify-center">
              A
            </div>
            <div>
              <p className="text-sm text-white font-medium">Admin User</p>
              <p className="text-xs text-[#737373]">Administrator</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen md:ml-64">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-[#0a0a0a]/80 backdrop-blur-sm border-b border-[#262626] sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 text-[#a3a3a3] hover:text-white"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="text-white text-lg font-medium capitalize">
              {pathname.split('/').pop() || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/admin/notifications" className="relative p-2 text-[#a3a3a3] hover:text-white">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#d2f000] rounded-full"></span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {children}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}

/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart/CartProvider';
import { useOrderStore, CheckoutInfo } from '@/lib/store';
import { formatCurrency, resolveImageUrl } from '@/lib/utils';
import Link from 'next/link';

interface CountryCode {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  digits: number;
  regex: RegExp;
  placeholder: string;
}

const COUNTRY_CODES: CountryCode[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', dialCode: '+91', digits: 10, regex: /^[6-9]\d{9}$/, placeholder: '9876543210' },
  { code: 'US', name: 'United States', flag: '🇺🇸', dialCode: '+1', digits: 10, regex: /^\d{10}$/, placeholder: '5550000000' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', dialCode: '+44', digits: 10, regex: /^\d{10}$/, placeholder: '7123456789' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', dialCode: '+971', digits: 9, regex: /^\d{9}$/, placeholder: '501234567' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', dialCode: '+1', digits: 10, regex: /^\d{10}$/, placeholder: '5550000000' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', dialCode: '+61', digits: 9, regex: /^\d{9}$/, placeholder: '412345678' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', dialCode: '+65', digits: 8, regex: /^\d{8}$/, placeholder: '81234567' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', dialCode: '+966', digits: 9, regex: /^\d{9}$/, placeholder: '512345678' },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi (NCT)', 'Jammu & Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh'
];

export default function CheckoutPage() {
  const { items, getCartTotal, getShippingFee } = useCart();
  const { createOrder, checkoutInfo, setCheckoutInfo } = useOrderStore();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  
  // Custom State Dropdown State
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');

  const countryDropdownRef = useRef<HTMLDivElement>(null);
  const stateDropdownRef = useRef<HTMLDivElement>(null);

  // Form State
  const [form, setForm] = useState<CheckoutInfo>({
    fullName: checkoutInfo.fullName || '',
    email: checkoutInfo.email || '',
    phone: checkoutInfo.phone || '',
    address: checkoutInfo.address || '',
    apartment: checkoutInfo.apartment || '',
    city: checkoutInfo.city || '',
    state: checkoutInfo.state || '',
    pincode: checkoutInfo.pincode || '',
  });

  const subtotal = getCartTotal();
  const shippingInfo = getShippingFee();
  const shipping = shippingInfo.fee;
  const total = subtotal + shipping;

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
      if (stateDropdownRef.current && !stateDropdownRef.current.contains(event.target as Node)) {
        setIsStateDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateField = (field: keyof CheckoutInfo, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handlePhoneChange = (val: string) => {
    // Strictly restrict to digits only and max length for the selected country
    const digitsOnly = val.replace(/\D/g, '').slice(0, selectedCountry.digits);
    updateField('phone', digitsOnly);

    // Dynamic error feedback as user types
    if (digitsOnly.length > 0 && digitsOnly.length !== selectedCountry.digits) {
      setErrors((prev) => ({
        ...prev,
        phone: `Mobile number for ${selectedCountry.name} must be exactly ${selectedCountry.digits} digits (currently ${digitsOnly.length})`,
      }));
    } else if (digitsOnly.length === selectedCountry.digits && !selectedCountry.regex.test(digitsOnly)) {
      setErrors((prev) => ({
        ...prev,
        phone: selectedCountry.code === 'IN' 
          ? 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9'
          : `Invalid ${selectedCountry.name} mobile number structure`,
      }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Full Name
    if (!form.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    // 2. Strict Email Validation (RFC 5322 Standard)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!form.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!emailRegex.test(form.email.trim())) {
      newErrors.email = 'Please enter a valid email address (e.g. name@domain.com)';
    }

    // 3. Strict Country-Specific Phone Validation & Length Check
    const cleanPhone = form.phone.replace(/\D/g, '');
    if (!cleanPhone) {
      newErrors.phone = 'Mobile number is required';
    } else if (cleanPhone.length !== selectedCountry.digits) {
      newErrors.phone = `Mobile number for ${selectedCountry.name} must be exactly ${selectedCountry.digits} digits (you entered ${cleanPhone.length} digits)`;
    } else if (!selectedCountry.regex.test(cleanPhone)) {
      newErrors.phone = selectedCountry.code === 'IN' 
        ? 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9'
        : `Invalid ${selectedCountry.name} mobile number structure`;
    }

    // 4. Address & Location
    if (!form.address.trim()) newErrors.address = 'Street address is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.state) newErrors.state = 'Please select a state';
    
    // 5. PIN Code Validation (6 digits for India)
    if (!form.pincode.trim()) {
      newErrors.pincode = 'PIN code is required';
    } else if (!/^\d{6}$/.test(form.pincode.trim())) {
      newErrors.pincode = 'Enter a valid 6-digit PIN code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    
    // Format full phone with dial code
    const fullPhone = `${selectedCountry.dialCode} ${form.phone.trim()}`;
    const updatedForm = { ...form, phone: fullPhone };

    setCheckoutInfo(updatedForm);

    // Reserve a unique order number. There is deliberately no client-side fallback:
    // a made-up number is shared by every shopper it is given to.
    let nextOrderId = '';
    try {
      const res = await fetch('/api/orders/next-id', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && json.success && json.data?.orderId) {
        nextOrderId = String(json.data.orderId).replace('#', '');
      } else {
        setErrors({ form: json.error || 'We could not start your checkout. Please try again in a minute.' });
      }
    } catch {
      setErrors({ form: 'Network error. Please check your connection and try again.' });
    }
    if (!nextOrderId) {
      setLoading(false);
      return;
    }

    // Save order data in client store & local storage for payment completion
    createOrder(nextOrderId, items, subtotal, shipping, updatedForm);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`cc_order_${nextOrderId}`, JSON.stringify({
          orderId: nextOrderId,
          customer: updatedForm,
          items: items,
          subtotal: subtotal,
          shipping: shipping,
          total: subtotal + shipping,
          paymentStatus: 'PENDING',
          orderStatus: 'PLACED',
        }));
      } catch {}
    }

    router.push(`/payment/${nextOrderId}`);
  };

  const filteredStates = INDIAN_STATES.filter((s) =>
    s.toLowerCase().includes(stateSearchQuery.toLowerCase())
  );

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-deep-black text-white flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">shopping_cart</span>
        <p className="mb-4 font-headline-md text-2xl uppercase">No items to checkout</p>
        <Link href="/cart" className="text-electric-lime underline font-label-caps">Back to Cart</Link>
      </div>
    );
  }

  const inputClass = (field: string) =>
    `w-full bg-charcoal border ${errors[field] ? 'border-red-500' : 'border-gray-700'} p-4 text-white focus:outline-none focus:border-electric-lime transition-colors`;

  return (
    <div className="min-h-screen bg-deep-black text-white pt-24 pb-12 px-4 md:px-8 max-w-[1920px] mx-auto">
      <div className="text-center mb-8">
        <h1 className="font-headline-xl text-5xl md:text-6xl uppercase">CHECKOUT</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-12 max-w-6xl mx-auto">
        {/* Form */}
        <div className="grow">
          <form onSubmit={handleSubmit} className="space-y-12">
            
            {/* Contact Info */}
            <div>
              <h2 className="font-headline-md text-2xl mb-6 border-b border-charcoal pb-2">CONTACT INFORMATION</h2>
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Full Name *"
                    value={form.fullName}
                    onChange={(e) => updateField('fullName', e.target.value)}
                    className={inputClass('fullName')}
                  />
                  {errors.fullName && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.fullName}</p>}
                </div>

                {/* Email Field with Strict Validation */}
                <div>
                  <input
                    type="email"
                    placeholder="Email Address *"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className={inputClass('email')}
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.email}</p>}
                </div>

                {/* Country Dropdown + Phone Input with Strict Digit Enforcement */}
                <div>
                  <label className="block text-xs font-label-caps text-gray-400 mb-1">
                    MOBILE NUMBER ({selectedCountry.digits} DIGITS REQUIRED) *
                  </label>
                  <div className="flex gap-2 relative" ref={countryDropdownRef}>
                    {/* Country Code Dropdown Button */}
                    <button
                      type="button"
                      onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                      className="bg-charcoal border border-gray-700 px-3 py-4 flex items-center gap-2 hover:border-electric-lime transition-colors shrink-0 min-w-27.5"
                    >
                      <span className="text-xl">{selectedCountry.flag}</span>
                      <span className="font-bold text-sm text-white">{selectedCountry.dialCode}</span>
                      <span className="material-symbols-outlined text-sm text-gray-400">arrow_drop_down</span>
                    </button>

                    {/* Country Code Menu */}
                    {isCountryDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-64 bg-soft-charcoal border border-charcoal rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                        {COUNTRY_CODES.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setSelectedCountry(c);
                              setIsCountryDropdownOpen(false);
                              handlePhoneChange(form.phone);
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3 hover:bg-[#262626] transition-colors text-left ${
                              selectedCountry.code === c.code ? 'bg-[#262626] text-electric-lime font-bold' : 'text-gray-300'
                            }`}
                          >
                            <span className="flex items-center gap-2 text-sm">
                              <span className="text-lg">{c.flag}</span> {c.name}
                            </span>
                            <span className="font-mono text-xs text-gray-400">{c.dialCode} ({c.digits}d)</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Phone Number Input with MaxLength Restraint */}
                    <input
                      type="tel"
                      placeholder={selectedCountry.placeholder}
                      value={form.phone}
                      maxLength={selectedCountry.digits}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className={inputClass('phone')}
                    />
                  </div>
                  {errors.phone && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div>
              <h2 className="font-headline-md text-2xl mb-6 border-b border-charcoal pb-2">DELIVERY ADDRESS</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Address *"
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className={inputClass('address')}
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.address}</p>}
                </div>

                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Apartment, suite, house no. (optional)"
                    value={form.apartment}
                    onChange={(e) => updateField('apartment', e.target.value)}
                    className={inputClass('apartment')}
                  />
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="City *"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className={inputClass('city')}
                  />
                  {errors.city && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.city}</p>}
                </div>

                {/* Custom Interactive State Dropdown */}
                <div className="relative" ref={stateDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsStateDropdownOpen(!isStateDropdownOpen)}
                    className={`w-full bg-charcoal border ${errors.state ? 'border-red-500' : 'border-gray-700'} p-4 text-left flex justify-between items-center transition-colors ${
                      form.state ? 'text-white font-medium' : 'text-gray-500'
                    }`}
                  >
                    <span>{form.state || 'Select State *'}</span>
                    <span className={`material-symbols-outlined transition-transform duration-200 ${isStateDropdownOpen ? 'rotate-180 text-electric-lime' : 'text-gray-400'}`}>
                      keyboard_arrow_down
                    </span>
                  </button>

                  {/* Custom Glassmorphic State Dropdown Menu */}
                  {isStateDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-soft-charcoal border border-charcoal rounded-lg shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
                      <div className="p-3 border-b border-charcoal sticky top-0 bg-soft-charcoal">
                        <input
                          type="text"
                          placeholder="Search State..."
                          value={stateSearchQuery}
                          onChange={(e) => setStateSearchQuery(e.target.value)}
                          className="w-full bg-[#242424] border border-gray-700 px-3 py-2 text-xs text-white focus:outline-none focus:border-electric-lime"
                        />
                      </div>
                      
                      <div className="max-h-56 overflow-y-auto hide-scrollbar divide-y divide-charcoal/40">
                        {filteredStates.length > 0 ? (
                          filteredStates.map((stateName) => (
                            <button
                              key={stateName}
                              type="button"
                              onClick={() => {
                                updateField('state', stateName);
                                setIsStateDropdownOpen(false);
                                setStateSearchQuery('');
                              }}
                              className={`w-full text-left px-4 py-3 text-sm hover:bg-[#262626] hover:text-electric-lime transition-colors ${
                                form.state === stateName ? 'bg-[#262626] text-electric-lime font-bold' : 'text-gray-300'
                              }`}
                            >
                              {stateName}
                            </button>
                          ))
                        ) : (
                          <div className="p-4 text-center text-xs text-gray-500">No states found</div>
                        )}
                      </div>
                    </div>
                  )}

                  {errors.state && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.state}</p>}
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="PIN Code *"
                    value={form.pincode}
                    onChange={(e) => updateField('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className={inputClass('pincode')}
                    maxLength={6}
                  />
                  {errors.pincode && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.pincode}</p>}
                </div>
              </div>
            </div>

            {errors.form && (
              <p className="text-red-500 text-sm font-semibold border border-red-500/40 bg-red-500/10 p-3">{errors.form}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-electric-lime text-black font-headline-md text-xl py-5 uppercase transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-white'}`}
            >
              {loading ? 'PROCESSING...' : 'CONTINUE TO PAYMENT'}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-112.5 shrink-0">
          <div className="bg-charcoal p-6 sticky top-24">
            <h2 className="font-headline-md text-2xl mb-6 uppercase border-b border-gray-700 pb-4">ORDER SUMMARY</h2>
            
            <div className="space-y-4 mb-6 max-h-[40vh] overflow-y-auto hide-scrollbar pr-2">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="w-16 h-20 bg-gray-900 relative shrink-0 border border-gray-700">
                    <img src={resolveImageUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                    <span className="absolute -top-2 -right-2 bg-gray-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full z-10">{item.quantity}</span>
                  </div>
                  <div className="grow flex flex-col justify-center">
                    <span className="font-bold text-sm uppercase line-clamp-1">{item.name}</span>
                    <span className="text-gray-400 text-xs">SIZE: {item.size}</span>
                  </div>
                  <div className="font-bold text-sm flex items-center">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-3 mb-6 text-sm border-t border-gray-700 pt-6">
              <div className="flex justify-between text-gray-300">
                <span>SUBTOTAL</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>SHIPPING</span>
                <span>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center border-t border-gray-700 pt-4">
              <span className="font-bold text-xl uppercase">TOTAL</span>
              <span className="font-bold text-3xl text-electric-lime">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

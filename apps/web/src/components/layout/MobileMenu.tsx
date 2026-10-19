'use client';

import React from 'react';
import Link from 'next/link';
import { useStarCollections } from '@/lib/use-api-data';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const starCollections = useStarCollections();

  const links = [
    { label: 'HOME', href: '/' },
    { label: 'SHOP ALL', href: '/shop' },
    { label: 'COLLECTIONS', href: '/collections' },
    { label: 'NEW DROPS', href: '/collections/new-drop' },
    { label: 'ABOUT', href: '/about' },
    { label: 'CONTACT', href: '/contact' },
    { label: 'FAQ', href: '/faq' },
    { label: 'TRACK ORDER', href: '/track-order' },
  ];

  return (
    <div 
      className={`fixed inset-0 bg-deep-black z-100 transition-all duration-500 ease-in-out flex flex-col ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
    >
      <div className="flex items-center justify-between p-4 md:p-8 border-b border-charcoal">
        <div className="text-2xl font-headline-md text-white tracking-wider">
          CLAPCULTURE
        </div>
        <button 
          onClick={onClose}
          className="text-white hover:text-electric-lime transition-colors"
        >
          <span className="material-symbols-outlined text-3xl">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col justify-start">
        <nav className="flex flex-col gap-4 mb-6">
          {links.map((link) => (
            <Link 
              key={link.label} 
              href={link.href}
              onClick={onClose}
              className="text-3xl md:text-5xl font-headline-xl uppercase text-white hover:text-electric-lime transition-colors w-fit"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Star Collection Fast Links */}
        <div className="pt-4 border-t border-charcoal/60">
          <span className="text-[11px] font-label-caps text-electric-lime uppercase tracking-widest block mb-2 font-bold">
            STAR EDITIONS
          </span>
          <div className="grid grid-cols-2 gap-2">
            {starCollections.map((hero) => (
              <Link
                key={hero.slug}
                href={`/shop?star=${hero.slug}`}
                onClick={onClose}
                className="bg-[#141414] hover:bg-[#202020] border border-charcoal hover:border-electric-lime/40 rounded p-2 text-xs font-headline-md text-gray-200 hover:text-electric-lime transition-all"
              >
                {hero.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 md:p-8 border-t border-charcoal mt-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            <a href="#" className="text-gray-400 hover:text-electric-lime transition-colors">IG</a>
            <a href="#" className="text-gray-400 hover:text-electric-lime transition-colors">X</a>
            <a href="#" className="text-gray-400 hover:text-electric-lime transition-colors">TT</a>
            <a href="#" className="text-gray-400 hover:text-electric-lime transition-colors">YT</a>
          </div>
        </div>

        {/* Developer Credit Footer */}
        <div className="text-[11px] font-label-caps text-gray-500 uppercase tracking-widest text-center pt-2 border-t border-charcoal/40">
          Design and developed by <a href="https://onemario.com" target="_blank" rel="noopener noreferrer" className="text-electric-lime font-bold hover:underline">One Mario</a>
        </div>
      </div>
    </div>
  );
}

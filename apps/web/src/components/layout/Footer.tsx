import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-deep-black border-t border-charcoal py-12 md:py-16 px-4 md:px-8 lg:px-12 2xl:px-16 w-full">
      <div className="max-w-[3840px] mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 md:gap-12 mb-12 md:mb-16">
          <div className="lg:col-span-2">
            <Link href="/" className="text-3xl md:text-4xl 2xl:text-6xl font-headline-md text-white tracking-wider mb-4 md:mb-6 inline-block">
              CLAPCULTURE
            </Link>
            <p className="text-gray-400 text-xs md:text-sm 2xl:text-base max-w-sm mb-6">
              Redefining streetwear for the modern rebel. High-quality apparel designed to make a statement.
            </p>
            <div className="flex items-center gap-3">
              {/* Instagram Official Logo */}
              <a
                href="https://www.instagram.com/clapculture_"
                target="_blank"
                rel="noopener noreferrer"
                title="Follow us on Instagram (@clapculture_)"
                className="flex items-center gap-2 text-xs text-gray-300 hover:text-white hover:border-pink-500 font-mono transition-all bg-[#141414] hover:bg-[#E1306C]/10 border border-gray-800 px-3.5 py-2 rounded-lg group"
              >
                <svg className="w-4 h-4 text-pink-500 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span>@clapculture_</span>
              </a>

              {/* WhatsApp Official Logo */}
              <a
                href="https://wa.me/917569684299?text=Hi%20CLAPCULTURE%20Team"
                target="_blank"
                rel="noopener noreferrer"
                title="Chat on WhatsApp (+91 7569684299)"
                className="flex items-center gap-2 text-xs text-gray-300 hover:text-white hover:border-[#25D366] font-mono transition-all bg-[#141414] hover:bg-[#25D366]/10 border border-gray-800 px-3.5 py-2 rounded-lg group"
              >
                <svg className="w-4 h-4 text-[#25D366] group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.301-.15-1.777-.877-2.052-.977-.276-.1-.476-.15-.677.15-.2.3-.777.977-.952 1.177-.175.2-.351.225-.651.075-.301-.15-1.27-.468-2.42-1.493-.895-.798-1.5-1.784-1.676-2.085-.175-.3-.019-.462.132-.612.136-.135.301-.35.451-.525.15-.175.2-.3.3-.5.1-.2.05-.375-.025-.525-.075-.15-.677-1.633-.928-2.235-.244-.588-.493-.508-.677-.518-.175-.008-.376-.01-.577-.01-.201 0-.527.075-.803.375-.276.3-1.053 1.028-1.053 2.508s1.078 2.909 1.229 3.109c.15.2 2.122 3.24 5.141 4.544.718.31 1.279.496 1.716.634.721.23 1.378.197 1.9.12.581-.087 1.777-.727 2.028-1.428.251-.701.251-1.302.175-.142-.075-.125-.276-.2-.577-.35zm-5.466 7.618c-2.02 0-3.99-.54-5.714-1.564l-.409-.243-4.247 1.114 1.133-4.14-.267-.424c-1.125-1.79-1.722-3.864-1.722-5.993 0-6.196 5.04-11.236 11.238-11.236 3.003 0 5.827 1.17 7.95 3.293 2.123 2.124 3.292 4.947 3.292 7.951 0 6.197-5.041 11.242-11.244 11.242zm9.605-18.847c-2.565-2.567-5.976-3.981-9.605-3.981-7.48 0-13.567 6.088-13.567 13.57 0 2.392.624 4.728 1.81 6.784l-1.925 7.028 7.195-1.887c1.989 1.084 4.237 1.656 6.527 1.656 7.481 0 13.569-6.089 13.569-13.572 0-3.628-1.414-7.04-3.981-9.607z"/>
                </svg>
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider mb-4 md:mb-6 text-white text-xs md:text-sm 2xl:text-base">SHOP</h4>
            <ul className="space-y-3 md:space-y-4 text-xs md:text-sm 2xl:text-base text-gray-400">
              <li><Link href="/shop" className="hover:text-electric-lime transition-colors">All Products</Link></li>
              <li><Link href="/collections/hoodies" className="hover:text-electric-lime transition-colors">Hoodies</Link></li>
              <li><Link href="/collections/t-shirts" className="hover:text-electric-lime transition-colors">T-Shirts</Link></li>
              <li><Link href="/collections/bottoms" className="hover:text-electric-lime transition-colors">Bottoms</Link></li>
              <li><Link href="/collections/accessories" className="hover:text-electric-lime transition-colors">Accessories</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider mb-4 md:mb-6 text-white text-xs md:text-sm 2xl:text-base">COMPANY</h4>
            <ul className="space-y-3 md:space-y-4 text-xs md:text-sm 2xl:text-base text-gray-400">
              <li><Link href="/about" className="hover:text-electric-lime transition-colors">About Us</Link></li>
              <li><Link href="/our-story" className="hover:text-electric-lime transition-colors">Our Story</Link></li>
              <li><Link href="/careers" className="hover:text-electric-lime transition-colors">Careers</Link></li>
              <li><Link href="/sustainability" className="hover:text-electric-lime transition-colors">Sustainability</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider mb-4 md:mb-6 text-white text-xs md:text-sm 2xl:text-base">HELP</h4>
            <ul className="space-y-3 md:space-y-4 text-xs md:text-sm 2xl:text-base text-gray-400">
              <li><Link href="/faq" className="hover:text-electric-lime transition-colors">FAQ</Link></li>
              <li><Link href="/shipping" className="hover:text-electric-lime transition-colors">Shipping Info</Link></li>
              <li><Link href="/returns" className="hover:text-electric-lime transition-colors">Returns &amp; Exchanges</Link></li>
              <li><Link href="/track-order" className="hover:text-electric-lime transition-colors">Track Order</Link></li>
              <li><Link href="/contact" className="hover:text-electric-lime transition-colors">Contact Us</Link></li>
              <li>
                <a 
                  href="https://wa.me/917569684299?text=Hi%20CLAPCULTURE%20Team%2C%20I%20need%20assistance." 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1.5 text-[#25D366] hover:underline font-mono"
                >
                  <span>WhatsApp: +91 7569684299</span>
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider mb-4 md:mb-6 text-white text-xs md:text-sm 2xl:text-base">LEGAL</h4>
            <ul className="space-y-3 md:space-y-4 text-xs md:text-sm 2xl:text-base text-gray-400">
              <li><Link href="/terms" className="hover:text-electric-lime transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link href="/privacy" className="hover:text-electric-lime transition-colors">Privacy Policy</Link></li>
              <li><Link href="/refund-policy" className="hover:text-electric-lime transition-colors">Refund Policy</Link></li>
              <li><Link href="/cookie-policy" className="hover:text-electric-lime transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col-reverse md:flex-row items-center justify-between pt-6 md:pt-8 border-t border-charcoal gap-6 text-center md:text-left">
          <div className="text-gray-500 text-[10px] md:text-xs 2xl:text-sm">
            &copy; {new Date().getFullYear()} CLAPCULTURE. All rights reserved. &bull; Designed &amp; Developed by <a href="https://onemario.com" target="_blank" rel="noopener noreferrer" className="text-electric-lime hover:underline font-bold">One Mario</a>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
            <span className="text-[10px] md:text-xs 2xl:text-sm text-gray-400 uppercase font-bold mr-0 sm:mr-2">WE ACCEPT:</span>
            <div className="flex flex-wrap justify-center gap-2">
              <div className="bg-white/10 px-2 py-1 rounded text-[9px] md:text-[10px] 2xl:text-xs font-bold">VISA</div>
              <div className="bg-white/10 px-2 py-1 rounded text-[9px] md:text-[10px] 2xl:text-xs font-bold">MC</div>
              <div className="bg-white/10 px-2 py-1 rounded text-[9px] md:text-[10px] 2xl:text-xs font-bold">UPI</div>
              <div className="bg-white/10 px-2 py-1 rounded text-[9px] md:text-[10px] 2xl:text-xs font-bold">PAYTM</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

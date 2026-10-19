/* eslint-disable @next/next/no-img-element */
import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'About Us | CLAPCULTURE',
  description: 'The story behind CLAPCULTURE, premium maximalist streetwear.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-deep-black text-white">
      {/* Hero */}
      <div className="relative w-full h-[60vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-charcoal">
          <img src="/herobg1-desktop.png" alt="About ClapCulture" className="w-full h-full object-cover opacity-40 grayscale" />
        </div>
        <div className="relative z-10 text-center px-4">
          <h1 className="font-headline-xl text-6xl md:text-9xl uppercase text-electric-lime mix-blend-screen">WE ARE CLAPCULTURE</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-24 space-y-24">
        {/* Story */}
        <section>
          <h2 className="font-headline-md text-4xl mb-6 uppercase border-b border-charcoal pb-4">OUR STORY</h2>
          <div className="font-body-sm text-gray-300 space-y-4 leading-relaxed text-lg text-justify">
            <p>
              Born in the vibrant streets of Hyderabad, CLAPCULTURE isn&apos;t just a clothing brand—it&apos;s a movement. 
              We fuse the rebellious spirit of global streetwear with the unapologetic swagger of Tollywood cinema.
            </p>
            <p>
              Our maximalist aesthetic isn&apos;t for the faint of heart. We believe in bold graphics, oversized silhouettes, 
              and premium materials that stand the test of time. Every piece is a statement.
            </p>
          </div>
        </section>

        {/* Values */}
        <section>
          <h2 className="font-headline-md text-4xl mb-8 uppercase border-b border-charcoal pb-4">OUR VALUES</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-charcoal p-8 border border-gray-800 hover:border-electric-lime transition-colors">
              <span className="material-symbols-outlined text-4xl text-electric-lime mb-4">diamond</span>
              <h3 className="font-headline-md text-2xl uppercase mb-2">PREMIUM QUALITY</h3>
              <p className="text-gray-400 text-sm">Heavyweight cottons, custom cuts, and durable prints. We don&apos;t compromise.</p>
            </div>
            <div className="bg-charcoal p-8 border border-gray-800 hover:border-electric-lime transition-colors">
              <span className="material-symbols-outlined text-4xl text-electric-lime mb-4">local_fire_department</span>
              <h3 className="font-headline-md text-2xl uppercase mb-2">MAXIMALIST AESTHETIC</h3>
              <p className="text-gray-400 text-sm">Loud, proud, and in your face. Our designs are meant to be seen.</p>
            </div>
            <div className="bg-charcoal p-8 border border-gray-800 hover:border-electric-lime transition-colors">
              <span className="material-symbols-outlined text-4xl text-electric-lime mb-4">public</span>
              <h3 className="font-headline-md text-2xl uppercase mb-2">CULTURE FIRST</h3>
              <p className="text-gray-400 text-sm">Rooted in local culture, designed for a global stage.</p>
            </div>
          </div>
        </section>

        <div className="text-center">
          <Link href="/shop" className="inline-block bg-electric-lime text-black font-headline-md text-2xl px-12 py-5 uppercase hover:bg-white transition-colors">
            JOIN THE MOVEMENT
          </Link>
        </div>
      </div>
    </div>
  );
}

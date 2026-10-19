import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Terms & Conditions | CLAPCULTURE',
  description: 'Official Terms & Conditions governing your use of CLAPCULTURE and product purchases.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-deep-black text-white pt-28 md:pt-36 pb-24 px-4 md:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="border-b border-charcoal pb-8 mb-10">
          <div className="inline-block bg-electric-lime text-deep-black font-label-caps text-[10px] md:text-xs px-2.5 py-1 mb-4 rounded-sm uppercase font-bold tracking-wider">
            LEGAL AGREEMENT
          </div>
          <h1 className="font-headline-xl text-4xl sm:text-5xl md:text-7xl uppercase tracking-wider text-white mb-2">
            TERMS &amp; CONDITIONS
          </h1>
          <p className="text-gray-400 text-xs md:text-sm font-mono">
            CLAPCULTURE &bull; Last Updated: 16 August 2026
          </p>
        </div>

        <div className="space-y-10 font-body-sm text-gray-300 leading-relaxed">
          {/* Welcome Intro */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <p className="mb-4">
              Welcome to <strong className="text-white">CLAPCULTURE</strong>. These Terms &amp; Conditions (&ldquo;Terms&rdquo;, &ldquo;Terms and Conditions&rdquo;) govern your access to and use of the CLAPCULTURE website (<strong className="text-electric-lime">https://clapculture.com/</strong>) and your purchase of products from us.
            </p>
            <p className="text-gray-400 text-xs md:text-sm">
              By accessing our website, browsing our products, creating an account, placing an order, or making a purchase, you agree to be bound by these Terms.
            </p>
          </section>

          {/* 1. About */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">01.</span> ABOUT CLAPCULTURE
            </h2>
            <p className="mb-3">
              CLAPCULTURE is an online streetwear and lifestyle merchandise brand offering premium apparel, accessories, and drops through its platform.
            </p>
            <p>
              Our products feature original creative designs inspired by pop culture, cinema, music, and entertainment themes. All product descriptions, specifications, prices, and availability are subject to change without notice.
            </p>
          </section>

          {/* 2. Eligibility & Website Use */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">02.</span> ELIGIBILITY &amp; ACCEPTABLE USE
            </h2>
            <p className="mb-4">
              By placing an order, you represent that you are legally capable of entering into binding agreements and that all information you provide is accurate and complete.
            </p>
            <p className="text-white font-semibold mb-2">You agree not to:</p>
            <ul className="list-disc list-inside space-y-1.5 text-xs md:text-sm text-gray-300">
              <li>Use the website for fraudulent, unlawful, or unauthorized purchases;</li>
              <li>Scrape, copy, or reproduce site content, designs, or graphics without written permission;</li>
              <li>Interfere with the platform&apos;s security, operations, or databases;</li>
              <li>Impersonate CLAPCULTURE personnel or create fraudulent customer accounts.</li>
            </ul>
          </section>

          {/* 3. Products & Pricing */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">03.</span> PRODUCTS, PRICING &amp; ORDERS
            </h2>
            <p className="mb-3">
              All prices are listed in Indian Rupees (INR). We make reasonable efforts to display product colors, fits, and dimensions accurately, subject to minor device screen and manufacturing tolerances.
            </p>
            <p>
              An order is accepted only when confirmed and verified by CLAPCULTURE. We reserve the right to cancel or refuse orders in cases of pricing errors, payment failures, stock exhaustion, or suspected fraudulent activity.
            </p>
          </section>

          {/* 4. Payment Terms & Fraud Notice */}
          <section className="bg-linear-to-r from-red-950/40 via-[#1a1414] to-red-950/40 border-2 border-red-500/60 rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-red-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span>🚨</span> 04. OFFICIAL PAYMENT NOTICE &amp; FRAUD WARNING
            </h2>
            <p className="mb-4 text-gray-300">
              For direct UPI payments, customers must verify the designated official payment destination before completing transactions.
            </p>
            <div className="bg-black/60 border border-red-500/30 rounded-lg p-4 mb-4">
              <span className="text-xs text-gray-400 font-mono uppercase block mb-1">Official CLAPCULTURE UPI ID:</span>
              <span className="text-lg md:text-xl font-mono font-bold text-electric-lime select-all">
                8639654299@ybl
              </span>
              <span className="text-xs text-gray-400 block mt-1">Designated merchant collection via UPI</span>
            </div>
            <p className="text-xs md:text-sm text-gray-300 mb-3">
              CLAPCULTURE is responsible only for payment instructions officially provided through our authorized checkout portal. Do NOT transfer money to any other personal UPI handle, phone number, or unverified QR code.
            </p>
            <p className="text-red-400 font-bold text-xs uppercase tracking-wider">
              🛑 Never share your UPI PIN, OTP, CVV, or passwords with anyone claiming to represent CLAPCULTURE.
            </p>
          </section>

          {/* 5. Shipping & Delivery */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">05.</span> SHIPPING &amp; DELIVERY
            </h2>
            <p className="mb-3">
              We deliver to serviceable PIN codes across India. Estimated delivery times are indicative and may vary based on location, courier performance, and public holidays.
            </p>
            <p className="text-gray-400 text-sm">
              Customers must ensure that their delivery address and mobile contact number are complete and accurate.
            </p>
          </section>

          {/* 6. Returns & Refunds */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">06.</span> RETURNS, EXCHANGES &amp; REFUNDS
            </h2>
            <p className="mb-3">
              Because items are custom printed and packed specifically for each customer, we do not accept returns or exchanges for change of mind or customer size selection error.
            </p>
            <p className="mb-3">
              Refunds are strictly applicable only for verified transit damage, manufacturing defects, or wrong items supplied, as set out in our <Link href="/refund-policy" className="text-electric-lime underline font-bold">Refund Policy</Link>.
            </p>
            <p className="text-amber-400 text-xs font-semibold">
              ⚠️ Do not return parcels without official written return authorization from CLAPCULTURE.
            </p>
          </section>

          {/* 7. Intellectual Property */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">07.</span> INTELLECTUAL PROPERTY
            </h2>
            <p>
              All trademarks, logos, graphical artwork, photographs, product names, site layouts, and promotional copy on the CLAPCULTURE website are protected by applicable intellectual property laws and remain the exclusive property of CLAPCULTURE or its licensors.
            </p>
          </section>

          {/* 8. Limitation of Liability & Governing Law */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">08.</span> GOVERNING LAW &amp; JURISDICTION
            </h2>
            <p className="mb-3">
              These Terms and Conditions shall be governed by and interpreted under the laws of India.
            </p>
            <p className="text-gray-400 text-sm">
              Any dispute arising out of or related to these Terms or purchases shall be subject to the exclusive jurisdiction of the competent courts in Hyderabad, Telangana, India.
            </p>
          </section>

          {/* 9. Contact */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">09.</span> GRIEVANCE &amp; CUSTOMER SUPPORT
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono text-gray-300">
              <div>
                <span className="text-xs text-gray-500 block uppercase">Brand:</span>
                <span className="text-white font-bold">CLAPCULTURE, Hyderabad, India</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block uppercase">Official Email:</span>
                <a href="mailto:clapcultureofficial@gmail.com" className="text-electric-lime underline">
                  clapcultureofficial@gmail.com
                </a>
              </div>
              <div>
                <span className="text-xs text-gray-500 block uppercase">WhatsApp Support:</span>
                <a href="https://wa.me/917569684299" target="_blank" rel="noopener noreferrer" className="text-white underline">
                  +91 7569684299
                </a>
              </div>
              <div>
                <span className="text-xs text-gray-500 block uppercase">Official Website:</span>
                <Link href="/" className="text-white underline">
                  https://clapculture.com/
                </Link>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 text-center text-xs text-gray-500 font-mono">
          &copy; 2026 CLAPCULTURE. All rights reserved.
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Refund, Return & Exchange Policy | CLAPCULTURE',
  description: 'Official Refund, Return & Exchange Policy for CLAPCULTURE.',
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-deep-black text-white pt-28 md:pt-36 pb-24 px-4 md:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto">
        {/* Header Header */}
        <div className="border-b border-charcoal pb-8 mb-10">
          <div className="inline-block bg-electric-lime text-deep-black font-label-caps text-[10px] md:text-xs px-2.5 py-1 mb-4 rounded-sm uppercase font-bold tracking-wider">
            OFFICIAL POLICY
          </div>
          <h1 className="font-headline-xl text-4xl sm:text-5xl md:text-7xl uppercase tracking-wider text-white mb-2">
            REFUND, RETURN &amp; EXCHANGE POLICY
          </h1>
          <p className="text-gray-400 text-xs md:text-sm font-mono">
            CLAPCULTURE &bull; Last Updated: 16 August 2026
          </p>
        </div>

        <div className="space-y-10 font-body-sm text-gray-300 leading-relaxed">
          {/* Section 1 */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">01.</span> GENERAL POLICY
            </h2>
            <p>
              At CLAPCULTURE, every order is processed and packed with care. Because our products are made and packed specifically for customer orders, we do not provide refunds, returns, or exchanges for change of mind, personal preference, or dissatisfaction with the product where the product has been delivered correctly and is not verified as defective, damaged, or incorrectly supplied.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">02.</span> NO REFUND FOR CHANGE OF MIND
            </h2>
            <p>
              If you do not like the product after delivery, change your mind, no longer require the product, or simply do not wish to keep it, no direct return or refund will be applicable.
            </p>
          </section>

          {/* Section 3 */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">03.</span> SIZE SELECTION &amp; SIZE ISSUES
            </h2>
            <p className="mb-3">
              Customers are responsible for selecting the correct size before placing an order. A detailed size chart and available sizes are provided on the CLAPCULTURE website. Customers are strongly advised to review the size chart and select their size carefully before completing payment.
            </p>
            <p>
              Incorrect size selection, fit preference, the product feeling larger or smaller than expected, or a change in size preference will not ordinarily qualify for a return, refund, or exchange. CLAPCULTURE does not encourage or provide routine size exchanges.
            </p>
          </section>

          {/* Section 4 */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">04.</span> DAMAGED, DEFECTIVE, OR INCORRECT PRODUCTS
            </h2>
            <p className="mb-4">
              A refund or other appropriate resolution may be considered only where the product is reasonably verified to be:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-2">
              <li>Damaged before or during delivery;</li>
              <li>Defective in material or manufacturing quality; or</li>
              <li>Incorrectly supplied compared with the confirmed order.</li>
            </ul>
            <p className="mt-4 text-sm text-gray-400">
              Any such claim must be reported promptly after delivery and is subject to verification by CLAPCULTURE.
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">05.</span> MANDATORY VERIFICATION
            </h2>
            <p className="mb-4">
              No refund will be initiated merely on the basis of a customer&apos;s claim. CLAPCULTURE will first review and verify the issue.
            </p>
            <p className="mb-3 text-white font-semibold">For verification, we may request:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-2">
              <li>Order number and registered contact details;</li>
              <li>Clear photographs of the product and packaging;</li>
              <li>Photographs showing the alleged damage or defect;</li>
              <li>A video or unboxing video, where available;</li>
              <li>Images of the shipping label or package, where relevant; and</li>
              <li>Any other reasonable information required to investigate the claim.</li>
            </ul>
            <p className="mt-4 text-sm text-gray-400">
              The final decision on whether a reported issue qualifies for a refund or other remedy will be made after reviewing the available evidence and applicable circumstances.
            </p>
          </section>

          {/* Section 6 */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">06.</span> REFUND PROCESSING
            </h2>
            <p className="mb-3">
              If a claim is verified and approved for a refund, the refund will be initiated within <strong className="text-white">7 to 10 business days</strong> after approval and completion of the verification process.
            </p>
            <p>
              The time required for the refunded amount to appear in the customer&apos;s account may additionally depend on the bank, UPI provider, payment gateway, card issuer, or other payment service provider.
            </p>
          </section>

          {/* Section 7 */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">07.</span> NO DIRECT RETURN POLICY
            </h2>
            <p className="mb-3">
              Customers should not courier or send products back to CLAPCULTURE without first receiving written return instructions from our official support team.
            </p>
            <p className="text-amber-400 font-semibold">
              ⚠️ Any product sent back without prior authorization may not be accepted or processed.
            </p>
          </section>

          {/* Section 8 */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">08.</span> IMPORTANT CONDITIONS
            </h2>
            <ul className="space-y-2.5 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-electric-lime font-bold">•</span>
                <span>Refunds are not automatic and are subject to verification and approval.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-electric-lime font-bold">•</span>
                <span>Change of mind or dislike of the product does not qualify for a refund or return.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-electric-lime font-bold">•</span>
                <span>Size-related issues caused by incorrect customer selection do not qualify for a refund or routine exchange.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-electric-lime font-bold">•</span>
                <span>Customers must review the size chart before placing an order.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-electric-lime font-bold">•</span>
                <span>Claims relating to damage, defects, or incorrect products must be supported by reasonable evidence.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-electric-lime font-bold">•</span>
                <span>Do not send any product back unless instructed by CLAPCULTURE through an official support channel.</span>
              </li>
            </ul>
          </section>

          {/* Section 9: FRAUD WARNING & UPI ID */}
          <section className="bg-linear-to-r from-red-950/40 via-[#1a1414] to-red-950/40 border-2 border-red-500/60 rounded-xl p-6 md:p-8">
            <div className="flex items-center gap-2 text-red-400 font-headline-md text-xl md:text-2xl uppercase tracking-wide mb-3">
              <span>🚨</span> 09. OFFICIAL PAYMENT &amp; FRAUD WARNING
            </div>
            <div className="bg-black/60 border border-red-500/30 rounded-lg p-4 mb-4">
              <span className="text-xs text-gray-400 font-mono uppercase block mb-1">Designated Official UPI ID:</span>
              <span className="text-lg md:text-xl font-mono font-bold text-electric-lime select-all">
                8639654299@ybl
              </span>
              <span className="text-xs text-gray-400 block mt-1">Official payment collection via UPI</span>
            </div>
            <p className="text-sm text-gray-300 mb-3">
              Customers must verify the UPI ID before making any direct UPI payment. Do not transfer money to any other UPI ID, QR code, bank account, personal account, telephone number, or individual claiming to represent CLAPCULTURE unless the payment destination has been independently verified through an official CLAPCULTURE channel.
            </p>
            <p className="text-red-400 font-bold text-xs md:text-sm uppercase tracking-wider">
              🛑 Never share your UPI PIN, OTP, CVV, card PIN, or banking password with anyone claiming to represent CLAPCULTURE.
            </p>
          </section>

          {/* Section 10 */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">10.</span> CONSUMER RIGHTS
            </h2>
            <p>
              This policy is intended to describe CLAPCULTURE&apos;s standard refund, return, and exchange process. Nothing in this policy is intended to exclude, restrict, or waive any consumer right or statutory remedy that cannot lawfully be excluded or restricted under applicable law.
            </p>
          </section>

          {/* Section 11: Contact */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">11.</span> CONTACT US
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono text-gray-300">
              <div>
                <span className="text-xs text-gray-500 block uppercase">Brand / Location:</span>
                <span className="text-white font-bold">CLAPCULTURE, Hyderabad, Telangana, India</span>
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
            <p className="mt-4 text-xs text-gray-400">
              For refund or product-issue requests, please provide your order number, registered mobile number, product name, and a clear description of the issue.
            </p>
          </section>
        </div>

        <div className="mt-12 text-center text-xs text-gray-500 font-mono">
          &copy; 2026 CLAPCULTURE. All rights reserved.
        </div>
      </div>
    </div>
  );
}

import React from 'react';

export const metadata = {
  title: 'Privacy Policy | CLAPCULTURE',
  description: 'Official Privacy Policy for CLAPCULTURE — Learn how we collect, protect, and process your personal data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-deep-black text-white pt-28 md:pt-36 pb-24 px-4 md:px-8 lg:px-12">
      <div className="max-w-4xl mx-auto">
        {/* Policy Header */}
        <div className="border-b border-charcoal pb-8 mb-10">
          <div className="inline-block bg-electric-lime text-deep-black font-label-caps text-[10px] md:text-xs px-2.5 py-1 mb-4 rounded-sm uppercase font-bold tracking-wider">
            LEGAL COMPLIANCE
          </div>
          <h1 className="font-headline-xl text-4xl sm:text-5xl md:text-7xl uppercase tracking-wider text-white mb-2">
            PRIVACY POLICY
          </h1>
          <p className="text-gray-400 text-xs md:text-sm font-mono">
            CLAPCULTURE &bull; Last Updated: 16 August 2026
          </p>
        </div>

        <div className="space-y-10 font-body-sm text-gray-300 leading-relaxed">
          {/* Preamble */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <p className="mb-4">
              CLAPCULTURE (&ldquo;CLAPCULTURE&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) respects your privacy and is committed to protecting the personal information you provide while using our website, products, services, and customer-support channels.
            </p>
            <p className="mb-4">
              This Privacy Policy explains what information we collect, why we collect it, how we use and protect it, and the choices available to you when you visit or purchase from <strong className="text-white">https://clapculture.com/</strong>.
            </p>
            <p className="text-gray-400 text-xs">
              By using our website or purchasing our products, you acknowledge that you have read and understood this Privacy Policy.
            </p>
          </section>

          {/* Section 1 */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">01.</span> INFORMATION WE COLLECT
            </h2>
            <p className="mb-4">Depending on how you interact with CLAPCULTURE, we may collect the following information:</p>

            <div className="space-y-4">
              <div className="bg-black/50 border border-charcoal rounded-lg p-4">
                <h3 className="text-electric-lime font-bold text-sm uppercase mb-2 font-mono">A. Personal and Contact Information</h3>
                <ul className="list-disc list-inside space-y-1 text-xs md:text-sm text-gray-300">
                  <li>Full name</li>
                  <li>Email address</li>
                  <li>Mobile / telephone number</li>
                  <li>Billing address</li>
                  <li>Shipping / delivery address (City, state, postal code, country)</li>
                  <li>Information provided when contacting our customer support team</li>
                </ul>
              </div>

              <div className="bg-black/50 border border-charcoal rounded-lg p-4">
                <h3 className="text-electric-lime font-bold text-sm uppercase mb-2 font-mono">B. Order and Transaction Information</h3>
                <ul className="list-disc list-inside space-y-1 text-xs md:text-sm text-gray-300">
                  <li>Products purchased and order numbers</li>
                  <li>Order date, time, and order value</li>
                  <li>Shipping and billing details</li>
                  <li>Payment status, transaction references, refunds or cancellations</li>
                </ul>
                <p className="mt-3 text-xs text-gray-400">
                  We do not collect or store your complete debit-card, credit-card, banking password, UPI PIN, or other authentication credentials. Payments are processed through third-party payment service providers in accordance with their privacy policies.
                </p>
              </div>

              <div className="bg-black/50 border border-charcoal rounded-lg p-4">
                <h3 className="text-electric-lime font-bold text-sm uppercase mb-2 font-mono">C. Website and Technical Information</h3>
                <ul className="list-disc list-inside space-y-1 text-xs md:text-sm text-gray-300">
                  <li>IP address, device type, operating system, and browser type</li>
                  <li>Approximate location derived from technical signals</li>
                  <li>Pages visited, duration, and website interaction metrics</li>
                </ul>
              </div>

              <div className="bg-black/50 border border-charcoal rounded-lg p-4">
                <h3 className="text-electric-lime font-bold text-sm uppercase mb-2 font-mono">D. Cookies and Similar Technologies</h3>
                <p className="text-xs md:text-sm text-gray-300">
                  We use cookies and local storage to keep our website functioning properly, preserve cart contents, maintain session states, understand site analytics, and improve performance.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">02.</span> HOW WE USE YOUR INFORMATION
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Processing, verifying, and fulfilling your orders</li>
              <li>Delivering packages via authorized courier partners</li>
              <li>Providing order status confirmations, updates, and tracking links</li>
              <li>Processing verified cancellations and refunds</li>
              <li>Providing dedicated customer support and resolving inquiries</li>
              <li>Maintaining store security, preventing fraud, and complying with legal obligations</li>
              <li>Improving our products, catalog lineup, and website experience</li>
            </ul>
            <p className="mt-4 text-xs text-gray-400">
              We seek to process personal data in accordance with applicable law and for lawful purposes pursuant to India&apos;s Digital Personal Data Protection Act, 2023.
            </p>
          </section>

          {/* Section 3: PAYMENT & FRAUD WARNING */}
          <section className="bg-linear-to-r from-red-950/40 via-[#1a1414] to-red-950/40 border-2 border-red-500/60 rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-red-400 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span>🚨</span> 03. PAYMENT INFORMATION &amp; OFFICIAL UPI NOTICE
            </h2>
            <p className="mb-4 text-gray-300">
              CLAPCULTURE does not ask customers to share their UPI PIN, card PIN, CVV, OTP, banking password, or other confidential credentials with us through WhatsApp, telephone, email, social media, or any other channel.
            </p>
            <div className="bg-black/60 border border-red-500/30 rounded-lg p-4 mb-4">
              <span className="text-xs text-gray-400 font-mono uppercase block mb-1">Our Currently Designated Official UPI ID:</span>
              <span className="text-lg md:text-xl font-mono font-bold text-electric-lime select-all">
                8639654299@ybl
              </span>
              <span className="text-xs text-gray-400 block mt-1">Associated with official payment collection via UPI</span>
            </div>
            <p className="text-xs md:text-sm text-gray-300 mb-2">
              CLAPCULTURE is not responsible for payments made to unauthorized UPI IDs, QR codes, bank accounts, or phone numbers. Always verify the published UPI ID before transferring money.
            </p>
            <p className="text-red-400 font-bold text-xs uppercase tracking-wider">
              🛑 Never share your UPI PIN or OTP with anyone claiming to represent CLAPCULTURE.
            </p>
          </section>

          {/* Section 4 */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">04.</span> HOW WE SHARE INFORMATION
            </h2>
            <p className="mb-3">We share necessary information only with trusted third parties to provide our services:</p>
            <ul className="list-disc list-inside space-y-1.5 text-gray-300 text-sm">
              <li>Payment gateways and processors (Paytm for Business, UPI networks)</li>
              <li>Shipping, courier, and logistics providers</li>
              <li>Cloud hosting and database infrastructure partners</li>
              <li>Customer communication and notification services (SMTP / WhatsApp)</li>
              <li>Government authorities or law-enforcement agencies where legally required</li>
            </ul>
            <p className="mt-4 text-xs text-gray-400 font-bold">
              We do not sell your personal information to third parties for independent marketing purposes.
            </p>
          </section>

          {/* Section 5 & 6 */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">05.</span> DATA SECURITY &amp; RETENTION
            </h2>
            <p className="mb-3">
              We employ standard technical and organizational security measures to protect customer information from unauthorized access, alteration, disclosure, or destruction.
            </p>
            <p className="text-sm text-gray-400">
              Personal data is retained only for as long as necessary to complete transactions, fulfill statutory accounting and tax obligations, resolve disputes, and maintain operational logs.
            </p>
          </section>

          {/* Section 7 */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-3 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">06.</span> YOUR RIGHTS &amp; CHOICES
            </h2>
            <p className="mb-3">Under applicable data protection regulations, you may:</p>
            <ul className="list-disc list-inside space-y-1.5 text-gray-300 text-sm">
              <li>Request information regarding data processed by CLAPCULTURE</li>
              <li>Request correction or updating of inaccurate records</li>
              <li>Request deletion of data where legally permissible</li>
              <li>Opt out of marketing communications at any time</li>
            </ul>
          </section>

          {/* Section 8: CONTACT */}
          <section className="bg-[#141414] border border-charcoal rounded-xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-headline-md text-white uppercase tracking-wide mb-4 flex items-center gap-2">
              <span className="text-electric-lime font-mono text-sm md:text-base font-bold">07.</span> PRIVACY GRIEVANCE &amp; CONTACT
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-mono text-gray-300">
              <div>
                <span className="text-xs text-gray-500 block uppercase">Brand / Location:</span>
                <span className="text-white font-bold">CLAPCULTURE, Hyderabad, Telangana, India</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block uppercase">Official Privacy Email:</span>
                <a href="mailto:clapcultureofficial@gmail.com" className="text-electric-lime underline">
                  clapcultureofficial@gmail.com
                </a>
              </div>
              <div>
                <span className="text-xs text-gray-500 block uppercase">WhatsApp:</span>
                <a href="https://wa.me/917569684299" target="_blank" rel="noopener noreferrer" className="text-white underline">
                  +91 7569684299
                </a>
              </div>
              <div>
                <span className="text-xs text-gray-500 block uppercase">Support Hours:</span>
                <span className="text-white">Monday–Sunday, 10:00 AM–8:00 PM IST</span>
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-400">
              For privacy-related inquiries, please include &ldquo;Privacy Request&rdquo; in your email subject line.
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

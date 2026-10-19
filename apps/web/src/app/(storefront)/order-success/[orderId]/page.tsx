import React from 'react';
import Link from 'next/link';



export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Order Confirmation | CLAPCULTURE',
};

export default async function OrderSuccessPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const cleanId = orderId.replace('#', '');

  return (
    <div className="min-h-screen bg-deep-black text-white pt-24 pb-16 px-4 flex flex-col items-center">
      
      {/* Success Badge */}
      <div className="w-20 h-20 bg-electric-lime rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(210,240,0,0.4)]">
        <span className="material-symbols-outlined text-black text-5xl font-bold">check</span>
      </div>

      <h1 className="font-headline-xl text-5xl md:text-7xl mb-2 uppercase text-center tracking-wider">ORDER RECEIVED</h1>
      <p className="text-gray-400 font-label-caps tracking-widest mb-8 text-sm text-center">
        THANK YOU FOR JOINING THE CULTURE. YOUR ORDER HAS BEEN PLACED SUCCESSFULLY.
      </p>

      {/* Main Order Confirmation Box */}
      <div className="bg-charcoal border border-gray-800 p-8 w-full max-w-2xl text-center mb-8 rounded-xl shadow-2xl space-y-6">
        <div>
          <span className="text-gray-400 text-xs font-label-caps tracking-widest">ORDER NUMBER</span>
          <p className="font-headline-md text-4xl text-white mt-1">#{cleanId}</p>
        </div>

        <div>
          <span className="inline-block bg-yellow-500/10 text-yellow-400 border border-yellow-500/40 px-4 py-1.5 text-xs font-bold tracking-widest font-label-caps rounded">
            STATUS: PAYMENT VERIFICATION PENDING
          </span>
        </div>

        {/* ✉️ SIMULATED CONFIRMATION EMAIL PREVIEW CARD */}
        <div className="bg-[#141414] border border-charcoal p-6 rounded-lg text-left text-xs space-y-4">
          <div className="flex justify-between items-center border-b border-charcoal pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-electric-lime text-base">mark_email_read</span>
              <span className="font-bold text-white font-mono">CONFIRMATION EMAIL SENT</span>
            </div>
            <span className="text-[10px] text-gray-500 font-mono">JUST NOW</span>
          </div>

          <div className="space-y-1 text-gray-300 font-mono text-[11px]">
            <p><span className="text-gray-500">From:</span> orders@clapculture.com</p>
            <p><span className="text-gray-500">Subject:</span> Booking Confirmation #{cleanId} - CLAPCULTURE</p>
          </div>

          <div className="p-3 bg-black/60 rounded border border-gray-800 text-gray-300 leading-relaxed text-[11px]">
            <p className="font-bold text-white mb-1">Hi Rebel,</p>
            <p>Your order <span className="text-electric-lime font-mono">#{cleanId}</span> has been received. Our team is verifying your payment screenshot. You can track your shipment status live anytime using the link below.</p>
          </div>

          {/* Direct Auto-Prefilled Track Link */}
          <div className="pt-2">
            <Link 
              href={`/track-order?orderId=${cleanId}`}
              className="w-full bg-electric-lime text-black font-headline-md text-lg py-3 rounded flex items-center justify-center gap-2 hover:bg-white transition-colors uppercase font-bold text-center"
            >
              <span className="material-symbols-outlined text-xl">local_shipping</span>
              TRACK ORDER NOW
            </Link>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
          <Link 
            href={`/order/${cleanId}`} 
            className="w-full sm:w-auto bg-transparent border border-white text-white px-8 py-3.5 font-headline-md text-lg hover:bg-white hover:text-black transition-colors uppercase text-center"
          >
            VIEW ORDER RECEIPT
          </Link>
          <Link 
            href="/shop" 
            className="w-full sm:w-auto bg-electric-lime text-black px-8 py-3.5 font-headline-md text-lg hover:bg-white transition-colors uppercase text-center font-bold"
          >
            CONTINUE SHOPPING
          </Link>
        </div>

        {/* WhatsApp Order Inquiry */}
        <div className="pt-2">
          <a
            href={`https://wa.me/917569684299?text=${encodeURIComponent(`Hi CLAPCULTURE Team, I just placed Order #${cleanId} and have a question.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-mono text-[#25D366] hover:underline"
          >
            <span className="material-symbols-outlined text-sm">chat</span>
            <span>Need immediate help with this order? Chat on WhatsApp (+91 7569684299)</span>
          </a>
        </div>
      </div>
    </div>
  );
}

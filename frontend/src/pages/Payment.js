import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { track } from '../lib/analytics';
import { Check, XCircle, Loader2 } from 'lucide-react';

export function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [status, setStatus] = useState('polling'); // polling | paid | pending | error
  const [productSlug, setProductSlug] = useState(null);
  const pollCount = useRef(0);
  const tracked = useRef(false);

  useEffect(() => {
    if (!sessionId) { setStatus('error'); return; }
    let cancelled = false;
    let timer = null;

    const poll = async () => {
      if (cancelled) return;
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.product_slug) setProductSlug(data.product_slug);
        if (data.payment_status === 'paid') {
          setStatus('paid');
          if (!tracked.current) {
            tracked.current = true;
            track('checkout_success', { session_id: sessionId, slug: data.product_slug });
          }
          return;
        }
        pollCount.current += 1;
        if (pollCount.current >= 12) { // ~24s
          setStatus('pending');
          return;
        }
        timer = setTimeout(poll, 2000);
      } catch {
        setStatus('error');
      }
    };
    poll();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [sessionId]);

  return (
    <div className="container-x py-32 max-w-lg" data-testid="payment-success-page">
      {status === 'polling' && (
        <div className="border border-border p-10 text-center">
          <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
          <div className="overline mt-6">Confirming payment</div>
          <h1 className="font-display font-bold text-3xl mt-3 tracking-tight">Just a moment…</h1>
          <p className="text-muted-foreground mt-3">We're verifying your payment with Stripe.</p>
        </div>
      )}
      {status === 'paid' && (
        <div className="border border-primary p-10 text-center" data-testid="payment-success-confirmed">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary flex items-center justify-center mx-auto">
            <Check className="w-7 h-7 text-primary" />
          </div>
          <div className="overline mt-6">Payment received</div>
          <h1 className="font-display font-bold text-4xl mt-3 tracking-tight">You're in.</h1>
          <p className="text-muted-foreground mt-4">
            Thanks for your purchase. Your entitlement has been added to your account.
          </p>
          <div className="flex justify-center gap-3 mt-8">
            <Link to="/account" className="btn-primary" data-testid="payment-account-link">Go to account</Link>
            {productSlug && <Link to={`/products/${productSlug}`} className="btn-ghost">Back to product</Link>}
          </div>
        </div>
      )}
      {status === 'pending' && (
        <div className="border border-border p-10 text-center">
          <div className="overline">Payment pending</div>
          <h1 className="font-display font-bold text-3xl mt-3 tracking-tight">Still processing…</h1>
          <p className="text-muted-foreground mt-3">Your bank is taking a little longer than usual. We'll email you when it clears.</p>
          <Link to="/account" className="btn-ghost mt-8 inline-flex">Go to account</Link>
        </div>
      )}
      {status === 'error' && (
        <div className="border border-destructive p-10 text-center" data-testid="payment-error">
          <XCircle className="w-8 h-8 mx-auto text-destructive" />
          <h1 className="font-display font-bold text-3xl mt-3 tracking-tight">Something went wrong</h1>
          <p className="text-muted-foreground mt-3">We couldn't verify this payment session. Please contact support.</p>
          <Link to="/contact" className="btn-primary mt-8 inline-flex">Contact us</Link>
        </div>
      )}
    </div>
  );
}

export function PaymentCancel() {
  const [params] = useSearchParams();
  const slug = params.get('slug');
  useEffect(() => { track('checkout_cancel', { slug }); }, [slug]);
  return (
    <div className="container-x py-32 max-w-lg text-center" data-testid="payment-cancel-page">
      <div className="overline">Cancelled</div>
      <h1 className="font-display font-black text-5xl mt-3 tracking-tightest">No charge made.</h1>
      <p className="text-muted-foreground mt-4">You closed the checkout before completing your purchase. Nothing was billed.</p>
      <div className="flex justify-center gap-3 mt-10">
        {slug ? <Link to={`/products/${slug}`} className="btn-primary">Back to product</Link> : <Link to="/products" className="btn-primary">Browse products</Link>}
        <Link to="/contact" className="btn-ghost">Contact support</Link>
      </div>
    </div>
  );
}

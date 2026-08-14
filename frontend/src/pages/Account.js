import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, formatApiError } from '../lib/api';
import { toast } from 'sonner';

export default function Account() {
  const { user, logout } = useAuth();
  const [entitlements, setEnts] = useState(null);
  const [transactions, setTxns] = useState(null);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  const loadData = () => {
    if (!user || !user.id) return;
    api.get('/account/entitlements').then(r => setEnts(r.data)).catch(() => setEnts([]));
    api.get('/account/transactions').then(r => setTxns(r.data)).catch(() => setTxns([]));
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line */ }, [user]);

  const redeem = async (e) => {
    e.preventDefault();
    setRedeeming(true);
    try {
      const { data } = await api.post('/redeem', { code: code.trim() });
      toast.success(`Code redeemed — unlocked ${data.granted_products.length} product${data.granted_products.length === 1 ? '' : 's'}.`);
      setCode('');
      loadData();
    } catch (er) {
      toast.error(formatApiError(er));
    } finally { setRedeeming(false); }
  };

  if (!user || user === false) return null;

  return (
    <div className="container-x py-24">
      <div className="overline">Account</div>
      <h1 className="font-display font-black text-4xl md:text-5xl mt-3 tracking-tightest">Welcome back, {user.name}.</h1>
      <p className="text-muted-foreground mt-3">Manage your account, subscriptions and entitlements.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border mt-10">
        <div className="card-flat p-6">
          <div className="overline">Profile</div>
          <div className="text-sm mt-4"><div className="text-muted-foreground">Name</div><div>{user.name}</div></div>
          <div className="text-sm mt-3"><div className="text-muted-foreground">Email</div><div>{user.email}</div></div>
          <div className="text-sm mt-3"><div className="text-muted-foreground">Role</div><div className="capitalize">{user.role}</div></div>
          {user.role === 'admin' && <div className="mt-4 text-[10px] tracking-widest uppercase text-primary font-bold border border-primary px-2 py-1 inline-block">Master admin · full access</div>}
        </div>
        <div className="card-flat p-6" data-testid="account-entitlements">
          <div className="overline">Active products</div>
          {entitlements === null ? (
            <div className="text-sm text-muted-foreground mt-4">Loading…</div>
          ) : entitlements.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-4">You don't have any active products yet. Browse the catalogue or redeem a code below.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {entitlements.map(e => (
                <li key={e.id} className="flex items-center justify-between text-sm border border-border p-3">
                  <div>
                    <Link to={e.product_slug === '__universal__' ? '/products' : `/products/${e.product_slug}`} className="font-semibold hover:text-primary">{e.product_slug === '__universal__' ? 'Universal access' : e.product_slug}</Link>
                    <div className="text-xs text-muted-foreground mt-0.5 capitalize">{e.source || e.mode || 'entitlement'}</div>
                  </div>
                  <span className="text-xs text-emerald-400">Active</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card-flat p-6" data-testid="account-transactions">
          <div className="overline">Recent transactions</div>
          {transactions === null ? (
            <div className="text-sm text-muted-foreground mt-4">Loading…</div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground mt-4">No transactions yet. Purchases appear here after checkout.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {transactions.slice(0, 5).map(t => (
                <li key={t.id} className="text-xs border border-border p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{t.product_slug}</div>
                    <div className="text-muted-foreground mt-0.5">{new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div>{t.amount ? (t.amount / 100).toFixed(2) : '—'} {t.currency?.toUpperCase() || ''}</div>
                    <div className={`text-[10px] mt-0.5 ${t.payment_status === 'paid' ? 'text-emerald-400' : 'text-muted-foreground'}`}>{t.payment_status}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-10 border border-border p-6 max-w-xl" data-testid="account-redeem">
        <div className="overline">Redeem access code</div>
        <p className="text-sm text-muted-foreground mt-2">Got a code from Trillion AI Tech? Enter it below to unlock the associated products.</p>
        <form onSubmit={redeem} className="mt-4 flex gap-2">
          <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="TAT-XXXX-XXXX" className="flex-1 bg-transparent border border-border rounded-md px-3 py-2 outline-none focus:border-primary font-mono text-sm" data-testid="redeem-code-input" />
          <button className="btn-primary" disabled={redeeming || code.length < 4} data-testid="redeem-code-submit">{redeeming ? 'Redeeming…' : 'Redeem'}</button>
        </form>
      </div>

      <div className="mt-10 flex gap-3">
        {user.role === 'admin' && <Link to="/admin" className="btn-primary" data-testid="account-admin-link">Open admin</Link>}
        <Link to="/products" className="btn-ghost">Browse products</Link>
        <Link to="/appforge" className="btn-ghost">Open AppForge</Link>
        <button onClick={logout} className="btn-ghost" data-testid="account-signout">Sign out</button>
      </div>
    </div>
  );
}

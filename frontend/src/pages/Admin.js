import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatApiError, API_BASE } from '../lib/api';
import { toast } from 'sonner';
import {
  LayoutDashboard, Package, Users, CreditCard, Ticket, BarChart3, Mail,
  MessageSquare, Sparkles, ScrollText, Settings as SettingsIcon,
  Pencil, Trash2, Plus, X, Upload, Copy, Check, KeyRound, ShieldCheck,
  Search as SearchIcon
} from 'lucide-react';

const SECTIONS = [
  { key: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { key: 'products', label: 'Products', Icon: Package },
  { key: 'users', label: 'Users', Icon: Users },
  { key: 'payments', label: 'Payments', Icon: CreditCard },
  { key: 'codes', label: 'Access Codes', Icon: Ticket },
  { key: 'analytics', label: 'Analytics', Icon: BarChart3 },
  { key: 'waitlist', label: 'Waitlist', Icon: Mail },
  { key: 'contact', label: 'Contact', Icon: MessageSquare },
  { key: 'appforge', label: 'AppForge', Icon: Sparkles },
  { key: 'audit', label: 'Audit Log', Icon: ScrollText },
  { key: 'settings', label: 'Settings', Icon: SettingsIcon },
];

export default function Admin() {
  const [section, setSection] = useState(() => localStorage.getItem('tat-admin-section') || 'overview');
  useEffect(() => { localStorage.setItem('tat-admin-section', section); }, [section]);

  return (
    <div className="container-x py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="overline mb-1">Master admin</div>
          <div className="font-display font-bold text-2xl tracking-tight mb-6">Control room</div>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0" data-testid="admin-sidebar">
            {SECTIONS.map(s => (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-md whitespace-nowrap transition-colors ${section === s.key ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
                data-testid={`admin-nav-${s.key}`}
              >
                <s.Icon className="w-4 h-4" />
                <span>{s.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="min-w-0">
          {section === 'overview' && <Overview />}
          {section === 'products' && <ProductsAdmin />}
          {section === 'users' && <UsersAdmin />}
          {section === 'payments' && <PaymentsAdmin />}
          {section === 'codes' && <CodesAdmin />}
          {section === 'analytics' && <AnalyticsAdmin />}
          {section === 'waitlist' && <WaitlistAdmin />}
          {section === 'contact' && <ContactAdmin />}
          {section === 'appforge' && <AppForgeAdmin />}
          {section === 'audit' && <AuditAdmin />}
          {section === 'settings' && <SettingsAdmin />}
        </main>
      </div>
    </div>
  );
}

/* ==================== OVERVIEW ==================== */
function Overview() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.get('/admin/stats').then(r => setStats(r.data)).catch(() => {}); }, []);
  if (!stats) return <SkelBlock />;
  const items = [
    ['users', 'Users'], ['products', 'Products'], ['active_products', 'Active'],
    ['coming_soon', 'Coming soon'], ['waitlist', 'Waitlist'], ['audit_logs', 'Audit entries'],
    ['paid_transactions', 'Paid txns'], ['entitlements', 'Entitlements'], ['events_7d', 'Events (7d)'],
  ];
  return (
    <div>
      <PageTitle title="Overview" blurb="Everything happening in your business at a glance." />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border border border-border">
        {items.map(([k, l]) => (
          <div key={k} className="card-flat p-5" data-testid={`stat-${k}`}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
            <div className="font-display font-bold text-3xl mt-2">{stats[k] ?? 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================== PRODUCTS ==================== */
const EMPTY_PRODUCT = {
  slug: '', name: '', short_description: '', description: '',
  category: 'apps', status: 'coming-soon', featured: false,
  image: '', logo: '',
  features: [], tags: [],
  billing_type: 'free', price: null, currency: 'USD', trial_days: null,
  stripe_product_id: '', stripe_price_id: '', payment_link: '',
  external_url: '', demo_url: '', documentation_url: '', github_url: '',
  version: '', release_date: '', seo_title: '', seo_description: '',
  screenshots: [], subcategory: '',
};

function cleanForApi(f) {
  const cleaned = { ...f };
  ['stripe_product_id','stripe_price_id','payment_link','external_url','demo_url','documentation_url','github_url','version','release_date','seo_title','seo_description','image','logo','subcategory'].forEach(k => {
    if (cleaned[k] === '') cleaned[k] = null;
  });
  if (cleaned.price === '' || cleaned.price === null) cleaned.price = null; else cleaned.price = Number(cleaned.price);
  if (cleaned.trial_days === '' || cleaned.trial_days === null) cleaned.trial_days = null; else cleaned.trial_days = parseInt(cleaned.trial_days, 10);
  return cleaned;
}

function ProductsAdmin() {
  const [products, setProducts] = useState(null);
  const [editing, setEditing] = useState(null);
  const load = () => api.get('/products', { params: { limit: 200 } }).then(r => setProducts(r.data));
  useEffect(() => { load(); }, []);
  const save = async (data) => {
    try {
      if (editing.mode === 'new') await api.post('/admin/products', cleanForApi(data));
      else await api.put(`/admin/products/${editing.original}`, cleanForApi(data));
      toast.success('Saved'); setEditing(null); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  const del = async (slug) => {
    if (!window.confirm(`Delete ${slug}?`)) return;
    try { await api.delete(`/admin/products/${slug}`); toast.success('Deleted'); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  return (
    <div>
      <PageTitle title="Products" blurb="Create, edit and archive the catalogue." right={
        <button onClick={() => setEditing({ mode: 'new', data: { ...EMPTY_PRODUCT }, original: '' })} className="btn-primary text-xs !py-1.5 !px-3" data-testid="admin-new-product">
          <Plus className="w-3.5 h-3.5" /> New product
        </button>
      } />
      <div className="border border-border divide-y divide-border" data-testid="admin-products-list">
        {(products || []).map(p => (
          <div key={p.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground truncate">{p.slug} · {p.category} · {p.status} {p.payment_link && '· link'}</div>
            </div>
            <div className="flex items-center gap-2">
              <Link to={`/products/${p.slug}`} target="_blank" className="text-xs text-muted-foreground hover:text-foreground">Open ↗</Link>
              <button onClick={() => setEditing({ mode: 'edit', data: { ...EMPTY_PRODUCT, ...p }, original: p.slug })} className="p-2 hover:bg-secondary rounded-md" data-testid={`admin-edit-${p.slug}`}><Pencil className="w-4 h-4" /></button>
              <button onClick={() => del(p.slug)} className="p-2 hover:bg-secondary rounded-md text-destructive" data-testid={`admin-delete-${p.slug}`}><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {products?.length === 0 && <div className="p-6 text-muted-foreground text-sm">No products yet.</div>}
      </div>
      {editing && <ProductForm editing={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function ProductForm({ editing, onCancel, onSave }) {
  const [data, setData] = useState(editing.data);
  const set = (k) => (e) => setData(d => ({ ...d, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setList = (k) => (e) => setData(d => ({ ...d, [k]: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }));
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-start justify-center overflow-y-auto p-4" data-testid="admin-product-modal">
      <div className="w-full max-w-3xl bg-card border border-border my-8">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div><div className="overline">{editing.mode === 'new' ? 'Create' : 'Edit'}</div><div className="font-display font-bold text-xl mt-1">{data.name || 'New product'}</div></div>
          <button onClick={onCancel} className="p-2 hover:bg-secondary rounded-md" data-testid="admin-modal-close"><X className="w-4 h-4" /></button>
        </div>
        <form className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={e => { e.preventDefault(); onSave(data); }}>
          <ImageField label="Image" k="image" data={data} setData={setData} />
          <ImageField label="Logo" k="logo" data={data} setData={setData} />
          {[
            ['slug','Slug'],['name','Name'],['short_description','Short description'],
            ['payment_link','Stripe Payment Link URL'],
            ['version','Version'],['release_date','Release date'],
            ['external_url','Product URL'],['demo_url','Demo URL'],
            ['documentation_url','Docs URL'],['github_url','GitHub URL'],
            ['stripe_product_id','Stripe product ID'],['stripe_price_id','Stripe price ID'],
          ].map(([k, label]) => (
            <label key={k} className="text-xs">
              <div className="text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
              <input value={data[k] ?? ''} onChange={set(k)} className="w-full bg-transparent border border-border rounded-md px-3 py-2 outline-none focus:border-primary" data-testid={`admin-field-${k}`} />
            </label>
          ))}
          <label className="text-xs md:col-span-2">
            <div className="text-muted-foreground uppercase tracking-wider mb-1">Description</div>
            <textarea rows={5} value={data.description} onChange={set('description')} className="w-full bg-transparent border border-border rounded-md px-3 py-2 outline-none focus:border-primary" data-testid="admin-field-description" />
          </label>
          <label className="text-xs">
            <div className="text-muted-foreground uppercase tracking-wider mb-1">Category</div>
            <select value={data.category} onChange={set('category')} className="w-full bg-card border border-border rounded-md px-3 py-2" data-testid="admin-field-category">
              {['apps','agents','tools','software','games'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-xs">
            <div className="text-muted-foreground uppercase tracking-wider mb-1">Status</div>
            <select value={data.status} onChange={set('status')} className="w-full bg-card border border-border rounded-md px-3 py-2" data-testid="admin-field-status">
              {['active','beta','coming-soon','maintenance','retired'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-xs">
            <div className="text-muted-foreground uppercase tracking-wider mb-1">Billing</div>
            <select value={data.billing_type} onChange={set('billing_type')} className="w-full bg-card border border-border rounded-md px-3 py-2" data-testid="admin-field-billing">
              {['free','one-time','monthly','annual'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-xs">
            <div className="text-muted-foreground uppercase tracking-wider mb-1">Price (USD)</div>
            <input type="number" step="0.01" value={data.price ?? ''} onChange={set('price')} className="w-full bg-transparent border border-border rounded-md px-3 py-2" data-testid="admin-field-price" />
          </label>
          <label className="text-xs">
            <div className="text-muted-foreground uppercase tracking-wider mb-1">Trial days</div>
            <input type="number" min="0" max="90" value={data.trial_days ?? ''} onChange={set('trial_days')} className="w-full bg-transparent border border-border rounded-md px-3 py-2" data-testid="admin-field-trial" />
          </label>
          <label className="text-xs md:col-span-2">
            <div className="text-muted-foreground uppercase tracking-wider mb-1">Features (comma-separated)</div>
            <input value={(data.features || []).join(', ')} onChange={setList('features')} className="w-full bg-transparent border border-border rounded-md px-3 py-2" data-testid="admin-field-features" />
          </label>
          <label className="text-xs md:col-span-2">
            <div className="text-muted-foreground uppercase tracking-wider mb-1">Tags (comma-separated)</div>
            <input value={(data.tags || []).join(', ')} onChange={setList('tags')} className="w-full bg-transparent border border-border rounded-md px-3 py-2" data-testid="admin-field-tags" />
          </label>
          <label className="text-xs flex items-center gap-2 md:col-span-2">
            <input type="checkbox" checked={!!data.featured} onChange={set('featured')} data-testid="admin-field-featured" />
            <span>Featured on homepage</span>
          </label>
          <div className="md:col-span-2 flex justify-end gap-2 mt-4">
            <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
            <button className="btn-primary" data-testid="admin-form-save">{editing.mode === 'new' ? 'Create' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImageField({ label, k, data, setData }) {
  const [uploading, setUploading] = useState(false);
  const value = data[k] || '';
  const onFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2 MB'); return; }
    setUploading(true);
    try {
      const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      const { data: resp } = await api.post('/admin/uploads', { filename: file.name, content_type: file.type, data_base64: dataUrl });
      setData(d => ({ ...d, [k]: `${API_BASE}${resp.url}` }));
      toast.success('Uploaded');
    } catch (e2) { toast.error(formatApiError(e2)); }
    finally { setUploading(false); e.target.value = ''; }
  };
  return (
    <label className="text-xs">
      <div className="text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
        <span>{label}</span>
        <span className="flex items-center gap-1 text-primary cursor-pointer hover:underline">
          <Upload className="w-3 h-3" /><span>{uploading ? 'Uploading…' : 'Upload'}</span>
          <input type="file" accept="image/*" className="hidden" onChange={onFile} data-testid={`admin-upload-${k}`} />
        </span>
      </div>
      <input value={value} onChange={e => setData(d => ({ ...d, [k]: e.target.value }))} placeholder="URL or upload" className="w-full bg-transparent border border-border rounded-md px-3 py-2 outline-none focus:border-primary" data-testid={`admin-field-${k}`} />
      {value && <div className="mt-2 border border-border rounded p-2 bg-secondary/40"><img src={value} alt="" className="max-h-24 object-contain mx-auto" /></div>}
    </label>
  );
}

/* ==================== USERS ==================== */
function UsersAdmin() {
  const [users, setUsers] = useState(null);
  const [q, setQ] = useState('');
  const load = () => api.get('/admin/users', { params: { q: q || undefined } }).then(r => setUsers(r.data));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q]);
  const changeRole = async (id, role) => {
    try { await api.put(`/admin/users/${id}/role`, { role }); toast.success('Role updated'); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const del = async (id, email) => {
    if (!window.confirm(`Delete ${email}? This revokes all their entitlements.`)) return;
    try { await api.delete(`/admin/users/${id}`); toast.success('Deleted'); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  return (
    <div>
      <PageTitle title="Users" blurb="View, promote/demote, or delete accounts. Deleting revokes entitlements." />
      <div className="flex items-center gap-2 border border-border rounded-full px-4 py-2 max-w-md mb-6">
        <SearchIcon className="w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search email or name…" className="bg-transparent outline-none text-sm flex-1" data-testid="users-search" />
      </div>
      <div className="border border-border divide-y divide-border" data-testid="admin-users-list">
        {(users || []).map(u => (
          <div key={u.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{u.name || '—'}</div>
              <div className="text-xs text-muted-foreground truncate">{u.email} · <span className={u.role === 'admin' ? 'text-primary font-semibold' : ''}>{u.role}</span></div>
            </div>
            <div className="flex items-center gap-2">
              <select value={u.role} onChange={e => changeRole(u.id, e.target.value)} className="text-xs bg-card border border-border rounded-md px-2 py-1" data-testid={`user-role-${u.email}`}>
                <option value="customer">customer</option>
                <option value="admin">admin</option>
              </select>
              <button onClick={() => del(u.id, u.email)} className="p-2 hover:bg-secondary rounded-md text-destructive" data-testid={`user-delete-${u.email}`}><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {users?.length === 0 && <div className="p-6 text-muted-foreground text-sm">No users match.</div>}
      </div>
    </div>
  );
}

/* ==================== PAYMENTS ==================== */
function PaymentsAdmin() {
  const [txns, setTxns] = useState(null);
  const [ents, setEnts] = useState(null);
  const [tab, setTab] = useState('transactions');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantSlug, setGrantSlug] = useState('');
  const load = () => Promise.all([
    api.get('/admin/transactions').then(r => setTxns(r.data)),
    api.get('/admin/entitlements').then(r => setEnts(r.data)),
  ]);
  useEffect(() => { load(); }, []);
  const grant = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/entitlements', { email: grantEmail.trim(), product_slug: grantSlug.trim(), note: 'manual grant' });
      toast.success('Entitlement granted'); setGrantEmail(''); setGrantSlug(''); load();
    } catch (er) { toast.error(formatApiError(er)); }
  };
  const revoke = async (id) => {
    if (!window.confirm('Revoke this entitlement?')) return;
    try { await api.post(`/admin/entitlements/${id}/revoke`); toast.success('Revoked'); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  return (
    <div>
      <PageTitle title="Payments" blurb="Transactions from Stripe checkout, and manual/comp entitlements." />
      <div className="flex gap-1 mb-6">
        {['transactions','entitlements','grant'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`text-xs px-3 py-1.5 rounded-full border capitalize ${tab === t ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'}`} data-testid={`payments-tab-${t}`}>{t === 'grant' ? 'Grant access' : t}</button>
        ))}
      </div>
      {tab === 'transactions' && (
        <div className="border border-border divide-y divide-border" data-testid="admin-transactions">
          {(txns || []).map(t => (
            <div key={t.id} className="p-4 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 md:items-center">
              <div>
                <div className="text-sm font-semibold">{t.product_slug}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{t.user_email || '—'} · {new Date(t.created_at).toLocaleString()}</div>
                <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{t.session_id}</div>
              </div>
              <div className="text-sm font-mono">{t.amount ? (t.amount / 100).toFixed(2) : '—'} {(t.currency || '').toUpperCase()}</div>
              <div className={`text-xs px-2 py-1 rounded-full ${t.payment_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400' : t.payment_status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-secondary text-muted-foreground'}`}>{t.payment_status}</div>
            </div>
          ))}
          {txns?.length === 0 && <div className="p-6 text-muted-foreground text-sm">No transactions yet.</div>}
        </div>
      )}
      {tab === 'entitlements' && (
        <div className="border border-border divide-y divide-border" data-testid="admin-entitlements">
          {(ents || []).map(e => (
            <div key={e.id} className="p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">{e.product_slug === '__universal__' ? 'Universal access' : e.product_slug}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{e.user_email || '—'} · {e.source || 'purchase'} · {new Date(e.created_at).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${e.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-secondary text-muted-foreground'}`}>{e.active ? 'active' : 'revoked'}</span>
                {e.active && <button onClick={() => revoke(e.id)} className="text-xs text-destructive hover:underline" data-testid={`ent-revoke-${e.id}`}>Revoke</button>}
              </div>
            </div>
          ))}
          {ents?.length === 0 && <div className="p-6 text-muted-foreground text-sm">No entitlements yet.</div>}
        </div>
      )}
      {tab === 'grant' && (
        <form onSubmit={grant} className="border border-border p-6 max-w-xl grid gap-3" data-testid="admin-grant-form">
          <label className="text-xs"><div className="text-muted-foreground uppercase tracking-wider mb-1">Customer email</div>
            <input type="email" required value={grantEmail} onChange={e => setGrantEmail(e.target.value)} className="w-full bg-transparent border border-border rounded-md px-3 py-2" data-testid="grant-email" /></label>
          <label className="text-xs"><div className="text-muted-foreground uppercase tracking-wider mb-1">Product slug or __universal__</div>
            <input required value={grantSlug} onChange={e => setGrantSlug(e.target.value)} placeholder="appforge-studio" className="w-full bg-transparent border border-border rounded-md px-3 py-2 font-mono" data-testid="grant-slug" /></label>
          <button className="btn-primary justify-center" data-testid="grant-submit">Grant free access</button>
        </form>
      )}
    </div>
  );
}

/* ==================== ACCESS CODES ==================== */
function CodesAdmin() {
  const [codes, setCodes] = useState(null);
  const [form, setForm] = useState({ label: '', scope: 'universal', product_slugs: '', max_redemptions: 1, note: '' });
  const [copied, setCopied] = useState(null);
  const load = () => api.get('/admin/access-codes').then(r => setCodes(r.data));
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      label: form.label, scope: form.scope, max_redemptions: parseInt(form.max_redemptions, 10),
      product_slugs: form.scope === 'product' ? form.product_slugs.split(',').map(s => s.trim()).filter(Boolean) : [],
      note: form.note || null,
    };
    try {
      const { data } = await api.post('/admin/access-codes', payload);
      toast.success(`Code ${data.code} created`);
      setForm({ label: '', scope: 'universal', product_slugs: '', max_redemptions: 1, note: '' });
      load();
    } catch (er) { toast.error(formatApiError(er)); }
  };
  const revoke = async (code) => {
    if (!window.confirm(`Revoke ${code}?`)) return;
    try { await api.post(`/admin/access-codes/${code}/revoke`); toast.success('Revoked'); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  const copy = (code) => { navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 1500); };
  return (
    <div>
      <PageTitle title="Access Codes" blurb="Generate free/comp access codes. Universal codes unlock every product; product-scoped codes unlock only what you specify." />
      <form onSubmit={submit} className="border border-border p-6 grid grid-cols-1 md:grid-cols-2 gap-4 mb-8" data-testid="admin-code-form">
        <label className="text-xs md:col-span-2"><div className="text-muted-foreground uppercase tracking-wider mb-1">Label</div>
          <input required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Press comp – TechCrunch" className="w-full bg-transparent border border-border rounded-md px-3 py-2" data-testid="code-label" /></label>
        <label className="text-xs"><div className="text-muted-foreground uppercase tracking-wider mb-1">Scope</div>
          <select value={form.scope} onChange={e => setForm(f => ({ ...f, scope: e.target.value }))} className="w-full bg-card border border-border rounded-md px-3 py-2" data-testid="code-scope">
            <option value="universal">Universal (all products)</option>
            <option value="product">Specific products</option>
          </select></label>
        <label className="text-xs"><div className="text-muted-foreground uppercase tracking-wider mb-1">Max redemptions</div>
          <input type="number" min="1" max="10000" value={form.max_redemptions} onChange={e => setForm(f => ({ ...f, max_redemptions: e.target.value }))} className="w-full bg-transparent border border-border rounded-md px-3 py-2" data-testid="code-max" /></label>
        {form.scope === 'product' && (
          <label className="text-xs md:col-span-2"><div className="text-muted-foreground uppercase tracking-wider mb-1">Product slugs (comma-separated)</div>
            <input value={form.product_slugs} onChange={e => setForm(f => ({ ...f, product_slugs: e.target.value }))} placeholder="appforge-studio, autoflow-agent" className="w-full bg-transparent border border-border rounded-md px-3 py-2 font-mono" data-testid="code-slugs" /></label>
        )}
        <label className="text-xs md:col-span-2"><div className="text-muted-foreground uppercase tracking-wider mb-1">Note (optional)</div>
          <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="w-full bg-transparent border border-border rounded-md px-3 py-2" data-testid="code-note" /></label>
        <div className="md:col-span-2"><button className="btn-primary" data-testid="code-create"><KeyRound className="w-4 h-4" /> Generate code</button></div>
      </form>

      <div className="border border-border divide-y divide-border" data-testid="admin-codes-list">
        {(codes || []).map(c => (
          <div key={c.id} className="p-4 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-3 md:items-center">
            <div>
              <div className="font-mono text-sm font-bold flex items-center gap-2">
                <span className={c.revoked ? 'line-through text-muted-foreground' : ''}>{c.code}</span>
                <button onClick={() => copy(c.code)} className="text-muted-foreground hover:text-primary" title="Copy" data-testid={`code-copy-${c.code}`}>
                  {copied === c.code ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{c.label} · {c.scope}{c.product_slugs?.length ? ` · ${c.product_slugs.join(', ')}` : ''}</div>
            </div>
            <div className="text-xs text-muted-foreground">{c.redemptions}/{c.max_redemptions} redeemed</div>
            <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</div>
            <div>{!c.revoked && <button onClick={() => revoke(c.code)} className="text-xs text-destructive hover:underline" data-testid={`code-revoke-${c.code}`}>Revoke</button>}</div>
          </div>
        ))}
        {codes?.length === 0 && <div className="p-6 text-muted-foreground text-sm">No codes yet. Create your first one above.</div>}
      </div>
    </div>
  );
}

/* ==================== ANALYTICS ==================== */
function AnalyticsAdmin() {
  const [analytics, setA] = useState(null);
  useEffect(() => { api.get('/admin/analytics', { params: { days: 14 } }).then(r => setA(r.data)); }, []);
  return (
    <div>
      <PageTitle title="Analytics" blurb="Last 14 days · self-hosted, no third-party trackers." />
      {!analytics ? <SkelBlock /> : (
        <div className="space-y-6" data-testid="admin-analytics">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border border border-border">
            {Object.entries(analytics.totals).map(([k, v]) => (
              <div key={k} className="card-flat p-5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.replace(/_/g, ' ')}</div>
                <div className="font-display font-bold text-2xl mt-2">{v}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-border border border-border">
            <div className="card-flat p-6">
              <div className="overline">Events</div>
              <ul className="mt-4 space-y-2">
                {analytics.by_name.map(e => (
                  <li key={e.name} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                    <span className="font-mono text-xs">{e.name}</span><span className="text-primary font-semibold">{e.count}</span>
                  </li>
                ))}
                {analytics.by_name.length === 0 && <li className="text-muted-foreground text-sm">No events yet.</li>}
              </ul>
            </div>
            <div className="card-flat p-6">
              <div className="overline">Top products by views</div>
              <ul className="mt-4 space-y-2">
                {analytics.top_products.map(p => (
                  <li key={p.slug} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                    <span className="font-mono text-xs">{p.slug}</span><span className="text-primary font-semibold">{p.count}</span>
                  </li>
                ))}
                {analytics.top_products.length === 0 && <li className="text-muted-foreground text-sm">No product views yet.</li>}
              </ul>
            </div>
          </div>
          <div className="card-flat p-6">
            <div className="overline">Daily activity</div>
            <div className="mt-6 flex items-end gap-1.5 h-32">
              {analytics.daily.map(d => {
                const max = Math.max(...analytics.daily.map(x => x.count), 1);
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full bg-primary/80 rounded-t" style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }} title={`${d.day}: ${d.count}`} />
                    <div className="text-[9px] text-muted-foreground font-mono">{d.day.slice(5)}</div>
                  </div>
                );
              })}
              {analytics.daily.length === 0 && <div className="text-muted-foreground text-sm">No data.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== WAITLIST ==================== */
function WaitlistAdmin() {
  const [items, setItems] = useState(null);
  useEffect(() => { api.get('/admin/waitlist').then(r => setItems(r.data)); }, []);
  return (
    <div>
      <PageTitle title="Waitlist" blurb="Everyone who signed up to hear about a coming-soon product." />
      <div className="border border-border divide-y divide-border" data-testid="admin-waitlist">
        {(items || []).map(w => (
          <div key={w.id} className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{w.email}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{w.product_slug || 'general'} · {w.source || '—'}</div>
            </div>
            <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</div>
          </div>
        ))}
        {items?.length === 0 && <div className="p-6 text-muted-foreground text-sm">No signups yet.</div>}
      </div>
    </div>
  );
}

/* ==================== CONTACT ==================== */
function ContactAdmin() {
  const [items, setItems] = useState(null);
  const load = () => api.get('/admin/contact-messages').then(r => setItems(r.data));
  useEffect(() => { load(); }, []);
  const del = async (id) => {
    if (!window.confirm('Delete message?')) return;
    try { await api.delete(`/admin/contact-messages/${id}`); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };
  return (
    <div>
      <PageTitle title="Contact messages" blurb="Messages from the /contact form." />
      <div className="space-y-3" data-testid="admin-contact">
        {(items || []).map(m => (
          <div key={m.id} className="border border-border p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{m.subject}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{m.name} · <a href={`mailto:${m.email}`} className="hover:text-primary">{m.email}</a> · {new Date(m.created_at).toLocaleString()}</div>
              </div>
              <button onClick={() => del(m.id)} className="p-2 hover:bg-secondary rounded-md text-destructive" data-testid={`contact-delete-${m.id}`}><Trash2 className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-line mt-3">{m.message}</p>
          </div>
        ))}
        {items?.length === 0 && <div className="border border-border p-6 text-muted-foreground text-sm">No messages yet.</div>}
      </div>
    </div>
  );
}

/* ==================== APPFORGE ==================== */
function AppForgeAdmin() {
  const [gens, setGens] = useState(null);
  useEffect(() => { api.get('/admin/appforge-generations').then(r => setGens(r.data)); }, []);
  return (
    <div>
      <PageTitle title="AppForge generations" blurb="Every project generated by AppForge across all users." />
      <div className="border border-border divide-y divide-border" data-testid="admin-appforge">
        {(gens || []).map(g => (
          <div key={g.id} className="p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{g.project_name || g.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{g.user_email || '—'} · {g.project_kind} · {new Date(g.created_at).toLocaleString()}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2">{g.summary}</div>
            <div className="text-[10px] text-muted-foreground mt-2 font-mono">{g.stack}</div>
          </div>
        ))}
        {gens?.length === 0 && <div className="p-6 text-muted-foreground text-sm">No generations yet.</div>}
      </div>
    </div>
  );
}

/* ==================== AUDIT ==================== */
function AuditAdmin() {
  const [logs, setLogs] = useState(null);
  useEffect(() => { api.get('/admin/audit-logs', { params: { limit: 200 } }).then(r => setLogs(r.data)); }, []);
  return (
    <div>
      <PageTitle title="Audit log" blurb="Every privileged action, logged and immutable." />
      <div className="border border-border divide-y divide-border" data-testid="admin-audit-list">
        {(logs || []).map(a => (
          <div key={a.id} className="p-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 md:items-center">
            <div>
              <div className="font-mono text-xs text-primary">{a.action}</div>
              <div className="text-xs text-muted-foreground mt-1">actor: {a.actor_id || '—'} · target: {a.target || '—'}</div>
              {a.meta && Object.keys(a.meta).length > 0 && <div className="text-[10px] text-muted-foreground font-mono mt-1">{JSON.stringify(a.meta)}</div>}
            </div>
            <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
          </div>
        ))}
        {logs?.length === 0 && <div className="p-6 text-muted-foreground text-sm">No entries.</div>}
      </div>
    </div>
  );
}

/* ==================== SETTINGS ==================== */
function SettingsAdmin() {
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState({});
  const load = () => api.get('/admin/settings').then(r => { setCurrent(r.data); });
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const save = async (e) => {
    e.preventDefault();
    // Filter out empty strings so we don't overwrite existing values with blanks
    const clean = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '' && v !== undefined && v !== null));
    if (Object.keys(clean).length === 0) { toast.error('Nothing to save'); return; }
    try {
      await api.put('/admin/settings', clean);
      toast.success('Settings updated & applied live');
      setForm({}); load();
    } catch (er) { toast.error(formatApiError(er)); }
  };
  return (
    <div>
      <PageTitle title="Settings" blurb="Rotate Stripe keys and email provider on the fly — no restart required." />
      {current && (
        <div className="border border-border p-6 mb-8" data-testid="settings-current">
          <div className="overline">Current configuration</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 text-xs">
            <div><div className="text-muted-foreground">Stripe mode</div><div className={`mt-1 font-mono ${current.stripe_mode === 'live' ? 'text-emerald-400' : 'text-amber-400'}`}>{current.stripe_mode}</div></div>
            <div><div className="text-muted-foreground">Secret key</div><div className="mt-1 font-mono">{current.stripe_secret_key_masked || '—'}</div></div>
            <div><div className="text-muted-foreground">Webhook secret</div><div className="mt-1 font-mono">{current.stripe_webhook_secret_masked || '—'}</div></div>
            <div><div className="text-muted-foreground">Tax mode</div><div className="mt-1 font-mono">{current.stripe_tax_mode || 'full'}</div></div>
            <div><div className="text-muted-foreground">Email provider</div><div className="mt-1 font-mono">{current.email_provider || 'console'}</div></div>
            <div><div className="text-muted-foreground">Email from</div><div className="mt-1 font-mono">{current.email_from || '—'}</div></div>
          </div>
        </div>
      )}
      <form onSubmit={save} className="border border-border p-6 grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="settings-form">
        <div className="md:col-span-2 overline flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Stripe</div>
        <Field label="Live/test secret key (sk_live_... or sk_test_...)" k="stripe_secret_key" placeholder="sk_live_..." form={form} setForm={setForm} setter={set} />
        <Field label="Publishable key" k="stripe_publishable_key" placeholder="pk_live_..." form={form} setForm={setForm} setter={set} />
        <Field label="Webhook signing secret" k="stripe_webhook_secret" placeholder="whsec_..." form={form} setForm={setForm} setter={set} />
        <label className="text-xs"><div className="text-muted-foreground uppercase tracking-wider mb-1">Tax mode</div>
          <select value={form.stripe_tax_mode || ''} onChange={set('stripe_tax_mode')} className="w-full bg-card border border-border rounded-md px-3 py-2" data-testid="setting-tax">
            <option value="">— unchanged —</option>
            <option value="full">full (Stripe managed payments)</option>
            <option value="calc_only">calc_only (Stripe Tax calc)</option>
            <option value="diy">diy (you handle tax, e.g. Hnry)</option>
          </select></label>

        <div className="md:col-span-2 overline flex items-center gap-2 mt-4"><Mail className="w-4 h-4" /> Email</div>
        <label className="text-xs"><div className="text-muted-foreground uppercase tracking-wider mb-1">Provider</div>
          <select value={form.email_provider || ''} onChange={set('email_provider')} className="w-full bg-card border border-border rounded-md px-3 py-2" data-testid="setting-email-provider">
            <option value="">— unchanged —</option>
            <option value="console">console (log only)</option>
            <option value="resend">Resend</option>
            <option value="smtp">SMTP</option>
          </select></label>
        <Field label="Resend API key" k="resend_api_key" placeholder="re_..." form={form} setForm={setForm} setter={set} />
        <Field label="SMTP host" k="smtp_host" form={form} setForm={setForm} setter={set} />
        <Field label="SMTP port" k="smtp_port" type="number" form={form} setForm={setForm} setter={set} />
        <Field label="SMTP user" k="smtp_user" form={form} setForm={setForm} setter={set} />
        <Field label="SMTP password" k="smtp_password" form={form} setForm={setForm} setter={set} />
        <Field label="Email from" k="email_from" placeholder="hello@trillionaitech.com" form={form} setForm={setForm} setter={set} />
        <Field label="Email from name" k="email_from_name" placeholder="Trillion AI Tech" form={form} setForm={setForm} setter={set} />

        <div className="md:col-span-2 mt-4 flex justify-end"><button className="btn-primary" data-testid="settings-save">Save & apply live</button></div>
      </form>
    </div>
  );
}

function Field({ label, k, placeholder = '', type = 'text', form, setForm, setter }) {
  return (
    <label className="text-xs">
      <div className="text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <input type={type} value={form[k] || ''} onChange={setter(k)} placeholder={placeholder} className="w-full bg-transparent border border-border rounded-md px-3 py-2 outline-none focus:border-primary" data-testid={`setting-${k}`} />
    </label>
  );
}

/* ==================== SHARED ==================== */
function PageTitle({ title, blurb, right }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight">{title}</h1>
        {blurb && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{blurb}</p>}
      </div>
      {right}
    </div>
  );
}

function SkelBlock() {
  return <div className="border border-border p-10 animate-pulse space-y-3"><div className="h-4 w-32 bg-secondary rounded" /><div className="h-8 w-64 bg-secondary rounded" /></div>;
}

import { useEffect, useState } from 'react';
import { api, formatApiError } from '../lib/api';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, X } from 'lucide-react';

const EMPTY = {
  slug: '', name: '', short_description: '', description: '',
  category: 'apps', status: 'coming-soon', featured: false,
  image: '', logo: '',
  features: [], tags: [],
  billing_type: 'free', price: null, currency: 'USD',
  stripe_product_id: '', stripe_price_id: '',
  external_url: '', demo_url: '', documentation_url: '', github_url: '',
  version: '', release_date: '', seo_title: '', seo_description: '',
  screenshots: [], subcategory: '',
};

function cleanForApi(f) {
  const cleaned = { ...f };
  ['stripe_product_id','stripe_price_id','external_url','demo_url','documentation_url','github_url','version','release_date','seo_title','seo_description','image','logo','subcategory'].forEach(k => {
    if (cleaned[k] === '') cleaned[k] = null;
  });
  if (cleaned.price === '' || cleaned.price === null) cleaned.price = null;
  else cleaned.price = Number(cleaned.price);
  return cleaned;
}

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState(null);
  const [audit, setAudit] = useState([]);
  const [editing, setEditing] = useState(null); // { mode: 'new'|'edit', data }
  const [tab, setTab] = useState('products');

  const loadAll = async () => {
    const [s, p, a] = await Promise.all([
      api.get('/admin/stats'),
      api.get('/products', { params: { limit: 200 } }),
      api.get('/admin/audit-logs', { params: { limit: 50 } }),
    ]);
    setStats(s.data); setProducts(p.data); setAudit(a.data);
  };
  useEffect(() => { loadAll().catch(e => toast.error(formatApiError(e))); }, []);

  const save = async (data) => {
    const payload = cleanForApi(data);
    try {
      if (editing.mode === 'new') {
        await api.post('/admin/products', payload);
        toast.success('Product created');
      } else {
        await api.put(`/admin/products/${editing.original}`, payload);
        toast.success('Product updated');
      }
      setEditing(null);
      loadAll();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const del = async (slug) => {
    if (!window.confirm(`Delete ${slug}?`)) return;
    try { await api.delete(`/admin/products/${slug}`); toast.success('Deleted'); loadAll(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="container-x py-16">
      <div className="overline">Admin</div>
      <h1 className="font-display font-black text-4xl md:text-5xl mt-3 tracking-tightest">Product management</h1>
      <p className="text-muted-foreground mt-3">Create, edit and archive products. All actions are logged.</p>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border border border-border mt-10" data-testid="admin-stats">
          {[['users','Users'],['products','Products'],['active_products','Active'],['coming_soon','Coming soon'],['waitlist','Waitlist']].map(([k,l]) => (
            <div key={k} className="card-flat p-5">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{l}</div>
              <div className="font-display font-bold text-3xl mt-2">{stats[k]}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-10">
        <div className="flex gap-1">
          {['products','audit'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`text-xs px-3 py-1.5 rounded-full border ${tab === t ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'}`} data-testid={`admin-tab-${t}`}>
              {t === 'products' ? 'Products' : 'Audit log'}
            </button>
          ))}
        </div>
        {tab === 'products' && (
          <button onClick={() => setEditing({ mode: 'new', data: { ...EMPTY }, original: '' })} className="btn-primary text-xs !py-1.5 !px-3" data-testid="admin-new-product">
            <Plus className="w-3.5 h-3.5" /> New product
          </button>
        )}
      </div>

      {tab === 'products' && (
        <div className="border border-border mt-6 divide-y divide-border" data-testid="admin-products-list">
          {(products || []).map(p => (
            <div key={p.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground truncate">{p.slug} · {p.category} · {p.status}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing({ mode: 'edit', data: { ...EMPTY, ...p }, original: p.slug })} className="p-2 hover:bg-secondary rounded-md" data-testid={`admin-edit-${p.slug}`}><Pencil className="w-4 h-4" /></button>
                <button onClick={() => del(p.slug)} className="p-2 hover:bg-secondary rounded-md text-destructive" data-testid={`admin-delete-${p.slug}`}><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
          {products?.length === 0 && <div className="p-6 text-muted-foreground text-sm">No products yet.</div>}
        </div>
      )}

      {tab === 'audit' && (
        <div className="border border-border mt-6 divide-y divide-border" data-testid="admin-audit-list">
          {audit.map(a => (
            <div key={a.id} className="p-4 text-sm flex items-center justify-between gap-4">
              <div>
                <div className="font-mono text-xs text-primary">{a.action}</div>
                <div className="text-xs text-muted-foreground mt-1">actor: {a.actor_id || '—'} · target: {a.target || '—'}</div>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
            </div>
          ))}
          {audit.length === 0 && <div className="p-6 text-muted-foreground text-sm">No entries.</div>}
        </div>
      )}

      {editing && <ProductForm editing={editing} onCancel={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function ProductForm({ editing, onCancel, onSave }) {
  const [data, setData] = useState(editing.data);
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setData(d => ({ ...d, [k]: v }));
  };
  const setList = (k) => (e) => {
    const arr = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    setData(d => ({ ...d, [k]: arr }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-start justify-center overflow-y-auto p-4" data-testid="admin-product-modal">
      <div className="w-full max-w-3xl bg-card border border-border my-8">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <div className="overline">{editing.mode === 'new' ? 'Create' : 'Edit'}</div>
            <div className="font-display font-bold text-xl mt-1">{data.name || 'New product'}</div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-secondary rounded-md" data-testid="admin-modal-close"><X className="w-4 h-4" /></button>
        </div>
        <form className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={e => { e.preventDefault(); onSave(data); }}>
          {[
            ['slug','Slug (kebab-case)'], ['name','Name'],
            ['short_description','Short description'],
            ['image','Image URL'], ['logo','Logo URL'],
            ['version','Version'], ['release_date','Release date'],
            ['external_url','Product URL'], ['demo_url','Demo URL'],
            ['documentation_url','Docs URL'], ['github_url','GitHub URL'],
            ['stripe_product_id','Stripe product ID'], ['stripe_price_id','Stripe price ID'],
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
            <div className="text-muted-foreground uppercase tracking-wider mb-1">Price</div>
            <input type="number" step="0.01" value={data.price ?? ''} onChange={set('price')} className="w-full bg-transparent border border-border rounded-md px-3 py-2 outline-none focus:border-primary" data-testid="admin-field-price" />
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

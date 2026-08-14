import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../lib/api';
import { ProductGrid, ProductSkeleton } from '../components/ProductCard';
import { CATEGORY_META } from '../lib/utils';

const CATS = ['all', 'apps', 'agents', 'tools', 'software', 'games'];
const STATUSES = ['all', 'active', 'beta', 'coming-soon'];

export default function Products({ fixedCategory, title, blurb, hideCategoryFilter }) {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState(null);
  const [q, setQ] = useState(params.get('q') || '');
  const [cat, setCat] = useState(fixedCategory || 'all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    const p = {};
    const useCat = fixedCategory || cat;
    if (useCat !== 'all') p.category = useCat;
    if (status !== 'all') p.status = status;
    if (q) p.q = q;
    api.get('/products', { params: p }).then(r => { if (!cancelled) setItems(r.data); }).catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [cat, status, q, fixedCategory]);

  const pageTitle = title || (fixedCategory ? CATEGORY_META[fixedCategory]?.label : 'All products');
  const pageBlurb = blurb || 'Browse the full Trillion AI Tech catalogue. Every product is data-driven and can be extended without touching the frontend.';

  return (
    <div className="container-x py-16 md:py-24">
      <div className="overline mb-4">Catalogue</div>
      <h1 className="font-display font-black text-4xl md:text-6xl tracking-tightest text-balance">{pageTitle}</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl">{pageBlurb}</p>

      <div className="mt-10 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 border border-border rounded-full px-4 py-2 max-w-md w-full">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setParams(prev => { const s = new URLSearchParams(prev); if (e.target.value) s.set('q', e.target.value); else s.delete('q'); return s; }); }}
            placeholder="Search products…"
            className="bg-transparent outline-none text-sm flex-1"
            data-testid="products-search"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {!hideCategoryFilter && CATS.map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${cat === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
              data-testid={`filter-cat-${c}`}
            >
              {c === 'all' ? 'All' : CATEGORY_META[c]?.label}
            </button>
          ))}
          <div className="w-px bg-border mx-1 hidden md:block" />
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${status === s ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground'}`}
              data-testid={`filter-status-${s}`}
            >
              {s === 'all' ? 'Any status' : s.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10">
        {items === null ? <ProductSkeleton /> : <ProductGrid items={items} />}
      </div>
    </div>
  );
}

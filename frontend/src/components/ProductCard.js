import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { CATEGORY_META, STATUS_META, formatPrice } from '../lib/utils';

export function ProductCard({ p, index = 0 }) {
  const cat = CATEGORY_META[p.category] || { label: p.category };
  const st = STATUS_META[p.status] || { label: p.status, tone: 'text-muted-foreground' };
  const price = formatPrice(p);
  return (
    <Link
      to={`/products/${p.slug}`}
      className="card-flat p-6 flex flex-col group animate-fade-up"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      data-testid={`product-card-${p.slug}`}
    >
      <div className="flex items-center justify-between text-xs">
        <span className="overline">{cat.label}</span>
        <span className={`text-xs font-medium ${st.tone}`}>{st.label}</span>
      </div>
      <h3 className="font-display text-xl md:text-2xl font-bold mt-4 tracking-tight">{p.name}</h3>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">{p.short_description}</p>
      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">{price || (p.status === 'coming-soon' ? 'TBA' : '—')}</span>
        <span className="inline-flex items-center gap-1 text-muted-foreground group-hover:text-primary transition-colors">
          View <ArrowUpRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
}

export function ProductGrid({ items, empty }) {
  if (!items?.length) return empty || (
    <div className="card-flat p-16 text-center" data-testid="empty-state">
      <div className="overline">No results</div>
      <p className="text-muted-foreground mt-3">Nothing here yet — check back soon.</p>
    </div>
  );
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
      {items.map((p, i) => <ProductCard key={p.id || p.slug} p={p} index={i} />)}
    </div>
  );
}

export function ProductSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-flat p-6 h-52">
          <div className="h-3 w-24 bg-secondary animate-pulse rounded" />
          <div className="h-6 w-3/4 bg-secondary animate-pulse rounded mt-4" />
          <div className="h-3 w-full bg-secondary animate-pulse rounded mt-3" />
          <div className="h-3 w-5/6 bg-secondary animate-pulse rounded mt-2" />
        </div>
      ))}
    </div>
  );
}

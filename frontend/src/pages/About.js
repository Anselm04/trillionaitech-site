import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ProductGrid, ProductSkeleton } from '../components/ProductCard';

export function About() {
  return (
    <div className="container-x py-24">
      <div className="overline">Company</div>
      <h1 className="font-display font-black text-5xl md:text-7xl mt-4 tracking-tightest text-balance">
        An independent studio, building at production scale.
      </h1>
      <p className="text-lg text-muted-foreground mt-6 max-w-3xl leading-relaxed">
        Trillion AI Tech is an independent technology studio based in Aotearoa New Zealand. We build AI-native applications, autonomous agents, developer tools, professional software, and games — all under one continuously-expanding catalogue.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border mt-16">
        {[
          { t: 'Independent', b: 'No investor mandate. We build what we believe should exist.' },
          { t: 'Continual releases', b: 'The catalogue grows every quarter — new apps, agents and tools.' },
          { t: 'Security-first', b: 'Auth, authorization, audit and encryption designed in from day one.' },
        ].map(x => (
          <div key={x.t} className="card-flat p-8">
            <div className="overline">{x.t}</div>
            <p className="text-muted-foreground mt-4 leading-relaxed">{x.b}</p>
          </div>
        ))}
      </div>

      <div className="mt-20">
        <div className="overline">Vision</div>
        <h2 className="font-display font-bold text-3xl md:text-5xl mt-4 tracking-tight max-w-3xl text-balance">
          Sharp software, playable systems, useful agents.
        </h2>
        <p className="text-muted-foreground mt-6 max-w-3xl leading-relaxed">
          The long-term goal is a durable catalogue of products people actually use — shipped through a trusted public storefront with real accounts, real subscriptions, and real support.
        </p>
        <Link to="/contact" className="btn-primary mt-8 inline-flex">Get in touch</Link>
      </div>
    </div>
  );
}

export function ComingSoon() {
  return (
    <div>
      <div className="container-x py-24">
        <div className="overline">In development</div>
        <h1 className="font-display font-black text-5xl md:text-7xl mt-4 tracking-tightest text-balance">
          Coming soon.
        </h1>
        <p className="text-lg text-muted-foreground mt-6 max-w-2xl leading-relaxed">
          Products currently in development. Sign up to any product's waitlist and we'll email you the moment it's ready.
        </p>
      </div>
      <ComingSoonList />
    </div>
  );
}

function ComingSoonList() {
  const [items, setItems] = useState(null);
  useEffect(() => {
    api.get('/products', { params: { status: 'coming-soon', limit: 200 } })
      .then(r => setItems(r.data)).catch(() => setItems([]));
  }, []);
  return (
    <div className="container-x pb-24">
      {items === null ? <ProductSkeleton count={9} /> : <ProductGrid items={items} />}
    </div>
  );
}

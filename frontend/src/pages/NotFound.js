import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-x py-32 text-center">
      <div className="overline">404</div>
      <h1 className="font-display font-black text-6xl md:text-8xl mt-4 tracking-tightest">Page not found.</h1>
      <p className="text-muted-foreground mt-6 max-w-xl mx-auto">The page you were looking for has moved, been renamed, or never existed.</p>
      <div className="mt-10 flex justify-center gap-3">
        <Link to="/" className="btn-primary" data-testid="nf-home">Home</Link>
        <Link to="/products" className="btn-ghost" data-testid="nf-products">Browse products</Link>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const { user, logout } = useAuth();
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
        </div>
        <div className="card-flat p-6">
          <div className="overline">Subscriptions</div>
          <p className="text-sm text-muted-foreground mt-4">You don't have any active subscriptions yet. Once payment integration is enabled, your subscriptions will appear here.</p>
        </div>
        <div className="card-flat p-6">
          <div className="overline">Purchases</div>
          <p className="text-sm text-muted-foreground mt-4">No one-time purchases yet. Browse the catalogue to find products.</p>
          <Link to="/products" className="btn-ghost mt-5 text-xs !py-1.5 !px-3">Browse products</Link>
        </div>
      </div>

      <div className="mt-10 flex gap-3">
        {user.role === 'admin' && <Link to="/admin" className="btn-primary" data-testid="account-admin-link">Open admin</Link>}
        <button onClick={logout} className="btn-ghost" data-testid="account-signout">Sign out</button>
      </div>
    </div>
  );
}

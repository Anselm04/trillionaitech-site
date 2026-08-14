import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatApiError } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      await login(email, password);
      const to = loc.state?.from || '/account';
      nav(to, { replace: true });
    } catch (er) { setErr(formatApiError(er)); }
    finally { setLoading(false); }
  };

  return (
    <div className="container-x py-24 max-w-md">
      <div className="overline">Account</div>
      <h1 className="font-display font-black text-4xl md:text-5xl mt-3 tracking-tightest">Sign in</h1>
      <p className="text-muted-foreground mt-3">Welcome back. Access your products and subscriptions.</p>

      <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
            className="w-full mt-1.5 bg-transparent border border-border rounded-md px-3 py-2.5 outline-none focus:border-primary" data-testid="login-email" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Password</label>
          <input required type="password" value={password} onChange={e => setPassword(e.target.value)}
            className="w-full mt-1.5 bg-transparent border border-border rounded-md px-3 py-2.5 outline-none focus:border-primary" data-testid="login-password" />
        </div>
        {err && <div className="text-sm text-destructive" data-testid="login-error">{err}</div>}
        <button className="btn-primary w-full justify-center" disabled={loading} data-testid="login-submit">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="text-sm text-muted-foreground mt-6">
        No account? <Link to="/register" className="text-foreground hover:text-primary">Create one</Link>
      </div>
    </div>
  );
}

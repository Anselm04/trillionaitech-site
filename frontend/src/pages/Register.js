import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatApiError } from '../lib/api';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      nav('/account', { replace: true });
    } catch (er) { setErr(formatApiError(er)); }
    finally { setLoading(false); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="container-x py-24 max-w-md">
      <div className="overline">Account</div>
      <h1 className="font-display font-black text-4xl md:text-5xl mt-3 tracking-tightest">Create account</h1>
      <p className="text-muted-foreground mt-3">Get early access to new products and manage your subscriptions.</p>

      <form onSubmit={submit} className="mt-8 space-y-4" data-testid="register-form">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Name</label>
          <input required minLength={1} value={form.name} onChange={set('name')}
            className="w-full mt-1.5 bg-transparent border border-border rounded-md px-3 py-2.5 outline-none focus:border-primary" data-testid="register-name" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Email</label>
          <input required type="email" value={form.email} onChange={set('email')}
            className="w-full mt-1.5 bg-transparent border border-border rounded-md px-3 py-2.5 outline-none focus:border-primary" data-testid="register-email" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider">Password (min 8)</label>
          <input required type="password" minLength={8} value={form.password} onChange={set('password')}
            className="w-full mt-1.5 bg-transparent border border-border rounded-md px-3 py-2.5 outline-none focus:border-primary" data-testid="register-password" />
        </div>
        {err && <div className="text-sm text-destructive" data-testid="register-error">{err}</div>}
        <button className="btn-primary w-full justify-center" disabled={loading} data-testid="register-submit">
          {loading ? 'Creating…' : 'Create account'}
        </button>
        <p className="text-xs text-muted-foreground">
          By creating an account you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </form>
      <div className="text-sm text-muted-foreground mt-6">
        Have an account? <Link to="/login" className="text-foreground hover:text-primary">Sign in</Link>
      </div>
    </div>
  );
}

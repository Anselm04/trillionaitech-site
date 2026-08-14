import { useState } from 'react';
import { api, formatApiError } from '../lib/api';
import { toast } from 'sonner';

export default function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (next !== confirm) { toast.error('New passwords do not match'); return; }
    if (next.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await api.post('/auth/change-password', { current_password: current, new_password: next });
      toast.success('Password changed.');
      setCurrent(''); setNext(''); setConfirm('');
    } catch (er) {
      toast.error(formatApiError(er));
    } finally { setLoading(false); }
  };

  return (
    <div className="border border-border p-6 mt-10 max-w-xl" data-testid="change-password-card">
      <div className="overline">Security</div>
      <h3 className="font-display font-bold text-xl mt-2">Change password</h3>
      <p className="text-sm text-muted-foreground mt-1">Requires your current password. Choose 8+ characters.</p>
      <form onSubmit={submit} className="mt-5 space-y-3" data-testid="change-password-form">
        <input type="password" required placeholder="Current password" value={current} onChange={e => setCurrent(e.target.value)} className="w-full bg-transparent border border-border rounded-md px-3 py-2.5 outline-none focus:border-primary text-sm" data-testid="cp-current" />
        <input type="password" required minLength={8} placeholder="New password (min 8)" value={next} onChange={e => setNext(e.target.value)} className="w-full bg-transparent border border-border rounded-md px-3 py-2.5 outline-none focus:border-primary text-sm" data-testid="cp-new" />
        <input type="password" required minLength={8} placeholder="Confirm new password" value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full bg-transparent border border-border rounded-md px-3 py-2.5 outline-none focus:border-primary text-sm" data-testid="cp-confirm" />
        <button className="btn-primary" disabled={loading} data-testid="cp-submit">
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}

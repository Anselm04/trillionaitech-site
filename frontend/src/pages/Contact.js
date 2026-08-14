import { useState } from 'react';
import { api, formatApiError } from '../lib/api';
import { toast } from 'sonner';
import { Mail, MapPin } from 'lucide-react';

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/contact', form);
      setSent(true); setForm({ name: '', email: '', subject: '', message: '' });
      toast.success("Message sent. We'll reply within 2 business days.");
    } catch (er) { toast.error(formatApiError(er)); }
    finally { setLoading(false); }
  };

  return (
    <div className="container-x py-24 grid grid-cols-1 md:grid-cols-2 gap-16">
      <div>
        <div className="overline">Contact</div>
        <h1 className="font-display font-black text-5xl md:text-6xl mt-4 tracking-tightest text-balance">Get in touch.</h1>
        <p className="text-muted-foreground mt-6 max-w-md">
          Questions about products, partnerships, or press? We reply within two business days.
        </p>
        <div className="mt-10 space-y-4 text-sm">
          <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-primary" /> <a href="mailto:hello@trillionaitech.com" className="hover:text-primary">hello@trillionaitech.com</a></div>
          <div className="flex items-center gap-3"><MapPin className="w-4 h-4 text-primary" /> Aotearoa · New Zealand</div>
        </div>
      </div>
      <form onSubmit={submit} className="border border-border p-8 space-y-4" data-testid="contact-form">
        {sent && <div className="text-sm text-primary" data-testid="contact-success">Message received — we'll be in touch.</div>}
        {[['name','Name'],['email','Email'],['subject','Subject']].map(([k,l]) => (
          <label key={k} className="block text-xs">
            <div className="text-muted-foreground uppercase tracking-wider mb-1.5">{l}</div>
            <input required type={k==='email'?'email':'text'} value={form[k]} onChange={set(k)} className="w-full bg-transparent border border-border rounded-md px-3 py-2.5 outline-none focus:border-primary" data-testid={`contact-${k}`} />
          </label>
        ))}
        <label className="block text-xs">
          <div className="text-muted-foreground uppercase tracking-wider mb-1.5">Message</div>
          <textarea required rows={5} value={form.message} onChange={set('message')} className="w-full bg-transparent border border-border rounded-md px-3 py-2.5 outline-none focus:border-primary" data-testid="contact-message" />
        </label>
        <button className="btn-primary w-full justify-center" disabled={loading} data-testid="contact-submit">
          {loading ? 'Sending…' : 'Send message'}
        </button>
      </form>
    </div>
  );
}

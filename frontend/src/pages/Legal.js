import { Link } from 'react-router-dom';

const LEGAL = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'January 2026',
    body: [
      ['Overview', 'Trillion AI Tech ("we", "our") builds AI-native software and product experiences. This policy explains how we collect, use, store and protect information when you use our website and products.'],
      ['Data we collect', 'Account data (name, email, password hash), usage telemetry (aggregate), waitlist email addresses, and support/contact form messages. We do not sell personal data.'],
      ['How we use it', 'To operate accounts, deliver products, prevent abuse, and communicate about products you asked about. Marketing communications require your opt-in.'],
      ['Security', 'Passwords are bcrypt-hashed. Sessions use httpOnly cookies. All traffic is served over HTTPS. Admin operations are audit-logged.'],
      ['Data retention & deletion', 'You can request deletion of your account and associated personal data at any time by writing to privacy@trillionaitech.com. We retain audit and billing records as required by law.'],
      ['Sub-processors', 'We use standard cloud infrastructure and payment providers. A current list is available on request.'],
      ['Contact', 'privacy@trillionaitech.com'],
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'January 2026',
    body: [
      ['Acceptance', 'By using trillionaitech.com and any Trillion AI Tech product, you agree to these terms.'],
      ['Accounts', 'You are responsible for the security of your credentials. Do not share accounts. We may suspend accounts that violate these terms.'],
      ['Acceptable use', 'No abusive, illegal, or malicious use. No attempts to bypass authentication or authorization. No use that infringes third-party rights.'],
      ['Products', 'Some products are free, others are paid (one-time or subscription). Prices, features and availability may change with notice.'],
      ['Termination', 'You may close your account at any time. We may terminate accounts for material breach with reasonable notice where possible.'],
      ['Warranty & liability', 'Services are provided "as is". To the maximum extent permitted by law, we exclude implied warranties and limit liability to fees paid in the prior 12 months.'],
      ['Governing law', 'Aotearoa New Zealand law applies. Disputes are resolved in NZ courts unless otherwise required by consumer law.'],
    ],
  },
  refunds: {
    title: 'Refund Policy',
    updated: 'January 2026',
    body: [
      ['Subscriptions', 'You may cancel any subscription at any time. Cancellations take effect at the end of the current billing period. We do not typically refund partial periods.'],
      ['One-time purchases', 'Digital goods are generally non-refundable once activated. If a product does not perform as described within 14 days of purchase, contact refunds@trillionaitech.com and we will work with you in good faith.'],
      ['Chargebacks', 'Please contact us first — most issues can be resolved quickly.'],
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    updated: 'January 2026',
    body: [
      ['What we use', 'Strictly necessary cookies for authentication (httpOnly, SameSite=None, Secure) and preference cookies (theme). We do not currently deploy third-party analytics or advertising cookies.'],
      ['Your choices', 'You can clear cookies in your browser at any time. Note that clearing auth cookies will sign you out.'],
    ],
  },
  security: {
    title: 'Security',
    updated: 'January 2026',
    body: [
      ['Architecture', 'FastAPI + MongoDB + React. TLS everywhere, secure httpOnly session cookies, JWT with short-lived access + refresh, brute-force lockout, and audit logging for privileged actions.'],
      ['Authentication', 'Passwords hashed with bcrypt. Password reset tokens are single-use and expire in one hour. Admin routes require server-side role checks — the UI is not the security boundary.'],
      ['Data protection', 'Encryption in transit (HTTPS). Least-privilege database access. No secrets in client-side code. Secrets managed via environment variables.'],
      ['Responsible disclosure', 'Please email security@trillionaitech.com. Do not exploit vulnerabilities beyond what is needed to demonstrate them. We aim to respond within 5 business days.'],
      ['Compliance readiness', 'We are building controls compatible with programs such as SOC 2 / Vanta (access control, least privilege, audit logging, change management, dependency management). We do not claim certification we have not obtained.'],
    ],
  },
};

export default function Legal({ page }) {
  const doc = LEGAL[page];
  if (!doc) return null;
  return (
    <div className="container-x py-24 max-w-3xl">
      <div className="overline">Legal · Updated {doc.updated}</div>
      <h1 className="font-display font-black text-5xl md:text-6xl mt-4 tracking-tightest">{doc.title}</h1>
      <div className="mt-12 space-y-10">
        {doc.body.map(([h, p]) => (
          <section key={h}>
            <h2 className="font-display font-bold text-2xl tracking-tight">{h}</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">{p}</p>
          </section>
        ))}
      </div>
      <div className="mt-16 text-sm text-muted-foreground">
        Questions? <Link to="/contact" className="text-foreground hover:text-primary">Contact us</Link>.
      </div>
    </div>
  );
}

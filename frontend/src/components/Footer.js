import { Link } from 'react-router-dom';

const footerCols = [
  {
    heading: 'Products',
    links: [
      { to: '/products', label: 'All products' },
      { to: '/apps', label: 'AI Apps' },
      { to: '/agents', label: 'AI Agents' },
      { to: '/tools', label: 'Tools' },
      { to: '/software', label: 'Software' },
      { to: '/games', label: 'Games' },
      { to: '/coming-soon', label: 'Coming Soon' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/contact', label: 'Contact' },
      { to: '/security', label: 'Security' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy' },
      { to: '/terms', label: 'Terms' },
      { to: '/refunds', label: 'Refunds' },
      { to: '/cookies', label: 'Cookies' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-border mt-24" data-testid="site-footer">
      <div className="container-x py-16 grid grid-cols-2 md:grid-cols-4 gap-10">
        <div className="col-span-2 md:col-span-1">
          <div className="font-display font-black tracking-tighter text-lg">TRILLION AI TECH</div>
          <div className="text-[10px] tracking-[0.25em] text-muted-foreground font-semibold mt-1">STUDIO · AOTEAROA</div>
          <p className="text-sm text-muted-foreground mt-5 max-w-xs">
            An independent studio building AI-native software, agents, tools and games from Aotearoa New Zealand.
          </p>
          <a href="mailto:hello@trillionaitech.com" className="text-sm text-foreground hover:text-primary mt-4 inline-block" data-testid="footer-email">hello@trillionaitech.com</a>
        </div>
        {footerCols.map(col => (
          <div key={col.heading}>
            <div className="overline mb-4">{col.heading}</div>
            <ul className="space-y-2.5">
              {col.links.map(l => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid={`footer-link-${l.label.toLowerCase().replace(/\s+/g, '-')}`}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-x py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} Trillion AI Tech. All rights reserved.</div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}

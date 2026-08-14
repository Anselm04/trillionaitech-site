import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Sun, Moon, Menu, X, Search as SearchIcon, User, Globe } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useI18n, useT } from '../context/I18nContext';
import { cn } from '../lib/utils';

const NAV_LINKS = [
  { to: '/', key: 'nav.home' },
  { to: '/products', key: 'nav.products' },
  { to: '/apps', key: 'nav.apps' },
  { to: '/agents', key: 'nav.agents' },
  { to: '/tools', key: 'nav.tools' },
  { to: '/software', key: 'nav.software' },
  { to: '/games', key: 'nav.games' },
  { to: '/appforge', key: 'nav.appforge' },
  { to: '/coming-soon', key: 'nav.coming_soon' },
  { to: '/about', key: 'nav.about' },
  { to: '/contact', key: 'nav.contact' },
];

function TLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <rect x="20" y="25" width="14" height="14" fill="currentColor" />
      <rect x="38" y="25" width="14" height="14" fill="currentColor" />
      <rect x="56" y="25" width="14" height="14" fill="currentColor" />
      <rect x="74" y="25" width="14" height="14" fill="#f97316" />
      <rect x="47" y="43" width="14" height="14" fill="currentColor" />
      <rect x="47" y="61" width="14" height="14" fill="currentColor" />
      <rect x="47" y="79" width="14" height="14" fill="#888888" />
    </svg>
  );
}

export default function Header() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { lang, setLang, languages } = useI18n();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [q, setQ] = useState('');
  const nav = useNavigate();

  const submitSearch = (e) => {
    e.preventDefault();
    if (q.trim()) {
      nav(`/products?q=${encodeURIComponent(q.trim())}`);
      setShowSearch(false);
      setOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 glass-nav" data-testid="site-header">
      <div className="container-x flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2.5 focus-ring rounded-md" data-testid="logo-home-link">
          <TLogo size={28} />
          <div className="leading-tight">
            <div className="font-display font-black text-[15px] tracking-tighter">TRILLION AI TECH</div>
            <div className="text-[9px] tracking-[0.25em] text-muted-foreground font-semibold">STUDIO · AOTEAROA</div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
          {NAV_LINKS.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) => cn(
                'px-3 py-2 text-sm rounded-md text-muted-foreground hover:text-foreground transition-colors',
                isActive && 'text-foreground'
              )}
              data-testid={`nav-link-${l.key.replace('nav.', '')}`}
            >
              {t(l.key)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowSearch(s => !s)} aria-label="Search" className="p-2 rounded-md hover:bg-secondary focus-ring" data-testid="search-toggle">
            <SearchIcon className="w-4 h-4" />
          </button>
          <div className="relative">
            <button onClick={() => setShowLang(s => !s)} aria-label="Language" className="p-2 rounded-md hover:bg-secondary focus-ring flex items-center gap-1" data-testid="lang-toggle">
              <Globe className="w-4 h-4" />
              <span className="text-[10px] font-bold">{lang.toUpperCase()}</span>
            </button>
            {showLang && (
              <div className="absolute right-0 top-full mt-1 min-w-[180px] bg-card border border-border rounded-md py-1 z-50" data-testid="lang-menu">
                {languages.map(l => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); setShowLang(false); }}
                    className={cn('w-full px-3 py-2 text-left text-sm hover:bg-secondary flex items-center justify-between', lang === l.code && 'text-primary')}
                    data-testid={`lang-option-${l.code}`}
                  >
                    <span>{l.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{l.flag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={toggle} aria-label="Toggle theme" className="p-2 rounded-md hover:bg-secondary focus-ring" data-testid="theme-toggle">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {user && user.id ? (
            <div className="hidden md:flex items-center gap-1.5">
              {user.role === 'admin' && (
                <Link to="/admin" className="btn-ghost text-xs !py-1.5 !px-3" data-testid="nav-admin">{t('nav.admin')}</Link>
              )}
              <Link to="/account" className="btn-ghost text-xs !py-1.5 !px-3" data-testid="nav-account">
                <User className="w-3.5 h-3.5" /> {t('nav.account')}
              </Link>
              <button onClick={logout} className="text-xs text-muted-foreground hover:text-foreground px-2" data-testid="nav-logout">{t('nav.signout')}</button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-1.5">
              <Link to="/login" className="btn-ghost text-xs !py-1.5 !px-3" data-testid="nav-login">{t('nav.signin')}</Link>
              <Link to="/register" className="btn-primary text-xs !py-1.5 !px-3" data-testid="nav-signup">{t('nav.signup')}</Link>
            </div>
          )}

          <button className="lg:hidden p-2 rounded-md hover:bg-secondary focus-ring" onClick={() => setOpen(o => !o)} aria-label="Menu" data-testid="mobile-menu-toggle">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {showSearch && (
        <div className="border-t border-border bg-background/95 backdrop-blur">
          <form onSubmit={submitSearch} className="container-x py-3 flex items-center gap-3">
            <SearchIcon className="w-4 h-4 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={t('nav.search_ph')}
              className="flex-1 bg-transparent outline-none text-sm"
              data-testid="search-input"
            />
            <button className="btn-primary text-xs !py-1.5 !px-3" data-testid="search-submit">{t('common.search')}</button>
          </form>
        </div>
      )}

      {open && (
        <div className="lg:hidden border-t border-border bg-background" data-testid="mobile-menu">
          <nav className="container-x py-4 flex flex-col gap-0.5">
            {NAV_LINKS.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) => cn(
                  'px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary',
                  isActive && 'text-foreground bg-secondary'
                )}
                data-testid={`mobile-nav-${l.key.replace('nav.', '')}`}
              >
                {t(l.key)}
              </NavLink>
            ))}
            <div className="h-px bg-border my-3" />
            {user && user.id ? (
              <>
                {user.role === 'admin' && <Link to="/admin" onClick={() => setOpen(false)} className="btn-ghost mx-3" data-testid="mobile-nav-admin">{t('nav.admin')}</Link>}
                <Link to="/account" onClick={() => setOpen(false)} className="btn-ghost mx-3 mt-2" data-testid="mobile-nav-account">{t('nav.account')}</Link>
                <button onClick={() => { logout(); setOpen(false); }} className="text-sm text-muted-foreground px-3 mt-2 text-left" data-testid="mobile-nav-logout">{t('nav.signout')}</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setOpen(false)} className="btn-ghost mx-3" data-testid="mobile-nav-login">{t('nav.signin')}</Link>
                <Link to="/register" onClick={() => setOpen(false)} className="btn-primary mx-3 mt-2" data-testid="mobile-nav-signup">{t('nav.signup')}</Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

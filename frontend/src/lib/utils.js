import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs) { return twMerge(clsx(inputs)); }

export const CATEGORY_META = {
  apps: { label: 'AI Apps', path: '/apps', blurb: 'AI-native applications' },
  agents: { label: 'AI Agents', path: '/agents', blurb: 'Autonomous systems' },
  tools: { label: 'Tools', path: '/tools', blurb: 'Developer utilities' },
  software: { label: 'Software', path: '/software', blurb: 'Professional software' },
  games: { label: 'Games', path: '/games', blurb: 'Interactive experiences' },
};

export const STATUS_META = {
  active: { label: 'Available', tone: 'text-emerald-400' },
  beta: { label: 'Beta', tone: 'text-amber-400' },
  'coming-soon': { label: 'Coming soon', tone: 'text-muted-foreground' },
  maintenance: { label: 'Maintenance', tone: 'text-blue-400' },
  retired: { label: 'Retired', tone: 'text-muted-foreground' },
};

export function formatPrice(p) {
  if (!p || !p.billing_type) return null;
  if (p.billing_type === 'free') return 'Free';
  const price = p.price != null ? `$${Number(p.price).toFixed(0)}` : null;
  if (!price) return null;
  if (p.billing_type === 'monthly') return `${price}/mo`;
  if (p.billing_type === 'annual') return `${price}/yr`;
  return price;
}

/**
 * Trillion AI Tech - Product Catalogue System
 * Enhanced with search, filtering, and featured products
 */

(function() {
  'use strict';

  const products = [
    {
      id: 'app-001',
      name: 'AppForge',
      category: 'apps',
      description: 'Advanced application development platform with AI-assisted coding and automated deployment pipelines.',
      status: 'available',
      platform: 'Web, Desktop',
      tags: ['development', 'AI', 'productivity'],
      featured: true
    },
    {
      id: 'game-001',
      name: 'Nodefall',
      category: 'games',
      description: 'Grid-based reaction game about reading patterns under pressure. Test your reflexes and strategic thinking.',
      status: 'available',
      platform: 'Web, Mobile',
      tags: ['puzzle', 'strategy', 'arcade'],
      featured: true
    },
    {
      id: 'agent-001',
      name: 'AutoFlow Agent',
      category: 'agents',
      description: 'Autonomous workflow automation agent for repetitive tasks. Transparent execution with human oversight.',
      status: 'available',
      platform: 'Web, API',
      tags: ['automation', 'AI', 'workflow'],
      featured: true
    },
    {
      id: 'tool-001',
      name: 'DevToolkit Pro',
      category: 'tools',
      description: 'Essential developer utilities and code generation tools for modern software development.',
      status: 'available',
      platform: 'Web, CLI',
      tags: ['development', 'utilities', 'productivity'],
      featured: false
    },
    {
      id: 'software-001',
      name: 'Studio Suite',
      category: 'software',
      description: 'Complete creative suite for digital content creation with AI-powered enhancement tools.',
      status: 'coming-soon',
      platform: 'Desktop',
      tags: ['creative', 'design', 'AI'],
      featured: true
    },
    {
      id: 'app-002',
      name: 'Signal Desk',
      category: 'apps',
      description: 'Workbench for supervised AI agents with transparent step-by-step execution and approval gates.',
      status: 'coming-soon',
      platform: 'Web',
      tags: ['AI', 'agents', 'productivity'],
      featured: false
    },
    {
      id: 'game-002',
      name: 'Quantum Shift',
      category: 'games',
      description: 'Mind-bending puzzle platformer that plays with time and space mechanics.',
      status: 'coming-soon',
      platform: 'Web, Desktop',
      tags: ['puzzle', 'platformer', 'sci-fi'],
      featured: false
    },
    {
      id: 'agent-002',
      name: 'Research Assistant',
      category: 'agents',
      description: 'AI-powered research companion that helps gather, organize, and synthesize information.',
      status: 'coming-soon',
      platform: 'Web',
      tags: ['research', 'AI', 'productivity'],
      featured: false
    },
    {
      id: 'tool-002',
      name: 'CodeStream',
      category: 'tools',
      description: 'Real-time collaborative code editor with integrated AI pair programming.',
      status: 'coming-soon',
      platform: 'Web',
      tags: ['development', 'collaboration', 'AI'],
      featured: false
    },
    {
      id: 'software-002',
      name: 'DataViz Pro',
      category: 'software',
      description: 'Professional data visualization and analytics platform for business intelligence.',
      status: 'coming-soon',
      platform: 'Desktop, Web',
      tags: ['analytics', 'visualization', 'business'],
      featured: false
    }
  ];

  function createProductCard(product) {
    const card = document.createElement('a');
    card.href = `/product.html?id=${product.id}`;
    card.className = 'product-card';
    card.setAttribute('data-category', product.category);
    card.setAttribute('data-search', `${product.name} ${product.description} ${product.category} ${product.tags.join(' ')} ${product.platform}`.toLowerCase());

    const statusText = product.status === 'available' ? 'Available Now' : 'Coming Soon';
    const statusClass = product.status === 'available' ? 'available' : 'coming-soon';

    const categoryIcons = {
      apps: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>',
      games: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h4M8 10v4M15 13h.01M17 11h.01"/></svg>',
      agents: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2"/></svg>',
      tools: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
      software: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>'
    };

    card.innerHTML = `
      <div class="product-category">
        ${categoryIcons[product.category] || ''}
        <span>${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</span>
      </div>
      <h3>${product.name}</h3>
      <p class="description">${product.description}</p>
      <div class="product-meta">
        <span class="product-status ${statusClass}">${statusText}</span>
        <span class="product-platform">${product.platform}</span>
      </div>
    `;

    return card;
  }

  function renderProducts(containerId, filter = 'all', searchTerm = '') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    let filtered = products;

    if (filter !== 'all') {
      filtered = filtered.filter(p => p.category === filter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.tags.some(t => t.toLowerCase().includes(term)) ||
        p.platform.toLowerCase().includes(term)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35M11 8v6M8 11h6"/>
          </svg>
          <h3>No results found</h3>
          <p>Try adjusting your search or filter to find what you're looking for.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(product => {
      const card = createProductCard(product);
      container.appendChild(card);
    });
  }

  function renderFeaturedProducts(containerId, limit = 3) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    const featured = products.filter(p => p.featured).slice(0, limit);

    featured.forEach(product => {
      const card = createProductCard(product);
      container.appendChild(card);
    });
  }

  function init() {
    renderFeaturedProducts('featured-grid', 3);

    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
      renderProducts('product-grid');

      const filterBtns = document.querySelectorAll('.filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const category = btn.getAttribute('data-category');
          renderProducts('product-grid', category);
        });
      });

      const searchInput = document.getElementById('search-input');
      if (searchInput) {
        searchInput.addEventListener('input', (e) => {
          const activeFilter = document.querySelector('.filter-btn.active')?.getAttribute('data-category') || 'all';
          renderProducts('product-grid', activeFilter, e.target.value);
        });
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TrillionProducts = {
    render: (container, filter, search) => renderProducts(container, filter, search),
    renderFeatured: renderFeaturedProducts,
    getAllProducts: () => [...products]
  };
})();

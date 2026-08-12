/**
 * Trillion AI Tech - Product Catalogue System
 * Displays and filters products by category
 */

(function() {
  'use strict';

  const products = [
    {
      id: 'app-001',
      name: 'Signal Console',
      category: 'apps',
      description: 'Advanced signal processing and analysis application.',
      status: 'coming-soon',
      platform: 'Web, Desktop'
    },
    {
      id: 'game-001',
      name: 'Project Nexus',
      category: 'games',
      description: 'Immersive interactive experience with AI-driven narratives.',
      status: 'coming-soon',
      platform: 'Web'
    },
    {
      id: 'agent-001',
      name: 'AutoFlow Agent',
      category: 'agents',
      description: 'Autonomous workflow automation agent for repetitive tasks.',
      status: 'available',
      platform: 'Web, API'
    },
    {
      id: 'tool-001',
      name: 'DevToolkit',
      category: 'tools',
      description: 'Essential developer utilities and code generation tools.',
      status: 'available',
      platform: 'Web, CLI'
    },
    {
      id: 'software-001',
      name: 'Studio Suite',
      category: 'software',
      description: 'Complete creative suite for digital content creation.',
      status: 'coming-soon',
      platform: 'Desktop'
    }
  ];

  function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('data-category', product.category);

    const statusText = product.status === 'available' ? 'Available' : 'Coming Soon';
    const statusClass = product.status === 'available' ? 'status-available' : 'status-coming-soon';

    card.innerHTML = `
      <span class="category">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</span>
      <h3>${product.name}</h3>
      <p class="description">${product.description}</p>
      <p class="status ${statusClass}">${statusText} &bull; ${product.platform}</p>
    `;

    return card;
  }

  function renderProducts(filter = 'all') {
    const grid = document.getElementById('product-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const filtered = filter === 'all'
      ? products
      : products.filter(p => p.category === filter);

    filtered.forEach(product => {
      const card = createProductCard(product);
      grid.appendChild(card);
    });
  }

  function init() {
    renderProducts();

    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const category = btn.getAttribute('data-category');
        renderProducts(category);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.TrillionProducts = {
    render: renderProducts
  };
})();

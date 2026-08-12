/**
 * Trillion AI Tech - Product Data
 * HONEST CATALOGUE: Only real products, clear status labels
 */

const PRODUCT_DATA = {
  apps: {
    title: 'AI Applications',
    description: 'Advanced applications for productivity, creativity, and automation.',
    status: 'coming-soon',
    products: []
  },
  games: {
    title: 'Interactive Games',
    description: 'Engaging games built with modern technology and AI integration.',
    status: 'coming-soon',
    products: []
  },
  agents: {
    title: 'AI Agents',
    description: 'Autonomous AI systems designed to assist with complex workflows.',
    status: 'coming-soon',
    products: []
  },
  tools: {
    title: 'Developer Tools',
    description: 'Utilities and resources to enhance your development workflow.',
    status: 'coming-soon',
    products: []
  },
  software: {
    title: 'Software Solutions',
    description: 'Desktop and web-based software for various use cases.',
    status: 'coming-soon',
    products: []
  }
};

// Helper functions
function getCategoryData(category) {
  return PRODUCT_DATA[category] || null;
}

function getAllCategories() {
  return Object.keys(PRODUCT_DATA);
}

function getProductsByCategory(category) {
  const cat = PRODUCT_DATA[category];
  return cat ? cat.products : [];
}

function getAvailableProducts() {
  const available = [];
  Object.values(PRODUCT_DATA).forEach(cat => {
    available.push(...cat.products.filter(p => p.status === 'available' || p.status === 'beta'));
  });
  return available;
}

function searchProducts(query) {
  const q = query.toLowerCase();
  const results = [];
  
  Object.values(PRODUCT_DATA).forEach(cat => {
    cat.products.forEach(product => {
      const searchable = `${product.name} ${product.description} ${product.category} ${product.tags.join(' ')}`.toLowerCase();
      if (searchable.includes(q)) {
        results.push(product);
      }
    });
  });
  
  return results;
}

window.TrillionData = {
  PRODUCT_DATA,
  getCategoryData,
  getAllCategories,
  getProductsByCategory,
  getAvailableProducts,
  searchProducts
};

/**
 * Trillion AI Tech — Main Application JavaScript
 * 
 * Features:
 * - Dark/Light mode toggle
 * - Language selector (English default)
 * - Mobile navigation
 * - Product category filtering
 * - Smooth scrolling
 * 
 * No MongoDB. No backend. No authentication. No subscriptions.
 * This is a static public website.
 */

// ====================
// Language Translations
// ====================

const translations = {
    en: {
        nav_home: 'Home',
        nav_products: 'Products',
        nav_apps: 'Apps',
        nav_games: 'Games',
        nav_agents: 'Agents',
        nav_tools: 'Tools',
        nav_software: 'Software',
        nav_about: 'About',
        nav_contact: 'Contact',
        hero_title: 'Building the Future of AI & Interactive Technology',
        hero_subtitle: 'An independent studio crafting apps, games, agent systems, and tools from Aotearoa New Zealand.',
        free_browsing: 'Free to browse · No account required',
        explore_products: 'Explore Products',
        products_title: 'Products',
        products_description: 'Browse our catalogue of applications, games, agents, tools and software. All free to explore.',
        cat_all: 'All',
        cat_apps: 'Apps',
        cat_games: 'Games',
        cat_agents: 'Agents',
        cat_tools: 'Tools',
        cat_software: 'Software',
        products_coming_soon: 'Products Coming Soon',
        products_placeholder: "We're building innovative applications, games, AI agents, tools and software. Check back soon for our first releases.",
        product_note: 'Individual products may be free, one-time purchase, or subscription-based. The website itself remains free to browse.',
        apps_title: 'Apps',
        apps_description: 'Interactive applications for productivity, creativity, and entertainment.',
        apps_coming_soon: 'Apps coming soon',
        games_title: 'Games',
        games_description: 'Engaging games built with modern technology and AI integration.',
        games_coming_soon: 'Games coming soon',
        agents_title: 'AI Agents',
        agents_description: 'Autonomous AI systems designed to assist with specific tasks and workflows.',
        agents_coming_soon: 'AI agents coming soon',
        tools_title: 'Tools',
        tools_description: 'Utility tools and developer resources to enhance your workflow.',
        tools_coming_soon: 'Tools coming soon',
        software_title: 'Software',
        software_description: 'Desktop and web-based software solutions for various use cases.',
        software_coming_soon: 'Software coming soon',
        about_title: 'About',
        about_p1: 'Trillion AI Tech is an independent technology studio based in Aotearoa New Zealand.',
        about_p2: 'We build applications, games, AI agent systems, tools, and software with a focus on innovation, usability, and modern design principles.',
        about_p3: 'Our mission is to create technology that empowers users and enhances their digital experiences. We believe in transparent development, ethical AI practices, and building products that genuinely solve problems.',
        about_notice: 'In development · Building the future, one product at a time.',
        contact_title: 'Contact',
        contact_description: 'Have questions or want to get in touch? We\'d love to hear from you.',
        contact_email: 'hello@trillionaitech.com',
        contact_location: 'Aotearoa New Zealand',
        contact_note: 'Note: We\'re currently configuring our email systems. If you don\'t receive a response within 48 hours, please try again.',
        footer_tagline: 'Building the future of AI & interactive technology.',
        footer_navigation: 'Navigation',
        footer_legal: 'Legal',
        footer_info: 'Information',
        legal_terms: 'Terms of Service',
        legal_privacy: 'Privacy Policy',
        legal_acceptable: 'Acceptable Use',
        info_free: 'Free to browse',
        info_no_account: 'No account required',
        info_nz: 'Aotearoa New Zealand',
        footer_copyright: ' © 2026 Trillion AI Tech. All rights reserved.',
        legal_notice: 'Legal documents are placeholders requiring human/NZ legal review.'
    },
    mi: {
        nav_home: 'Kāinga',
        nav_products: 'Hua',
        nav_apps: 'Taupānga',
        nav_games: 'Kēmu',
        nav_agents: 'Egenti',
        nav_tools: 'Taputapu',
        nav_software: 'Pūmanawa',
        nav_about: 'Mō Mātou',
        nav_contact: 'Whakapā',
        hero_title: 'Te Hanga i te Hei Mō te AI me te Hangarau interactive',
        hero_subtitle: 'He whare rangahau motuhake e hanga ana i ngā taupānga, kēmu, pūnaha egent, me ngā taputapu mai i Aotearoa.',
        free_browsing: 'He koreutu te tirotiro · Kāore he pūkete e hiahiatia ana',
        explore_products: 'Tirohia ngā Hua',
        products_title: 'Hua',
        products_description: 'Tirohia tā mātou kōwhiringa o ngā taupānga, kēmu, egent, taputapu me ngā pūmanawa. He koreutu katoa ki te tūhura.',
        cat_all: 'Katoa',
        cat_apps: 'Taupānga',
        cat_games: 'Kēmu',
        cat_agents: 'Egenti',
        cat_tools: 'Taputapu',
        cat_software: 'Pūmanawa',
        products_coming_soon: 'He Hua kei te Haere Mai',
        products_placeholder: 'Kei te hanga mātou i ngā taupānga, kēmu, egent AI, taputapu me ngā pūmanawa auaha. Tirohia anō ā muri mō ā mātou tuku tuatahi.',
        product_note: 'Ko ētahi hua takitahi he koreutu, he hoko kotahi, he ohaurunga rānei. Ko te paetukutuku tonu he koreutu ki te tirotiro.',
        apps_title: 'Taupānga',
        apps_description: 'Ngā taupānga interactive mō te whakaputa, auaha, me te whakangahau.',
        apps_coming_soon: 'Ngā taupānga kei te haere mai',
        games_title: 'Kēmu',
        games_description: 'Ngā kēmu whakahoahoa i hangaia ki te hangarau hou me te whakauru AI.',
        games_coming_soon: 'Ngā kēmu kei te haere mai',
        agents_title: 'Egenti AI',
        agents_description: 'Ngā pūnaha AI motuhake i hoahoatia hei āwhina i ngā mahi me ngā rere mahi.',
        agents_coming_soon: 'Ngā egenti AI kei te haere mai',
        tools_title: 'Taputapu',
        tools_description: 'Ngā taputapu whaipainga me ngā rauemi kaiwhakawhanake hei whakapai i tō rere mahi.',
        tools_coming_soon: 'Ngā taputapu kei te haere mai',
        software_title: 'Pūmanawa',
        software_description: 'Ngā otinga pūmanawa papamahi me te paetukutuku mō ngā momo whakamahinga.',
        software_coming_soon: 'Ngā pūmanawa kei te haere mai',
        about_title: 'Mō Mātou',
        about_p1: 'Ko Trillion AI Tech he whare rangahau hangarau motuhake kei Aotearoa.',
        about_p2: 'Kei te hanga mātou i ngā taupānga, kēmu, pūnaha egent AI, taputapu, me ngā pūmanawa me te arotahi ki te auaha, te whakamahi, me ngā mātāpono hoahoa hou.',
        about_p3: 'Ko tā mātou misioni ko te hanga hangarau e whakamana ana i ngā kaiwhakamahi me te whakapai ake i ō rātou wheako matihiko. Kei te whakapono mātou ki te whanaketanga mārama, ngā tikanga AI whai tikanga, me te hanga hua e tino whakatau ana i ngā raruraru.',
        about_notice: 'Kei te whanaketanga · E hanga ana i te hei, kotahi hua i te wā.',
        contact_title: 'Whakapā',
        contact_description: 'He pātai tāu, he hiahia rānei ki te whakapā mai? Kei te hiahia mātou ki te whakarongo ki a koe.',
        contact_email: 'hello@trillionaitech.com',
        contact_location: 'Aotearoa',
        contact_note: 'Kia mōhio: Kei te whirihora tonu mātou i ā mātou pūnaha īmēra. Ki te kore koe e whiwhi whakautu i roto i ngā haora 48, whakamātau anō.',
        footer_tagline: 'Te hanga i te hei mō te AI me te hangarau interactive.',
        footer_navigation: 'Whakatere',
        footer_legal: 'Ture',
        footer_info: 'Pārongo',
        legal_terms: 'Ngā Tikanga Ratonga',
        legal_privacy: 'Kaupapa Here Tūmataiti',
        legal_acceptable: 'Whakamahi Whakaae',
        info_free: 'He koreutu te tirotiro',
        info_no_account: 'Kāore he pūkete e hiahiatia ana',
        info_nz: 'Aotearoa',
        footer_copyright: ' © 2026 Trillion AI Tech. Ngā tika katoa kua tiakina.',
        legal_notice: 'Ko ngā tuhinga ture he tauira e hiahia ana ki te arotake a te tangata/NZ.'
    }
};

// ====================
// DOM Elements
// ====================

const themeToggle = document.getElementById('theme-toggle');
const languageSelector = document.getElementById('language-selector');
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const mobileNav = document.getElementById('mobile-nav');
const categoryTabs = document.querySelectorAll('.category-tab');
const productGrid = document.getElementById('product-grid');

// ====================
// Theme Toggle (Dark/Light Mode)
// ====================

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme === 'dark' ? 'dark-mode' : 'light-mode';
}

function toggleTheme() {
    const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.className = newTheme === 'dark' ? 'dark-mode' : 'light-mode';
    localStorage.setItem('theme', newTheme);
}

if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// ====================
// Language Selector
// ====================

function updateLanguage(lang) {
    const elements = document.querySelectorAll('[data-lang-key]');
    elements.forEach(el => {
        const key = el.getAttribute('data-lang-key');
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });
    document.documentElement.lang = lang;
    localStorage.setItem('language', lang);
}

function initLanguage() {
    const savedLang = localStorage.getItem('language') || 'en';
    languageSelector.value = savedLang;
    updateLanguage(savedLang);
}

if (languageSelector) {
    languageSelector.addEventListener('change', (e) => {
        updateLanguage(e.target.value);
    });
}

// ====================
// Mobile Navigation
// ====================

function toggleMobileNav() {
    mobileNav.classList.toggle('active');
    mobileMenuToggle.classList.toggle('active');
}

if (mobileMenuToggle && mobileNav) {
    mobileMenuToggle.addEventListener('click', toggleMobileNav);
    
    // Close mobile nav when clicking a link
    const mobileLinks = mobileNav.querySelectorAll('a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            mobileMenuToggle.classList.remove('active');
        });
    });
}

// ====================
// Product Category Filtering
// ====================

// Placeholder products data structure (ready for future expansion)
const products = [];

function filterProducts(category) {
    // Currently no products, so this is ready for future implementation
    // When products are added, this function will filter and display them
    console.log(`Filtering products by category: ${category}`);
}

if (categoryTabs) {
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            categoryTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            // Filter products
            const category = tab.getAttribute('data-category');
            filterProducts(category);
        });
    });
}

// ====================
// Smooth Scrolling
// ====================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ====================
// Initialize
// ====================

function init() {
    initTheme();
    initLanguage();
    console.log('Trillion AI Tech website initialized');
    console.log('Free public browsing · No account required · No MongoDB · No backend');
}

// Run initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ====================
// Security Notes
// ====================

/**
 * SECURITY CHECKLIST:
 * ✓ No hardcoded secrets
 * ✓ No API keys
 * ✓ No Stripe keys (client-side or server-side)
 * ✓ No authentication tokens
 * ✓ No database connections
 * ✓ No MongoDB
 * ✓ No backend code
 * ✓ No external suspicious scripts
 * ✓ Pure static HTML/CSS/JS
 * 
 * This is a static public website with no sensitive data.
 */

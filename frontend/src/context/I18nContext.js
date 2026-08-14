/**
 * Lightweight i18n system.
 *
 * Uses a dictionary of translation keys → { en, mi, es, fr, de, ja, zh }.
 * Access via useT() hook: `const t = useT(); t('nav.home')`.
 * Falls back to English when a key is missing in the active language.
 * Persists language preference in localStorage.
 */
import { createContext, useContext, useEffect, useState } from 'react';

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'mi', label: 'Te Reo Māori', flag: 'MI' },
  { code: 'es', label: 'Español', flag: 'ES' },
  { code: 'fr', label: 'Français', flag: 'FR' },
  { code: 'de', label: 'Deutsch', flag: 'DE' },
  { code: 'ja', label: '日本語', flag: 'JA' },
  { code: 'zh', label: '中文', flag: 'ZH' },
];

const D = {
  'nav.home': { en: 'Home', mi: 'Kāinga', es: 'Inicio', fr: 'Accueil', de: 'Start', ja: 'ホーム', zh: '首页' },
  'nav.products': { en: 'Products', mi: 'Ngā Hua', es: 'Productos', fr: 'Produits', de: 'Produkte', ja: '製品', zh: '产品' },
  'nav.apps': { en: 'Apps', mi: 'Taupānga', es: 'Apps', fr: 'Apps', de: 'Apps', ja: 'アプリ', zh: '应用' },
  'nav.agents': { en: 'Agents', mi: 'Kaihoko', es: 'Agentes', fr: 'Agents', de: 'Agenten', ja: 'エージェント', zh: '智能体' },
  'nav.tools': { en: 'Tools', mi: 'Utauta', es: 'Herramientas', fr: 'Outils', de: 'Werkzeuge', ja: 'ツール', zh: '工具' },
  'nav.software': { en: 'Software', mi: 'Pūmanawa', es: 'Software', fr: 'Logiciels', de: 'Software', ja: 'ソフトウェア', zh: '软件' },
  'nav.games': { en: 'Games', mi: 'Kēmu', es: 'Juegos', fr: 'Jeux', de: 'Spiele', ja: 'ゲーム', zh: '游戏' },
  'nav.coming_soon': { en: 'Coming Soon', mi: 'Ka Tae Mai', es: 'Próximamente', fr: 'Bientôt', de: 'Demnächst', ja: '近日公開', zh: '即将推出' },
  'nav.about': { en: 'About', mi: 'Mō mātou', es: 'Acerca de', fr: 'À propos', de: 'Über uns', ja: '会社概要', zh: '关于我们' },
  'nav.contact': { en: 'Contact', mi: 'Whakapā', es: 'Contacto', fr: 'Contact', de: 'Kontakt', ja: 'お問い合わせ', zh: '联系' },
  'nav.appforge': { en: 'AppForge', mi: 'AppForge', es: 'AppForge', fr: 'AppForge', de: 'AppForge', ja: 'AppForge', zh: 'AppForge' },
  'nav.signin': { en: 'Sign in', mi: 'Takiuru', es: 'Iniciar', fr: 'Se connecter', de: 'Anmelden', ja: 'ログイン', zh: '登录' },
  'nav.signup': { en: 'Sign up', mi: 'Waitohu', es: 'Registrarse', fr: "S'inscrire", de: 'Registrieren', ja: '登録', zh: '注册' },
  'nav.signout': { en: 'Sign out', mi: 'Takiputa', es: 'Salir', fr: 'Déconnexion', de: 'Abmelden', ja: 'ログアウト', zh: '登出' },
  'nav.account': { en: 'Account', mi: 'Pūkete', es: 'Cuenta', fr: 'Compte', de: 'Konto', ja: 'アカウント', zh: '账户' },
  'nav.admin': { en: 'Admin', mi: 'Kaiwhakahaere', es: 'Admin', fr: 'Admin', de: 'Admin', ja: '管理', zh: '管理' },
  'nav.search_ph': { en: 'Search products, agents, tools…', mi: 'Rapua ngā hua…', es: 'Buscar productos…', fr: 'Rechercher…', de: 'Suchen…', ja: '検索…', zh: '搜索…' },
  'common.search': { en: 'Search', mi: 'Rapu', es: 'Buscar', fr: 'Rechercher', de: 'Suchen', ja: '検索', zh: '搜索' },

  // Home
  'home.hero.badge': { en: 'In active development · Aotearoa NZ', mi: 'Kei te whanake · Aotearoa', es: 'En desarrollo · Aotearoa NZ', fr: 'En développement · Aotearoa NZ', de: 'In Entwicklung · Aotearoa NZ', ja: '開発中 · アオテアロア NZ', zh: '开发中 · 新西兰' },
  'home.hero.title_1': { en: 'Building the future', mi: 'Ka hanga i te', es: 'Construyendo el futuro', fr: "Bâtir l'avenir", de: 'Wir bauen die Zukunft', ja: '未来を築く', zh: '构建未来' },
  'home.hero.title_2': { en: 'of', mi: 'ao', es: 'de', fr: 'de', de: 'von', ja: 'の', zh: '' },
  'home.hero.title_ai': { en: 'AI', mi: 'AI', es: 'IA', fr: 'IA', de: 'KI', ja: 'AI', zh: 'AI' },
  'home.hero.title_3': { en: '& interactive', mi: 'ā-tāngata', es: 'e interactiva', fr: 'et interactive', de: 'und interaktive', ja: 'とインタラクティブ', zh: '与互动' },
  'home.hero.title_4': { en: 'technology.', mi: 'hangarau.', es: 'tecnología.', fr: 'technologie.', de: 'Technologie.', ja: 'テクノロジー。', zh: '科技。' },
  'home.hero.blurb': { en: 'An independent studio shipping AI-native applications, autonomous agents, developer tools, professional software and games — from Aotearoa New Zealand.', mi: 'He taiwhanga motuhake e tuku ana i ngā taupānga AI, ngā kaihoko motuhake, ngā utauta whakawhanaketanga, me ngā pūmanawa ngaio — mai i Aotearoa.', es: 'Un estudio independiente que crea aplicaciones nativas de IA, agentes autónomos, herramientas para desarrolladores, software profesional y juegos — desde Nueva Zelanda.', fr: 'Un studio indépendant qui livre des applications IA-natives, des agents autonomes, des outils de développement, des logiciels professionnels et des jeux — depuis la Nouvelle-Zélande.', de: 'Ein unabhängiges Studio, das KI-native Anwendungen, autonome Agenten, Entwickler-Tools, professionelle Software und Spiele liefert — aus Aotearoa Neuseeland.', ja: 'AIネイティブなアプリケーション、自律エージェント、開発ツール、プロフェッショナルソフトウェア、ゲームを提供する独立系スタジオ — ニュージーランドより。', zh: '一家独立工作室,提供AI原生应用、自主智能体、开发工具、专业软件和游戏——来自新西兰。' },
  'home.hero.cta_primary': { en: 'Explore products', mi: 'Tirohia ngā hua', es: 'Explorar productos', fr: 'Explorer les produits', de: 'Produkte erkunden', ja: '製品を見る', zh: '浏览产品' },
  'home.hero.cta_secondary': { en: 'Our vision', mi: 'Tō mātou tirohanga', es: 'Nuestra visión', fr: 'Notre vision', de: 'Unsere Vision', ja: '私たちのビジョン', zh: '我们的愿景' },
  'home.sections.what_we_build': { en: 'What we build', mi: 'Ngā mea e hangaia ana', es: 'Qué construimos', fr: 'Ce que nous bâtissons', de: 'Was wir bauen', ja: '私たちが作るもの', zh: '我们的产品' },
  'home.sections.what_we_build_h': { en: 'A growing catalogue across five disciplines.', mi: 'He puna hua e tipu ana puta noa i ngā mātauranga e rima.', es: 'Un catálogo creciente en cinco disciplinas.', fr: 'Un catalogue croissant dans cinq disciplines.', de: 'Ein wachsender Katalog in fünf Disziplinen.', ja: '5つの分野にわたる成長し続けるカタログ。', zh: '横跨五大领域,持续增长的产品线。' },
  'home.sections.see_all': { en: 'See all products', mi: 'Tirohia ngā hua katoa', es: 'Ver todos', fr: 'Tout voir', de: 'Alle ansehen', ja: 'すべて見る', zh: '查看全部' },
  'home.sections.featured': { en: 'Featured', mi: 'Kua whakanuia', es: 'Destacados', fr: 'À la une', de: 'Empfohlen', ja: '注目', zh: '精选' },
  'home.sections.featured_h': { en: 'Recently released & in-development.', mi: 'Kātahi anō ka tukua, kei te hangaia.', es: 'Lanzados recientemente y en desarrollo.', fr: 'Récemment sortis et en développement.', de: 'Kürzlich veröffentlicht & in Entwicklung.', ja: '最近リリース&開発中。', zh: '近期发布与开发中。' },
  'home.cta.overline': { en: 'Get notified', mi: 'Kia mōhio koe', es: 'Recibe avisos', fr: 'Être informé', de: 'Benachrichtigt werden', ja: '通知を受け取る', zh: '获取通知' },
  'home.cta.title': { en: 'New products drop regularly. Be the first to try them.', mi: 'Ka tukua ngā hua hou i ngā wā katoa. Whakamātauhia i te tuatahi.', es: 'Nuevos productos con frecuencia. Sé el primero en probarlos.', fr: "De nouveaux produits sortent régulièrement. Soyez le premier à les essayer.", de: 'Regelmäßig neue Produkte. Seien Sie die Erste, die sie ausprobiert.', ja: '新製品が定期的にリリースされます。いち早く試してください。', zh: '新产品定期发布。抢先体验。' },
  'home.cta.coming_soon': { en: 'Coming soon', mi: 'Ka tae mai', es: 'Próximamente', fr: 'Bientôt', de: 'Demnächst', ja: '近日公開', zh: '即将推出' },
  'home.cta.create_account': { en: 'Create account', mi: 'Waihanga pūkete', es: 'Crear cuenta', fr: 'Créer un compte', de: 'Konto erstellen', ja: 'アカウント作成', zh: '创建账户' },

  // Common
  'common.tba': { en: 'TBA', mi: 'Ka pānuitia', es: 'Por anunciar', fr: 'À venir', de: 'TBA', ja: '未定', zh: '待定' },
  'common.view': { en: 'View', mi: 'Titiro', es: 'Ver', fr: 'Voir', de: 'Ansehen', ja: '見る', zh: '查看' },
  'common.no_results': { en: 'No results', mi: 'Kāore he hua', es: 'Sin resultados', fr: 'Aucun résultat', de: 'Keine Ergebnisse', ja: '結果なし', zh: '无结果' },
  'common.loading': { en: 'Loading…', mi: 'E uta ana…', es: 'Cargando…', fr: 'Chargement…', de: 'Lädt…', ja: '読み込み中…', zh: '加载中…' },
};

const ThemeContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem('tat-lang');
    if (stored && LANGUAGES.some(l => l.code === stored)) return stored;
    const nav = (navigator.language || 'en').slice(0, 2);
    return LANGUAGES.some(l => l.code === nav) ? nav : 'en';
  });

  useEffect(() => {
    localStorage.setItem('tat-lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key, fallback) => {
    const entry = D[key];
    if (!entry) return fallback ?? key;
    return entry[lang] || entry.en || fallback || key;
  };

  return (
    <ThemeContext.Provider value={{ lang, setLang, t, languages: LANGUAGES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useI18n = () => useContext(ThemeContext);
export const useT = () => useContext(ThemeContext).t;

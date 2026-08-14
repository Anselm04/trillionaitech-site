import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import { About, ComingSoon } from './pages/About';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import Account from './pages/Account';
import Admin from './pages/Admin';
import Legal from './pages/Legal';
import NotFound from './pages/NotFound';
import { useEffect } from 'react';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Protected({ children, adminOnly = false }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <div className="container-x py-24"><div className="animate-pulse h-8 w-48 bg-secondary rounded" /></div>;
  if (!user || user === false) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/account" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ScrollToTop />
        <div className="min-h-screen flex flex-col bg-background text-foreground">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:slug" element={<ProductDetail />} />
              <Route path="/apps" element={<Products fixedCategory="apps" title="AI Applications" blurb="AI-native apps designed for everyday work — productivity, creativity, and automation." hideCategoryFilter />} />
              <Route path="/agents" element={<Products fixedCategory="agents" title="AI Agents" blurb="Autonomous agents with visibility, gates and audit — designed for real work, not demos." hideCategoryFilter />} />
              <Route path="/tools" element={<Products fixedCategory="tools" title="Tools" blurb="Developer-grade utilities and command-line tools that respect your workflow." hideCategoryFilter />} />
              <Route path="/software" element={<Products fixedCategory="software" title="Software" blurb="Professional software for creative and analytical work." hideCategoryFilter />} />
              <Route path="/games" element={<Products fixedCategory="games" title="Games" blurb="Interactive experiences that reward attention." hideCategoryFilter />} />
              <Route path="/coming-soon" element={<ComingSoon />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/account" element={<Protected><Account /></Protected>} />
              <Route path="/admin" element={<Protected adminOnly><Admin /></Protected>} />
              <Route path="/privacy" element={<Legal page="privacy" />} />
              <Route path="/terms" element={<Legal page="terms" />} />
              <Route path="/refunds" element={<Legal page="refunds" />} />
              <Route path="/cookies" element={<Legal page="cookies" />} />
              <Route path="/security" element={<Legal page="security" />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <Toaster position="bottom-right" theme="dark" toastOptions={{ style: { background: 'hsl(0 0% 6%)', color: '#fff', border: '1px solid hsl(0 0% 14%)' } }} />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

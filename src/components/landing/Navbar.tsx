/**
 * Navbar — Sticky top navigation for the landing page
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const navLinks = [
  { labelFr: 'Fonctionnalités', labelAr: 'المميزات', href: '#modules' },
  { labelFr: 'Portails', labelAr: 'البوابات', href: '#roles' },
  { labelFr: 'Algérie', labelAr: 'الجزائر', href: '#algeria' },
  { labelFr: 'FAQ', labelAr: 'أسئلة شائعة', href: '#faq' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-lg shadow-background/20'
          : 'bg-transparent'
      }`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="container px-4 mx-auto">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-info flex items-center justify-center">
              <Pill className="w-4 h-4 text-background" />
            </div>
            <span className="font-display text-xl font-bold">
              <span className="text-foreground">PHAR</span>
              <span className="text-gradient">MINDS</span>
            </span>
          </motion.div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-primary/10 transition-all duration-200 font-medium"
              >
                {language === 'ar' ? link.labelAr : link.labelFr}
              </button>
            ))}
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/auth')}
            >
              {language === 'ar' ? 'تسجيل الدخول' : 'Se connecter'}
            </Button>
            <Button
              variant="hero"
              size="sm"
              className="group gap-1.5"
              onClick={() => navigate('/auth')}
            >
              {language === 'ar' ? 'ابدأ مجانًا' : 'Commencer'}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>

          {/* Mobile: Language + Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher />
            <button
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-primary/10 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border/40 overflow-hidden"
          >
            <div className="container px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="w-full text-left px-4 py-3 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-primary/10 transition-all duration-200 font-medium block"
                >
                  {language === 'ar' ? link.labelAr : link.labelFr}
                </button>
              ))}
              <div className="pt-3 border-t border-border/30 flex flex-col gap-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => { setMobileOpen(false); navigate('/auth'); }}
                >
                  {language === 'ar' ? 'تسجيل الدخول' : 'Se connecter'}
                </Button>
                <Button
                  variant="hero"
                  className="w-full group gap-2"
                  onClick={() => { setMobileOpen(false); navigate('/auth'); }}
                >
                  {language === 'ar' ? 'ابدأ مجانًا' : 'Commencer gratuitement'}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

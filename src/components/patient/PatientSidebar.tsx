import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  Pill,
  MessageCircle,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Heart,
  Menu,
  X,
  MapPin,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const menuItems = [
  { icon: LayoutDashboard, label: 'Tableau de Bord', path: '/patient' },
  { icon: CreditCard, label: 'Carte Chifa', path: '/patient/carte-chifa' },
  { icon: FileText, label: 'Ordonnances', path: '/patient/ordonnances' },
  { icon: Pill, label: 'Mes Médicaments', path: '/patient/medications' },
  { icon: MapPin,        label: 'Radar Stock',   path: '/patient/drug-search' },
  { icon: MessageCircle, label: 'Assistant IA',  path: '/patient/assistant' },
  { icon: User,          label: 'Mon Profil',    path: '/patient/profile' },
  { icon: BookOpen,      label: 'Guide',          path: '/guide' },
];

export function PatientSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erreur lors de la déconnexion');
    } else {
      toast.success('Déconnexion réussie');
      navigate('/auth');
    }
  };

  const handleNavClick = () => {
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const SidebarContent = ({ isSheet = false }: { isSheet?: boolean }) => (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="p-4 md:p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center flex-shrink-0">
            <Heart className="w-5 h-5 text-primary-foreground" />
          </div>
          {(!collapsed || isSheet) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h1 className="font-display font-bold text-lg">DawaAI</h1>
              <p className="text-xs text-muted-foreground">Espace Patient</p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 md:p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/patient'}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 md:px-4 py-3 rounded-xl transition-all text-sm md:text-base ${
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {(!collapsed || isSheet) && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-medium"
              >
                {item.label}
              </motion.span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 md:p-4 border-t border-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5" />
          {(!collapsed || isSheet) && <span>Déconnexion</span>}
        </Button>
      </div>
    </div>
  );

  // Mobile: Use Sheet drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile Header Bar */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-card border-border">
              <SidebarContent isSheet />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-info flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">DawaAI</span>
          </div>
        </div>
        {/* Spacer for fixed header */}
        <div className="h-14" />
      </>
    );
  }

  // Desktop: Standard sidebar
  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      className="h-screen bg-card border-r border-border flex flex-col relative sticky top-0"
    >
      <SidebarContent />

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>
    </motion.aside>
  );
}

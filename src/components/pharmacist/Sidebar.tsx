import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, AlertTriangle, Package, Users, BarChart2,
  Settings, LogOut, Pill, Menu, ChevronLeft, ChevronRight,
  Brain, ScanLine
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { icon: Home,          label: 'Vue d\'ensemble',  path: '/pharmacist' },
  { icon: ScanLine,      label: 'Scan Ordonnance',  path: '/pharmacist/scan' },
  { icon: AlertTriangle, label: 'Alertes',           path: '/pharmacist/alerts' },
  { icon: Package,       label: 'Inventaire',        path: '/pharmacist/inventory' },
  { icon: Users,         label: 'Patients',          path: '/pharmacist/patients' },
  { icon: BarChart2,     label: 'Analytiques',       path: '/pharmacist/analytics' },
  { icon: Brain,         label: 'AI Metrics',        path: '/pharmacist/ai-metrics' },
  { icon: Settings,      label: 'Paramètres',        path: '/pharmacist/settings' },
];

export function PharmacistSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const displayName = user?.user_metadata?.full_name
    ?? user?.email?.split('@')[0]?.replace(/[._]/g, ' ')
    ?? 'Pharmacien';

  const initials = displayName
    .split(' ')
    .map((w: string) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join('');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleNavClick = () => {
    if (isMobile) setMobileOpen(false);
  };

  const SidebarContent = ({ isSheet = false }: { isSheet?: boolean }) => (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="p-4 md:p-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center flex-shrink-0 glow-primary">
            <Pill className="w-5 h-5 text-primary-foreground" />
          </div>
          {(!collapsed || isSheet) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h1 className="font-display font-bold text-base leading-tight text-gradient">PharMinds</h1>
              <p className="text-[11px] text-muted-foreground">Portail Pharmacien</p>
            </motion.div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path
            || (item.path !== '/pharmacist' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={cn(
                'flex items-center gap-3 text-sm font-medium px-3 py-2.5 rounded-xl transition-all duration-200',
                isActive
                  ? 'text-foreground bg-primary/15 border border-primary/25 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/70'
              )}
            >
              <item.icon className={cn("w-4.5 h-4.5 flex-shrink-0", isActive ? "text-primary" : "")} style={{ width: '1.125rem', height: '1.125rem' }} />
              {(!collapsed || isSheet) && (
                <span className="truncate">{item.label}</span>
              )}
              {isActive && (!collapsed || isSheet) && (
                <motion.div
                  layoutId="sidebar-active"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User / Sign Out */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        {(!collapsed || isSheet) && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/40">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate capitalize">{displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email ?? 'pharmacien@pharminds.dz'}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full text-sm text-muted-foreground hover:text-destructive transition-colors px-3 py-2 rounded-xl hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {(!collapsed || isSheet) && <span>Déconnexion</span>}
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 bg-sidebar/95 backdrop-blur-lg border-b border-sidebar-border px-4 py-3 flex items-center gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar border-sidebar-border">
              <SidebarContent isSheet />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-info flex items-center justify-center">
              <Pill className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-sm text-gradient">PharMinds</span>
          </div>
        </div>
        <div className="h-14" />
      </>
    );
  }

  return (
    <motion.aside
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1, width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.3 }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col relative sticky top-0 shrink-0"
    >
      <SidebarContent />
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center hover:bg-secondary transition-colors z-10 shadow-sm"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}

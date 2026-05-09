import { useEffect, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Globe,
  Activity,
  Lock,
  FileText,
  Settings,
  Home,
  LogOut,
  Pill,
  Menu,
  X
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { InterfaceSwitcher } from '@/components/admin/InterfaceSwitcher';
import { Button } from '@/components/ui/button';

const navItems = [
  { icon: Home, label: 'Overview', path: '/admin' },
  { icon: Users, label: 'User Management', path: '/admin/users' },
  { icon: Pill, label: 'Drug Management', path: '/admin/drugs' },
  { icon: Globe, label: 'Analytics', path: '/admin/analytics' },
  { icon: Activity, label: 'AI Health', path: '/admin/ai' },
  { icon: Lock, label: 'Security', path: '/admin/security' },
  { icon: FileText, label: 'Compliance', path: '/admin/compliance' },
  { icon: Settings, label: 'Settings', path: '/admin/settings' },
];

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<{ email: string; fullName: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('user_id', session.user.id)
        .single();

      if (profile?.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.');
        navigate('/');
        return;
      }

      setUser({
        email: profile.email,
        fullName: profile.full_name || 'Admin'
      });
    };

    checkAuth();
  }, [navigate]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
    toast.success('Signed out successfully');
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-4 md:p-6 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-destructive flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg">PHARMA AI</h1>
            <p className="text-xs text-muted-foreground">Admin Center</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'nav-item flex items-center gap-3 text-sm font-medium px-3 py-2.5 rounded-lg transition-colors',
                isActive ? 'active text-foreground bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Admin User */}
      <div className="p-3 md:p-4 border-t border-sidebar-border">
        <div className="glass-card p-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-destructive flex items-center justify-center text-foreground font-bold flex-shrink-0">
              {user?.fullName?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName}</p>
              <p className="text-xs text-accent truncate">Super Admin</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors px-3 py-2 w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <motion.aside 
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="hidden md:flex w-64 h-screen bg-sidebar border-r border-sidebar-border flex-col sticky top-0"
      >
        <SidebarContent />
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-72 bg-sidebar border-r border-sidebar-border flex flex-col z-50 md:hidden"
            >
              <div className="absolute top-4 right-4">
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border/50 px-4 md:px-8 py-3 md:py-4">
          <div className="flex items-center justify-between gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden flex-shrink-0" 
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2 md:gap-4 ml-auto">
              <InterfaceSwitcher currentInterface="admin" />
              <NotificationCenter />
            </div>
          </div>
        </div>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  Pill,
  ArrowRight,
  Eye
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface InterfaceSwitcherProps {
  currentInterface: 'admin' | 'pharmacist' | 'patient';
}

const interfaces = [
  { 
    id: 'admin' as const, 
    label: 'Admin Portal', 
    icon: Shield, 
    path: '/admin',
    color: 'destructive',
    description: 'System administration'
  },
  { 
    id: 'pharmacist' as const, 
    label: 'Pharmacist Portal', 
    icon: Pill, 
    path: '/pharmacist',
    color: 'primary',
    description: 'Drug interactions & inventory'
  },
  { 
    id: 'patient' as const, 
    label: 'Patient Portal', 
    icon: Users, 
    path: '/patient',
    color: 'info',
    description: 'Health management'
  },
];

export const InterfaceSwitcher = ({ currentInterface }: InterfaceSwitcherProps) => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        setIsAdmin(profile?.role === 'admin');
      }
    };
    checkAdmin();
  }, []);

  if (!isAdmin) return null;

  const current = interfaces.find(i => i.id === currentInterface);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">View as</span>
          <span className="font-semibold">{current?.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Admin Access - Switch Interface
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {interfaces.map((item) => (
          <DropdownMenuItem key={item.id} asChild>
            <Link
              to={item.path}
              className={cn(
                "flex items-center gap-3 p-2 cursor-pointer",
                currentInterface === item.id && "bg-primary/10"
              )}
            >
              <div className={`w-8 h-8 rounded-lg bg-${item.color}/20 flex items-center justify-center`}>
                <item.icon className={`w-4 h-4 text-${item.color}`} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              {currentInterface === item.id && (
                <span className="text-xs text-primary">Current</span>
              )}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default InterfaceSwitcher;

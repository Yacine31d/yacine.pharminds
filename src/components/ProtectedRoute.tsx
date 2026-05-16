import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // Not logged in → redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Logged in but wrong role → redirect to their dashboard
  if (requiredRole && role !== requiredRole && role !== 'admin') {
    const redirectMap: Record<AppRole, string> = {
      admin: '/admin',
      pharmacist: '/pharmacist',
      patient: '/patient',
    };
    const destination = role ? redirectMap[role] : '/auth';
    return <Navigate to={destination} replace />;
  }

  return <>{children}</>;
}

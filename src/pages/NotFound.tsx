import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, ArrowLeft, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  const location = useLocation();
  const navigate  = useNavigate();

  useEffect(() => {
    console.error('404 — route not found:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      {/* background blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-info/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md"
      >
        {/* logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-info flex items-center justify-center shadow-lg shadow-primary/25">
            <Pill className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-xl text-gradient">PharMinds</span>
        </div>

        {/* 404 */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="text-[8rem] font-display font-black leading-none text-gradient mb-4 select-none"
        >
          404
        </motion.div>

        <h1 className="text-2xl font-bold mb-3">Page introuvable</h1>
        <p className="text-muted-foreground text-sm mb-2 leading-relaxed">
          La page{' '}
          <code className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono">
            {location.pathname}
          </code>{' '}
          n'existe pas ou a été déplacée.
        </p>
        <p className="text-muted-foreground text-sm mb-8">
          Vérifiez l'URL ou revenez à l'accueil.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" className="gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
          <Button variant="hero" className="gap-2" onClick={() => navigate('/')}>
            <Home className="w-4 h-4" />
            Accueil
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;

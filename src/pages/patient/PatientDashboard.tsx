import { useState, useEffect, useCallback } from 'react';
import { InterfaceSwitcher } from '@/components/admin/InterfaceSwitcher';
import { motion } from 'framer-motion';
import {
  CreditCard,
  FileText,
  Pill,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Activity,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlowCard } from '@/components/ui/glow-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { PatientSidebar } from '@/components/patient/PatientSidebar';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { AIChatWidget } from '@/components/chat/AIChatWidget';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function PatientDashboard() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    medications: 0,
    ordonnances: 0,
    carteChifa: false
  });
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const [medsResult, ordoResult, chifaResult] = await Promise.all([
        supabase.from('patient_medications').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('ordonnances').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('carte_chifa').select('id').eq('user_id', user.id).maybeSingle()
      ]);
      setStats({
        medications: medsResult.count || 0,
        ordonnances: ordoResult.count || 0,
        carteChifa: !!chifaResult.data
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = async () => {
    await fetchData();
    toast.success('Données actualisées');
  };

  /* ─── Skeleton ─── */
  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-background">
        <PatientSidebar />
        <div className="flex-1 p-4 md:p-8 space-y-6">
          {/* header skeleton */}
          <div className="h-10 w-64 rounded-xl bg-secondary/50 animate-pulse" />
          <div className="h-4 w-48 rounded-lg bg-secondary/30 animate-pulse" />
          {/* stats skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0,1,2].map(i => (
              <div key={i} className="glass-card p-5 h-24 animate-pulse bg-secondary/20 rounded-2xl" />
            ))}
          </div>
          {/* cards skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[0,1,2].map(i => (
              <div key={i} className="glass-card p-6 h-36 animate-pulse bg-secondary/20 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      icon: CreditCard,
      label: 'Carte Chifa',
      description: 'Gérer votre carte d\'assurance',
      path: '/patient/carte-chifa',
      from: 'from-primary',
      to: 'to-info',
      status: stats.carteChifa ? 'Configurée' : 'À configurer',
      statusOk: stats.carteChifa,
    },
    {
      icon: FileText,
      label: 'Ordonnances',
      description: 'Voir vos prescriptions médicales',
      path: '/patient/ordonnances',
      from: 'from-info',
      to: 'to-primary',
      status: `${stats.ordonnances} active(s)`,
      statusOk: true,
    },
    {
      icon: Pill,
      label: 'Médicaments',
      description: 'Suivi de vos traitements',
      path: '/patient/medications',
      from: 'from-success',
      to: 'to-info',
      status: `${stats.medications} en cours`,
      statusOk: true,
    },
    {
      icon: MapPin,
      label: 'Radar Stock',
      description: 'Trouver un médicament près de vous',
      path: '/patient/drug-search',
      from: 'from-cyan-500',
      to: 'to-primary',
      status: 'Réseau actif',
      statusOk: true,
    },
  ];

  const tips = [
    "Prenez vos médicaments à heures fixes pour une meilleure efficacité",
    "Conservez votre carte Chifa à jour pour faciliter vos remboursements",
    "Consultez votre pharmacien pour toute question sur vos traitements"
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <PatientSidebar />

      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <main className="p-4 md:p-8">

          {/* ── Hero Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-6 md:mb-8 overflow-hidden rounded-2xl md:rounded-3xl border border-border/40 bg-gradient-to-br from-primary/8 via-background to-info/8 p-6 md:p-8"
          >
            {/* decorative blobs */}
            <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-info/10 blur-3xl" />

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-primary" />
                  <span className="text-xs font-medium text-primary uppercase tracking-widest">Tableau de Bord</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  Bienvenue, <span className="text-gradient">{profile?.full_name || 'Patient'}</span> 👋
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Gérez votre santé et suivez vos traitements en toute simplicité
                </p>
              </div>
              <InterfaceSwitcher currentInterface="patient" />
            </div>
          </motion.div>

          {/* ── Stats Strip ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8"
          >
            <GlowCard>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Médicaments Actifs</p>
                  <p className="text-2xl md:text-3xl font-display font-bold">
                    <AnimatedCounter value={stats.medications} />
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center">
                  <Pill className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </GlowCard>

            <GlowCard delay={0.05}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Ordonnances</p>
                  <p className="text-2xl md:text-3xl font-display font-bold">
                    <AnimatedCounter value={stats.ordonnances} />
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-info to-primary flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </GlowCard>

            <GlowCard delay={0.1} className="sm:col-span-2 md:col-span-1">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground mb-1">Carte Chifa</p>
                  <p className="text-base md:text-lg font-semibold flex items-center gap-2 mt-1">
                    {stats.carteChifa ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-success" />
                        <span className="text-success">Enregistrée</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-warning" />
                        <span className="text-warning">Non configurée</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-success to-info flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </GlowCard>
          </motion.div>

          {/* ── Quick Actions ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6 md:mb-8"
          >
            <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Actions Rapides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {quickActions.map((action, index) => (
                <motion.div
                  key={action.path}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + index * 0.07 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  className="glass-card-elevated p-4 md:p-6 cursor-pointer group relative overflow-hidden"
                  onClick={() => navigate(action.path)}
                >
                  {/* subtle gradient overlay */}
                  <div className={`pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${action.from}/5 ${action.to}/5`} />

                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.from} ${action.to} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <action.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-sm md:text-base mb-1">{action.label}</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mb-3">{action.description}</p>

                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      action.statusOk
                        ? 'bg-success/10 text-success border border-success/20'
                        : 'bg-warning/10 text-warning border border-warning/20'
                    }`}>
                      {action.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* ── AI Assistant Promo ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="glass-card-elevated p-4 md:p-6 bg-gradient-to-br from-primary/5 to-info/5 relative overflow-hidden"
            >
              <div className="pointer-events-none absolute -top-6 -right-6 w-28 h-28 rounded-full bg-primary/10 blur-2xl" />
              <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4 relative">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center flex-shrink-0 shadow-lg">
                  <MessageCircle className="w-6 h-6 md:w-7 md:h-7 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-base md:text-lg flex items-center gap-2">
                    PharmaAssist AI
                    <Sparkles className="w-4 h-4 text-primary" />
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Votre assistant pharmaceutique intelligent</p>
                </div>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground mb-4 relative">
                Posez vos questions sur vos médicaments, interactions, effets secondaires...
                Notre IA vous répond 24h/24.
              </p>
              <div className="flex items-center justify-between relative">
                <span className="flex items-center gap-1.5 text-xs text-success">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                  En ligne
                </span>
                <Button variant="hero" size="sm" onClick={() => navigate('/patient/assistant')} className="gap-2">
                  Démarrer
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>

            {/* ── Health Tips ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-4 md:p-6"
            >
              <h3 className="font-semibold mb-3 md:mb-4 flex items-center gap-2 text-sm md:text-base">
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                Conseils Santé
              </h3>
              <div className="space-y-2 md:space-y-3">
                {tips.map((tip, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + index * 0.07 }}
                    className="flex items-start gap-2 md:gap-3 p-2.5 md:p-3 rounded-xl bg-secondary/30 border border-border/30"
                  >
                    <span className="text-primary text-sm flex-shrink-0">💡</span>
                    <p className="text-xs md:text-sm leading-relaxed">{tip}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </main>
      </PullToRefresh>

      {/* AI Chat Widget */}
      <AIChatWidget userRole="patient" />
    </div>
  );
}

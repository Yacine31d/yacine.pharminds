import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle,
  Pill,
  Users,
  TrendingUp,
  Bell,
  Search,
  Filter,
  ArrowRight,
  Brain,
  Package,
  Activity,
  ChevronRight,
  ScanLine,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlowCard } from '@/components/ui/glow-card';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { PharmacistSidebar } from '@/components/pharmacist/Sidebar';
import { DrugInteractionChecker } from '@/components/pharmacist/DrugInteractionChecker';
import { AIChatWidget } from '@/components/chat/AIChatWidget';
import { InterfaceSwitcher } from '@/components/admin/InterfaceSwitcher';
import { toast } from 'sonner';

interface Drug {
  id: string;
  name_fr: string;
  name_ar: string;
  generic_name: string;
  dosage: string | null;
  form: string | null;
  price_dz: number | null;
}

interface DrugInteraction {
  id: string;
  severity: string;
  description_fr: string;
  drug_a: Drug;
  drug_b: Drug;
  created_at: string;
}

export default function PharmacistDashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [stats, setStats] = useState({
    totalDrugs: 0,
    totalInteractions: 0,
    criticalAlerts: 0,
    patientsToday: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);


  const fetchData = async () => {
    try {
      // Fetch drugs
      const { data: drugsData } = await supabase
        .from('drugs')
        .select('*')
        .order('name_fr')
        .limit(20);

      // Fetch interactions with drug details
      const { data: interactionsData } = await supabase
        .from('drug_interactions')
        .select(`
          id,
          severity,
          description_fr,
          created_at,
          drug_a:drugs!drug_interactions_drug_a_id_fkey(id, name_fr, name_ar, generic_name, dosage, form, price_dz),
          drug_b:drugs!drug_interactions_drug_b_id_fkey(id, name_fr, name_ar, generic_name, dosage, form, price_dz)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch counts
      const [drugsCount, interactionsCount] = await Promise.all([
        supabase.from('drugs').select('id', { count: 'exact' }),
        supabase.from('drug_interactions').select('id', { count: 'exact' })
      ]);

      // Count critical interactions
      const { count: criticalCount } = await supabase
        .from('drug_interactions')
        .select('id', { count: 'exact' })
        .eq('severity', 'majeure');

      setDrugs(drugsData || []);
      setInteractions(interactionsData as any || []);
      // Fetch actual patient count for today
      const { count: patientsCount } = await supabase
        .from('pharmacy_patients')
        .select('id', { count: 'exact' });

      setStats({
        totalDrugs: drugsCount.count || 0,
        totalInteractions: interactionsCount.count || 0,
        criticalAlerts: criticalCount || 0,
        patientsToday: patientsCount || 0
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const filteredDrugs = drugs.filter(drug =>
    drug.name_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
    drug.name_ar.includes(searchQuery) ||
    drug.generic_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statsData = [
    { label: 'Médicaments', value: stats.totalDrugs, icon: Pill, change: 'Base de données' },
    { label: 'Interactions', value: stats.totalInteractions, icon: Brain, change: 'Enregistrées' },
    { label: 'Alertes Critiques', value: stats.criticalAlerts, icon: AlertTriangle, change: 'À surveiller', critical: true },
    { label: 'Patients suivis', value: stats.patientsToday, icon: Users, change: 'Total enregistrés' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <PharmacistSidebar />
      
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl md:text-3xl font-bold mb-1 md:mb-2"
            >
              Pharmacist <span className="text-gradient">Dashboard</span>
            </motion.h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Surveillance des interactions médicamenteuses en temps réel
            </p>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            <InterfaceSwitcher currentInterface="pharmacist" />
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full sm:w-48 md:w-72 bg-secondary/30 border-border/50"
              />
            </div>
            <Button variant="outline" size="icon" className="shrink-0">
              <Bell className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8"
        >
          {statsData.map((stat, index) => (
            <GlowCard 
              key={stat.label} 
              delay={index * 0.05}
              glowColor={stat.critical ? 'danger' : 'primary'}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground mb-1 truncate">{stat.label}</p>
                  <p className="text-xl md:text-3xl font-display font-bold">
                    {loading ? '...' : <AnimatedCounter value={stat.value} />}
                  </p>
                </div>
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg ${stat.critical ? 'bg-destructive/10' : 'bg-primary/10'} flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`w-4 h-4 md:w-5 md:h-5 ${stat.critical ? 'text-destructive' : 'text-primary'}`} />
                </div>
              </div>
              <p className={`text-xs mt-2 ${stat.critical ? 'text-destructive' : 'text-muted-foreground'} truncate`}>
                {stat.change}
              </p>
            </GlowCard>
          ))}
        </motion.div>

        {/* OCR Scan Hero — primary action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => navigate('/pharmacist/scan')}
          className="relative mb-6 md:mb-8 overflow-hidden rounded-2xl cursor-pointer group glass-card-elevated border border-primary/20 hover:border-primary/50 transition-all duration-500"
        >
          {/* Animated gradient backdrop */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-info/5 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-700" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-info/20 rounded-full blur-3xl group-hover:bg-info/30 transition-all duration-700" />

          {/* Scanning line effect */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
            <div className="relative shrink-0">
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-primary to-info flex items-center justify-center glow-primary group-hover:scale-110 transition-transform duration-500">
                <ScanLine className="w-7 h-7 md:w-8 md:h-8 text-primary-foreground" />
              </div>
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="w-3 h-3 text-accent-foreground" />
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-lg md:text-2xl font-bold">
                  <span className="text-gradient">Scanner</span> une ordonnance
                </h2>
                <span className="text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 font-mono">
                  TrOCR · CER 0.46%
                </span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">
                OCR algérien spécialisé · vérification automatique des interactions · apprentissage actif
              </p>
            </div>

            <Button
              variant="hero"
              className="w-full md:w-auto group-hover:translate-x-1 transition-transform"
              onClick={(e) => { e.stopPropagation(); navigate('/pharmacist/scan'); }}
            >
              Scanner maintenant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Drug Interaction Checker */}
          <div className="lg:col-span-2">
            <DrugInteractionChecker />
          </div>

          {/* Side Panel */}
          <div className="space-y-4 md:space-y-6">
            {/* Recent Interactions from DB */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-4 md:p-6"
            >
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 md:w-5 md:h-5 text-warning" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm md:text-base">Interactions Récentes</h3>
                  <p className="text-xs text-muted-foreground">Base de données</p>
                </div>
              </div>

              <div className="space-y-2 md:space-y-3">
                {interactions.length === 0 ? (
                  <p className="text-xs md:text-sm text-muted-foreground text-center py-4">
                    Aucune interaction enregistrée
                  </p>
                ) : (
                  interactions.map((interaction) => (
                    <div 
                      key={interaction.id}
                      className="p-2 md:p-3 rounded-lg bg-secondary/30 border border-border/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <SeverityBadge 
                          severity={
                            interaction.severity === 'majeure' ? 'critical' : 
                            interaction.severity === 'modérée' ? 'warning' : 'safe'
                          }
                        />
                      </div>
                      <p className="text-xs md:text-sm font-medium">
                        {(interaction.drug_a as any)?.name_fr} + {(interaction.drug_b as any)?.name_fr}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {interaction.description_fr}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Quick Drug List */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="glass-card p-4 md:p-6"
            >
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Pill className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm md:text-base">Médicaments</h3>
                  <p className="text-xs text-muted-foreground">{stats.totalDrugs} dans la base</p>
                </div>
              </div>

              <div className="space-y-2 max-h-48 md:max-h-60 overflow-y-auto">
                {(searchQuery ? filteredDrugs : drugs.slice(0, 6)).map((drug) => (
                  <div 
                    key={drug.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Pill className="w-3 h-3 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs md:text-sm font-medium truncate">{drug.name_fr}</p>
                        <p className="text-xs text-muted-foreground truncate">{drug.dosage} • {drug.form}</p>
                      </div>
                    </div>
                    {drug.price_dz && (
                      <span className="text-xs text-primary font-medium flex-shrink-0 ml-2">
                        {drug.price_dz} DA
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* AI Status */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-4 md:p-6"
            >
              <div className="flex items-center gap-3 mb-3 md:mb-4">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-info/20 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 md:w-5 md:h-5 text-info" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm md:text-base">AI Status</h3>
                  <p className="text-xs text-muted-foreground">PharmaAssist AI</p>
                </div>
              </div>

              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs md:text-sm">Moteur d'Interactions</span>
                  <span className="flex items-center gap-1 text-success text-xs md:text-sm">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    Actif
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs md:text-sm">Assistant Chat</span>
                  <span className="flex items-center gap-1 text-success text-xs md:text-sm">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    En ligne
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* AI Chat Widget */}
      <AIChatWidget userRole="pharmacist" />
    </div>
  );
}

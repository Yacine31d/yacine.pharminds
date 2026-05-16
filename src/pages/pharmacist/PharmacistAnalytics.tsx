import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart2, 
  TrendingUp,
  Pill,
  Users,
  AlertTriangle,
  Calendar,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { GlowCard } from '@/components/ui/glow-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { PharmacistSidebar } from '@/components/pharmacist/Sidebar';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--muted))'];

export default function PharmacistAnalytics() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    weeklyRevenue: 0,
    totalDrugs: 0,
    prescriptionsScanned: 0,
    interactionsDetected: 0
  });
  const [prescriptionData, setPrescriptionData] = useState<{name: string; scans: number}[]>([]);
  const [categoryData, setCategoryData] = useState<{name: string; value: number}[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [drugsCount, interactionsCount, scansCount] = await Promise.all([
        supabase.from('drugs').select('id', { count: 'exact' }),
        supabase.from('drug_interactions').select('id', { count: 'exact' }),
        supabase.from('scanned_prescriptions').select('id', { count: 'exact' })
      ]);

      setStats({
        weeklyRevenue: 0,
        totalDrugs: drugsCount.count || 0,
        prescriptionsScanned: scansCount.count || 0,
        interactionsDetected: interactionsCount.count || 0
      });

      // Fetch prescriptions by day of week for chart
      const { data: scans } = await supabase
        .from('scanned_prescriptions')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      const dayCounts = new Array(7).fill(0);
      (scans || []).forEach((scan) => {
        const day = new Date(scan.created_at).getDay();
        dayCounts[day]++;
      });
      setPrescriptionData(dayNames.map((name, i) => ({ name, scans: dayCounts[i] })));

      // Drug category distribution from ATC codes
      const { data: drugs } = await supabase.from('drugs').select('atc_code');
      const categories: Record<string, number> = {};
      (drugs || []).forEach((drug) => {
        const cat = drug.atc_code ? drug.atc_code.charAt(0) : 'Autre';
        const catNames: Record<string, string> = {
          'A': 'Digestif', 'B': 'Sang', 'C': 'Cardiovasculaire',
          'D': 'Dermatologie', 'J': 'Anti-infectieux', 'M': 'Musculo-squelettique',
          'N': 'Système nerveux', 'R': 'Respiratoire'
        };
        const label = catNames[cat] || 'Autres';
        categories[label] = (categories[label] || 0) + 1;
      });
      setCategoryData(Object.entries(categories).map(([name, value]) => ({ name, value })));
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    { label: 'Médicaments', value: stats.totalDrugs, icon: Pill, change: 'En stock', color: 'primary' },
    { label: 'Prescriptions Scannées', value: stats.prescriptionsScanned, icon: Users, change: 'Total', color: 'info' },
    { label: 'Interactions', value: stats.interactionsDetected, icon: AlertTriangle, change: 'Détectées', color: 'warning' },
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
              className="text-3xl font-bold mb-2"
            >
              <span className="text-gradient">Analytics</span> Pharmacie
            </motion.h1>
            <p className="text-muted-foreground">
              Statistiques et performance de la pharmacie
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Cette semaine
          </div>
        </div>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
        >
          {statsData.map((stat, index) => (
            <GlowCard key={stat.label} delay={index * 0.05} glowColor={stat.color as any}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-2xl font-display font-bold">
                    {loading ? '...' : <AnimatedCounter value={stat.value} />}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-${stat.color}/10 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-xs text-muted-foreground">
                  {stat.change}
                </span>
              </div>
            </GlowCard>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Sales Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              Ventes & Ordonnances (Semaine)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prescriptionData.length > 0 ? prescriptionData : [{name: 'No data', scans: 0}]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="scans" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Scans" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Category Distribution */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Pill className="w-5 h-5 text-primary" />
              Répartition par Catégorie
            </h3>
            <div className="h-64 flex items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {categoryData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Trend Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6 lg:col-span-2"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Tendance des Ventes
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prescriptionData.length > 0 ? prescriptionData : [{name: 'Aucune', scans: 0}]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="scans" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Prescriptions"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

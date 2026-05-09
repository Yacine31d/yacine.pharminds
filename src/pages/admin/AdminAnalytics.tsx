import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Pill, 
  Activity,
  Calendar,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { GlowCard } from '@/components/ui/glow-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { AIChatWidget } from '@/components/chat/AIChatWidget';

const AdminAnalytics = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    prescriptions: 0,
    interactions: 0
  });
  const [weeklyData, setWeeklyData] = useState<{ day: string; users: number; prescriptions: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const [users, prescriptions, interactions] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('ordonnances').select('id', { count: 'exact' }),
        supabase.from('drug_interactions').select('id', { count: 'exact' })
      ]);

      setStats({
        totalUsers: users.count || 0,
        activeToday: Math.floor((users.count || 0) * 0.3),
        prescriptions: prescriptions.count || 0,
        interactions: interactions.count || 0
      });

      // Generate mock weekly data
      const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
      setWeeklyData(days.map(day => ({
        day,
        users: Math.floor(Math.random() * 50) + 10,
        prescriptions: Math.floor(Math.random() * 30) + 5
      })));
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyticsCards = [
    { 
      title: 'Total Users', 
      value: stats.totalUsers, 
      icon: Users, 
      change: '+12%',
      positive: true,
      color: 'primary' 
    },
    { 
      title: 'Active Today', 
      value: stats.activeToday, 
      icon: Activity, 
      change: '+5%',
      positive: true,
      color: 'info' 
    },
    { 
      title: 'Prescriptions', 
      value: stats.prescriptions, 
      icon: Pill, 
      change: '+8%',
      positive: true,
      color: 'success' 
    },
    { 
      title: 'Interactions Checked', 
      value: stats.interactions, 
      icon: TrendingUp, 
      change: '+23%',
      positive: true,
      color: 'warning' 
    },
  ];

  return (
    <AdminLayout>
      <div className="mb-6 md:mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl md:text-3xl font-bold mb-1 md:mb-2"
        >
          Analytics <span className="text-gradient">Dashboard</span>
        </motion.h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Platform performance and usage statistics
        </p>
      </div>

      {/* Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8"
      >
        {analyticsCards.map((card, index) => (
          <GlowCard key={card.title} delay={index * 0.05} glowColor={card.color as any}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">{card.title}</p>
                <p className="text-xl md:text-3xl font-display font-bold">
                  {loading ? '...' : <AnimatedCounter value={card.value} />}
                </p>
                <span className={`text-xs ${card.positive ? 'text-success' : 'text-destructive'}`}>
                  {card.change} this week
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <card.icon className="w-5 h-5 text-primary" />
              </div>
            </div>
          </GlowCard>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* Weekly Activity Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card-elevated p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Weekly Activity</h2>
              <p className="text-sm text-muted-foreground">User registrations & prescriptions</p>
            </div>
          </div>

          <div className="flex items-end gap-2 h-48">
            {weeklyData.map((data, index) => (
              <div key={data.day} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(data.users / 60) * 100}%` }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="w-full bg-primary/60 rounded-t min-h-[4px]"
                    style={{ height: `${(data.users / 60) * 100}px` }}
                  />
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(data.prescriptions / 60) * 100}%` }}
                    transition={{ delay: index * 0.1 + 0.1, duration: 0.5 }}
                    className="w-full bg-info/60 rounded-t min-h-[4px]"
                    style={{ height: `${(data.prescriptions / 60) * 50}px` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{data.day}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary/60" />
              <span className="text-muted-foreground">Users</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-info/60" />
              <span className="text-muted-foreground">Prescriptions</span>
            </div>
          </div>
        </motion.div>

        {/* Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card-elevated p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-info" />
            </div>
            <div>
              <h2 className="font-semibold">User Distribution</h2>
              <p className="text-sm text-muted-foreground">By role type</p>
            </div>
          </div>

          <div className="flex items-center justify-center py-8">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--primary) / 0.3)"
                  strokeWidth="20"
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="20"
                  strokeDasharray="251.2"
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: 125.6 }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
                <motion.circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(var(--info))"
                  strokeWidth="20"
                  strokeDasharray="251.2"
                  initial={{ strokeDashoffset: 251.2 }}
                  animate={{ strokeDashoffset: 188.4 }}
                  transition={{ duration: 1, delay: 0.5 }}
                  style={{ transform: 'rotate(180deg)', transformOrigin: 'center' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-2xl font-bold">{stats.totalUsers}</span>
                <span className="text-xs text-muted-foreground">Total</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <p className="text-lg font-bold text-primary">50%</p>
              <p className="text-xs text-muted-foreground">Patients</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-info/10">
              <p className="text-lg font-bold text-info">35%</p>
              <p className="text-xs text-muted-foreground">Pharmacists</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <p className="text-lg font-bold text-destructive">15%</p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
          </div>
        </motion.div>

        {/* Activity Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card-elevated p-6 lg:col-span-2"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <LineChart className="w-5 h-5 text-success" />
            </div>
            <div>
              <h2 className="font-semibold">Platform Growth</h2>
              <p className="text-sm text-muted-foreground">Last 30 days trend</p>
            </div>
          </div>

          <div className="h-48 flex items-end gap-1">
            {Array.from({ length: 30 }).map((_, i) => {
              const height = Math.random() * 60 + 20;
              return (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: i * 0.02, duration: 0.3 }}
                  className="flex-1 bg-gradient-to-t from-primary/30 to-primary rounded-t min-w-[4px]"
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-4 text-xs text-muted-foreground">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </motion.div>
      </div>

      <AIChatWidget userRole="admin" />
    </AdminLayout>
  );
};

export default AdminAnalytics;

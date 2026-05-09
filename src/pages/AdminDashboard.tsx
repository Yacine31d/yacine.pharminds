import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  Activity,
  Globe,
  Lock,
  MapPin,
  Pill,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { GlowCard } from '@/components/ui/glow-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import AdminLayout from '@/components/admin/AdminLayout';
import { InterfaceSwitcher } from '@/components/admin/InterfaceSwitcher';
import { AIChatWidget } from '@/components/chat/AIChatWidget';
import type { Tables } from '@/integrations/supabase/types';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    pharmacists: 0,
    patients: 0,
    drugs: 0,
    interactions: 0
  });
  const [recentUsers, setRecentUsers] = useState<Tables<'profiles'>[]>([]);
  const [selectedWilaya, setSelectedWilaya] = useState('Alger');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchRecentUsers();
  }, []);

  const fetchStats = async () => {
    try {
      const [pharmacists, patients, drugs, interactions] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'pharmacist'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'patient'),
        supabase.from('drugs').select('id', { count: 'exact' }),
        supabase.from('drug_interactions').select('id', { count: 'exact' })
      ]);

      setStats({
        pharmacists: pharmacists.count || 0,
        patients: patients.count || 0,
        drugs: drugs.count || 0,
        interactions: interactions.count || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentUsers(data || []);
    } catch (error) {
      console.error('Error fetching recent users:', error);
    }
  };

  const statsData = [
    { label: 'Total Pharmacists', value: stats.pharmacists, icon: Pill, color: 'primary' },
    { label: 'Active Patients', value: stats.patients, icon: Users, color: 'info' },
    { label: 'Drugs in Database', value: stats.drugs, icon: Shield, color: 'success' },
    { label: 'Interactions Tracked', value: stats.interactions, icon: Activity, color: 'warning' },
  ];

  const wilayas = [
    { name: 'Alger', pharmacies: stats.pharmacists, alerts: 0 },
    { name: 'Oran', pharmacies: 0, alerts: 0 },
    { name: 'Constantine', pharmacies: 0, alerts: 0 },
    { name: 'Annaba', pharmacies: 0, alerts: 0 },
    { name: 'Blida', pharmacies: 0, alerts: 0 },
  ];

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold mb-1 md:mb-2"
          >
            Admin <span className="text-gradient">Command Center</span>
          </motion.h1>
          <p className="text-sm md:text-base text-muted-foreground">
            National-level oversight and system administration
          </p>
        </div>
        
        <span className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-full bg-success/10 border border-success/30 self-start">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span className="text-xs md:text-sm text-success whitespace-nowrap">All Systems Operational</span>
        </span>
      </div>

      {/* Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8"
      >
        {statsData.map((stat, index) => (
          <GlowCard key={stat.label} delay={index * 0.05} glowColor={stat.color as any}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-xl md:text-3xl font-display font-bold">
                  {loading ? '...' : <AnimatedCounter value={stat.value} />}
                </p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
            </div>
          </GlowCard>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
        {/* Recent Users */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 glass-card-elevated p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Recent Users</h2>
                <p className="text-sm text-muted-foreground">Latest registrations</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/admin/users'}>
              View All
            </Button>
          </div>

          {recentUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No users registered yet
            </div>
          ) : (
            <div className="space-y-3">
              {recentUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg bg-secondary/30 gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-foreground font-bold">
                      {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{user.full_name || 'No name'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      user.role === 'admin' ? 'bg-destructive/20 text-destructive' :
                      user.role === 'pharmacist' ? 'bg-primary/20 text-primary' :
                      'bg-secondary text-muted-foreground'
                    }`}>
                      {user.role}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Coverage */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">National Coverage</h3>
                <p className="text-xs text-muted-foreground">Wilaya distribution</p>
              </div>
            </div>

            <div className="space-y-2">
              {wilayas.map((wilaya, index) => (
                <div
                  key={wilaya.name}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                    selectedWilaya === wilaya.name 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'bg-secondary/30 hover:bg-secondary/50'
                  }`}
                  onClick={() => setSelectedWilaya(wilaya.name)}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span className="text-sm">{wilaya.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {wilaya.pharmacies} users
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Compliance Status */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <Lock className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold">System Status</h3>
                <p className="text-xs text-muted-foreground">Health checks</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Authentication</span>
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API Services</span>
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Storage</span>
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      
      <AIChatWidget userRole="admin" />
    </AdminLayout>
  );
};

export default AdminDashboard;

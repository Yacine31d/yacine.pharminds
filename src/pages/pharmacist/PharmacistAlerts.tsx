import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Bell,
  CheckCircle,
  Clock,
  Filter,
  AlertOctagon,
  Info,
  XCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GlowCard } from '@/components/ui/glow-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { PharmacistSidebar } from '@/components/pharmacist/Sidebar';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Alert {
  id: string;
  type: 'interaction' | 'stock' | 'expiry' | 'system';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
}

// Simulated alerts (in real app, would come from notifications table)
const generateAlerts = (): Alert[] => [
  {
    id: '1',
    type: 'interaction',
    severity: 'critical',
    title: 'Interaction Majeure Détectée',
    message: 'Warfarine + Aspirine: Risque hémorragique accru. Vérifier la prescription.',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    isRead: false
  },
  {
    id: '2',
    type: 'stock',
    severity: 'warning',
    title: 'Stock Faible - Paracétamol 500mg',
    message: 'Stock actuel: 15 unités. Seuil minimum: 50 unités. Commander rapidement.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    isRead: false
  },
  {
    id: '3',
    type: 'expiry',
    severity: 'warning',
    title: 'Péremption Proche',
    message: 'Amoxicilline 1g - Lot #A2024: Expire dans 30 jours. 45 unités concernées.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isRead: true
  },
  {
    id: '4',
    type: 'interaction',
    severity: 'warning',
    title: 'Interaction Modérée',
    message: 'Métformine + Alcool: Risque d\'hypoglycémie. Informer le patient.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
    isRead: true
  },
  {
    id: '5',
    type: 'system',
    severity: 'info',
    title: 'Mise à jour Base de Données',
    message: 'La base de données des interactions a été mise à jour avec 127 nouvelles entrées.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    isRead: true
  },
];

export default function PharmacistAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    // Simulate loading alerts
    setTimeout(() => {
      setAlerts(generateAlerts());
      setLoading(false);
    }, 500);
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const markAsRead = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    toast.success('Alerte marquée comme lue');
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
    toast.success('Toutes les alertes marquées comme lues');
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return !alert.isRead;
    if (filter === 'critical') return alert.severity === 'critical';
    return true;
  });

  const stats = [
    { label: 'Total Alertes', value: alerts.length, icon: Bell, color: 'primary' },
    { label: 'Non Lues', value: alerts.filter(a => !a.isRead).length, icon: AlertTriangle, color: 'warning' },
    { label: 'Critiques', value: alerts.filter(a => a.severity === 'critical').length, icon: AlertOctagon, color: 'destructive' },
    { label: 'Résolues', value: alerts.filter(a => a.isRead).length, icon: CheckCircle, color: 'success' },
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'interaction': return AlertTriangle;
      case 'stock': return AlertOctagon;
      case 'expiry': return Clock;
      default: return Info;
    }
  };

  const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${Math.floor(hours / 24)}j`;
  };

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
              Centre d'<span className="text-gradient">Alertes</span>
            </motion.h1>
            <p className="text-muted-foreground">
              Surveillance des interactions et notifications importantes
            </p>
          </div>
          
          <Button onClick={markAllAsRead} variant="outline" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Tout marquer comme lu
          </Button>
        </div>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((stat, index) => (
            <GlowCard key={stat.label} delay={index * 0.05} glowColor={stat.color as any}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-display font-bold">
                    {loading ? '...' : <AnimatedCounter value={stat.value} />}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-${stat.color}/10 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                </div>
              </div>
            </GlowCard>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 mb-6"
        >
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('all')}
          >
            Toutes
          </Button>
          <Button 
            variant={filter === 'unread' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setFilter('unread')}
          >
            Non lues ({alerts.filter(a => !a.isRead).length})
          </Button>
          <Button 
            variant={filter === 'critical' ? 'destructive' : 'outline'} 
            size="sm"
            onClick={() => setFilter('critical')}
          >
            Critiques ({alerts.filter(a => a.severity === 'critical').length})
          </Button>
        </motion.div>

        {/* Alerts List */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          {loading ? (
            <div className="glass-card p-8 text-center text-muted-foreground">
              Chargement des alertes...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="glass-card p-8 text-center text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
              <p>Aucune alerte à afficher</p>
            </div>
          ) : (
            filteredAlerts.map((alert, index) => {
              const Icon = getAlertIcon(alert.type);
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass-card p-4 border-l-4 ${
                    alert.severity === 'critical' ? 'border-l-destructive' :
                    alert.severity === 'warning' ? 'border-l-warning' : 'border-l-info'
                  } ${!alert.isRead ? 'bg-secondary/30' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      alert.severity === 'critical' ? 'bg-destructive/20' :
                      alert.severity === 'warning' ? 'bg-warning/20' : 'bg-info/20'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        alert.severity === 'critical' ? 'text-destructive' :
                        alert.severity === 'warning' ? 'text-warning' : 'text-info'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{alert.title}</h3>
                        {!alert.isRead && (
                          <Badge variant="secondary" className="text-xs">Nouveau</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                      <div className="flex items-center gap-3">
                        <SeverityBadge severity={alert.severity === 'critical' ? 'critical' : alert.severity === 'warning' ? 'warning' : 'safe'} />
                        <span className="text-xs text-muted-foreground">{formatTime(alert.timestamp)}</span>
                      </div>
                    </div>
                    
                    {!alert.isRead && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => markAsRead(alert.id)}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </main>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Bell, CheckCircle, Clock,
  Filter, AlertOctagon, Info, Radio, Package,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { GlowCard } from '@/components/ui/glow-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { PharmacistSidebar } from '@/components/pharmacist/Sidebar';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { RuptureRadar } from '@/components/pharmacist/RuptureRadar';
import { useAuth } from '@/contexts/AuthContext';

type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertType     = 'stock' | 'expiry' | 'interaction' | 'system';

interface Alert {
  id:        string;
  type:      AlertType;
  severity:  AlertSeverity;
  title:     string;
  message:   string;
  timestamp: Date;
  isRead:    boolean;
}

/* ── derive alerts from inventory rows ────────────────────────────────── */
function inventoryToAlerts(rows: any[]): Alert[] {
  const alerts: Alert[] = [];
  const now = Date.now();

  rows.forEach(inv => {
    const drugName = inv.drugs?.commercial_name
      ?? inv.drugs?.name_fr
      ?? 'Médicament inconnu';

    /* low-stock alert */
    if (inv.current_stock < inv.min_stock_threshold) {
      const ratio = inv.current_stock / Math.max(inv.min_stock_threshold, 1);
      alerts.push({
        id:        `stock-${inv.id}`,
        type:      'stock',
        severity:  ratio < 0.25 ? 'critical' : 'warning',
        title:     `Stock faible — ${drugName}`,
        message:   `Stock actuel : ${inv.current_stock} unité(s). Seuil minimum : ${inv.min_stock_threshold}. Commander rapidement.`,
        timestamp: new Date(inv.updated_at ?? now),
        isRead:    false,
      });
    }

    /* near-expiry alert (≤ 45 days) */
    if (inv.expiry_date) {
      const daysLeft = Math.ceil(
        (new Date(inv.expiry_date).getTime() - now) / 86_400_000
      );
      if (daysLeft <= 45 && daysLeft >= 0) {
        alerts.push({
          id:        `expiry-${inv.id}`,
          type:      'expiry',
          severity:  daysLeft <= 14 ? 'critical' : 'warning',
          title:     `Péremption ${daysLeft <= 14 ? 'imminente' : 'proche'} — ${drugName}`,
          message:   `Lot ${inv.batch_number ?? '—'} : expire ${
            daysLeft === 0 ? 'aujourd\'hui' : `dans ${daysLeft} jour(s)`
          }. ${inv.current_stock} unité(s) concernée(s).`,
          timestamp: new Date(inv.updated_at ?? now),
          isRead:    false,
        });
      }
    }
  });

  /* sort: critical first, then by timestamp desc */
  return alerts.sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 };
    return sev[a.severity] - sev[b.severity]
      || b.timestamp.getTime() - a.timestamp.getTime();
  });
}

const ALERT_TYPE_ICON: Record<AlertType, React.ElementType> = {
  stock:       Package,
  expiry:      Clock,
  interaction: AlertTriangle,
  system:      Info,
};

const formatAge = (date: Date) => {
  const m = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (m < 60)  return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
};

/* ═══════════════════════════════════════════════════════════════════════ */
export default function PharmacistAlerts() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [filter,    setFilter]    = useState<'all' | 'unread' | 'critical'>('all');
  const [activeTab, setActiveTab] = useState<'alerts' | 'radar'>('alerts');
  /* local read-state: set of IDs marked read in this session */
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  /* ── fetch real inventory with drug details ── */
  const { data: rawAlerts = [], isLoading } = useQuery<Alert[]>({
    queryKey: ['pharmacist-alerts-inventory', profile?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          id, current_stock, min_stock_threshold,
          expiry_date, batch_number, updated_at,
          drugs(commercial_name, name_fr)
        `)
        .order('current_stock', { ascending: true });
      if (error) throw error;
      return inventoryToAlerts(data ?? []);
    },
    staleTime: 2 * 60 * 1000,
  });

  /* merge isRead state */
  const alerts: Alert[] = rawAlerts.map(a => ({
    ...a,
    isRead: readIds.has(a.id),
  }));

  const markAsRead = (id: string) => {
    setReadIds(prev => new Set([...prev, id]));
    toast.success('Alerte marquée comme lue');
  };

  const markAllAsRead = () => {
    setReadIds(new Set(alerts.map(a => a.id)));
    toast.success('Toutes les alertes marquées comme lues');
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'unread')   return !a.isRead;
    if (filter === 'critical') return a.severity === 'critical';
    return true;
  });

  const stats = [
    { label: 'Total Alertes',  value: alerts.length,                                  icon: Bell,         color: 'primary'     },
    { label: 'Non Lues',       value: alerts.filter(a => !a.isRead).length,            icon: AlertTriangle, color: 'warning'    },
    { label: 'Critiques',      value: alerts.filter(a => a.severity === 'critical').length, icon: AlertOctagon, color: 'destructive' },
    { label: 'Résolues',       value: alerts.filter(a => a.isRead).length,             icon: CheckCircle,   color: 'success'    },
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
              Centre d'<span className="text-gradient">Alertes</span>
            </motion.h1>
            <p className="text-muted-foreground">
              Surveillance des stocks, péremptions et réseau national
            </p>
          </div>
          <Button onClick={markAllAsRead} variant="outline" className="gap-2" disabled={isLoading}>
            <CheckCircle className="w-4 h-4" />
            Tout marquer comme lu
          </Button>
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((s, i) => (
            <GlowCard key={s.label} delay={i * 0.05} glowColor={s.color as any}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-3xl font-display font-bold">
                    {isLoading ? <span className="animate-pulse">…</span> : <AnimatedCounter value={s.value} />}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-${s.color}/10 flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 text-${s.color}`} />
                </div>
              </div>
            </GlowCard>
          ))}
        </motion.div>

        {/* Tab bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex items-center gap-2 mb-6"
        >
          <Button
            variant={activeTab === 'alerts' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('alerts')}
            className="gap-2"
          >
            <Bell className="w-3.5 h-3.5" />
            Alertes Inventaire
          </Button>
          <Button
            variant={activeTab === 'radar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('radar')}
            className="gap-2"
          >
            <Radio className="w-3.5 h-3.5" />
            🛰️ Radar Réseau
          </Button>
        </motion.div>

        {/* ── Radar tab ── */}
        {activeTab === 'radar' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5"
          >
            <RuptureRadar pharmacistWilaya={profile?.wilaya ?? null} />
          </motion.div>
        )}

        {/* ── Alerts tab ── */}
        {activeTab === 'alerts' && (
          <>
            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 mb-6 flex-wrap"
            >
              <Filter className="w-4 h-4 text-muted-foreground" />
              {(['all', 'unread', 'critical'] as const).map(f => (
                <Button
                  key={f}
                  variant={filter === f ? (f === 'critical' ? 'destructive' : 'default') : 'outline'}
                  size="sm"
                  onClick={() => setFilter(f)}
                >
                  {f === 'all'      && 'Toutes'}
                  {f === 'unread'   && `Non lues (${alerts.filter(a => !a.isRead).length})`}
                  {f === 'critical' && `Critiques (${alerts.filter(a => a.severity === 'critical').length})`}
                </Button>
              ))}
            </motion.div>

            {/* List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              {isLoading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="h-24 rounded-2xl bg-secondary/30 animate-pulse" />
                ))
              ) : filteredAlerts.length === 0 ? (
                <div className="glass-card p-12 text-center text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
                  <p className="font-medium">Aucune alerte active ✅</p>
                  <p className="text-sm mt-1">Votre inventaire est en bonne santé</p>
                </div>
              ) : (
                filteredAlerts.map((alert, idx) => {
                  const Icon = ALERT_TYPE_ICON[alert.type];
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`glass-card p-4 border-l-4 ${
                        alert.severity === 'critical' ? 'border-l-destructive' :
                        alert.severity === 'warning'  ? 'border-l-warning' : 'border-l-info'
                      } ${!alert.isRead ? 'bg-secondary/20' : 'opacity-75'}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          alert.severity === 'critical' ? 'bg-destructive/20' :
                          alert.severity === 'warning'  ? 'bg-warning/20' : 'bg-info/20'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            alert.severity === 'critical' ? 'text-destructive' :
                            alert.severity === 'warning'  ? 'text-warning' : 'text-info'
                          }`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-sm">{alert.title}</h3>
                            {!alert.isRead && (
                              <Badge variant="secondary" className="text-[10px]">Nouveau</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-3 flex-wrap">
                            <SeverityBadge severity={
                              alert.severity === 'critical' ? 'critical' :
                              alert.severity === 'warning'  ? 'warning'  : 'safe'
                            } />
                            <span className="text-xs text-muted-foreground">
                              {formatAge(alert.timestamp)}
                            </span>
                          </div>
                        </div>

                        {!alert.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
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
          </>
        )}
      </main>
    </div>
  );
}

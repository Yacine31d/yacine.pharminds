/**
 * RuptureRadar — Shortage Alert Radar  (UI v2)
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, AlertOctagon, Info, RefreshCw, Package,
  ExternalLink, CheckCircle, Radio, TrendingDown, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface ShortageAlert {
  id: string;
  drug_id: string;
  wilaya: string | null;
  alert_type: 'low_stock_network' | 'demand_spike' | 'seasonal_risk' | 'manual';
  severity: 'critical' | 'warning' | 'info';
  affected_pharmacies_count: number;
  message_fr: string;
  is_active: boolean;
  created_at: string;
  drugs?: { commercial_name: string; generic_name: string } | null;
}

interface LocalAlert {
  id: string; drug_id: string; drug_name: string;
  current_stock: number; min_stock_threshold: number;
}

interface RuptureRadarProps { pharmacistWilaya?: string | null; }

const TYPE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  low_stock_network: { label: 'Réseau faible',      icon: TrendingDown },
  demand_spike:      { label: 'Pic de demande',     icon: Zap },
  seasonal_risk:     { label: 'Risque saisonnier',  icon: AlertTriangle },
  manual:            { label: 'Alerte manuelle',    icon: Radio },
};

const SEV = {
  critical: { bg: 'bg-destructive/8',  border: 'border-destructive/25', dot: 'bg-destructive', icon: AlertOctagon,  text: 'text-destructive',  label: '🔴 Critiques' },
  warning:  { bg: 'bg-warning/8',      border: 'border-warning/25',     dot: 'bg-warning',     icon: AlertTriangle, text: 'text-warning',      label: '🟡 Avertissements' },
  info:     { bg: 'bg-info/8',         border: 'border-info/25',        dot: 'bg-info',        icon: Info,          text: 'text-info',         label: '🔵 Informations' },
};

const formatAge = (iso: string) => {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'il y a < 1h';
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
};

function AlertCard({ alert, navigate }: { alert: ShortageAlert; navigate: (p: string) => void }) {
  const s = SEV[alert.severity];
  const SevIcon = s.icon;
  const typeInfo = TYPE_LABELS[alert.alert_type] ?? { label: alert.alert_type, icon: Info };
  const TypeIcon = typeInfo.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-start gap-3 p-4 rounded-xl border ${s.bg} ${s.border} group hover:border-opacity-50 transition-all`}
    >
      {/* Severity indicator */}
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <div className={`w-2 h-2 rounded-full ${s.dot} ${alert.severity === 'critical' ? 'animate-pulse' : ''}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div>
            <p className="font-semibold text-sm">
              {(alert.drugs as any)?.commercial_name ?? 'Médicament'}
            </p>
            <p className="text-xs text-muted-foreground">
              {(alert.drugs as any)?.generic_name}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={() => navigate(`/pharmacist/inventory?drug=${alert.drug_id}`)}
          >
            <Package className="w-3 h-3" /> Commander
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{alert.message_fr}</p>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-background/60 border ${s.border} ${s.text}`}>
            <TypeIcon className="w-2.5 h-2.5" />
            {typeInfo.label}
          </span>
          {alert.wilaya && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{alert.wilaya}</Badge>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">{formatAge(alert.created_at)}</span>
        </div>

        {alert.affected_pharmacies_count > 1 && (
          <p className="text-[10px] text-muted-foreground mt-1">
            {alert.affected_pharmacies_count} pharmacie(s) concernée(s)
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function RuptureRadar({ pharmacistWilaya }: RuptureRadarProps) {
  const navigate = useNavigate();
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: networkAlerts = [], isLoading: loadingNet, refetch: refetchNet } = useQuery({
    queryKey: ['shortage-alerts', pharmacistWilaya],
    queryFn: async (): Promise<ShortageAlert[]> => {
      const { data, error } = await supabase
        .from('shortage_alerts')
        .select('*, drugs(commercial_name, generic_name)')
        .eq('is_active', true)
        .order('severity').order('created_at', { ascending: false });
      if (error) return [];
      // filter by wilaya client-side
      return (data ?? []).filter((a: any) =>
        !pharmacistWilaya || !a.wilaya || a.wilaya === pharmacistWilaya
      ) as ShortageAlert[];
    },
  });

  const { data: localAlerts = [], isLoading: loadingLocal, refetch: refetchLocal } = useQuery({
    queryKey: ['local-low-stock'],
    queryFn: async (): Promise<LocalAlert[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      const { data } = await supabase
        .from('inventory')
        .select('id,drug_id,current_stock,min_stock_threshold,drugs(commercial_name)')
        .eq('pharmacy_id', session.user.id);
      return ((data ?? []) as any[])
        .filter(r => r.current_stock < (r.min_stock_threshold ?? 10))
        .map(r => ({
          id: r.id, drug_id: r.drug_id,
          drug_name: r.drugs?.commercial_name ?? 'Médicament',
          current_stock: r.current_stock,
          min_stock_threshold: r.min_stock_threshold ?? 10,
        }));
    },
  });

  const handleRefresh = async () => {
    await Promise.all([refetchNet(), refetchLocal()]);
    setLastRefresh(new Date());
    toast.success('Données actualisées');
  };

  const critiques = networkAlerts.filter(a => a.severity === 'critical');
  const warnings  = networkAlerts.filter(a => a.severity === 'warning');
  const infos     = networkAlerts.filter(a => a.severity === 'info');
  const isLoading = loadingNet || loadingLocal;
  const hasAlerts = networkAlerts.length > 0 || localAlerts.length > 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-info/10 flex items-center justify-center">
              <Radio className="w-5 h-5 text-primary" />
            </div>
            {hasAlerts && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-destructive border-2 border-card animate-pulse" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm">Radar Réseau National</p>
            <p className="text-xs text-muted-foreground">
              {pharmacistWilaya ? `Wilaya de ${pharmacistWilaya}` : 'Toutes les wilayas'}
              {' · '}{networkAlerts.length + localAlerts.length} alerte(s) active(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground hidden sm:inline">{formatAge(lastRefresh.toISOString())}</span>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Summary chips */}
      {!isLoading && hasAlerts && (
        <div className="flex items-center gap-2 flex-wrap">
          {critiques.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              <AlertOctagon className="w-3 h-3" /> {critiques.length} critique(s)
            </span>
          )}
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-warning/10 text-warning border border-warning/20">
              <AlertTriangle className="w-3 h-3" /> {warnings.length} avertissement(s)
            </span>
          )}
          {localAlerts.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-400/20">
              <Package className="w-3 h-3" /> {localAlerts.length} stock(s) local faible
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-secondary/30 animate-pulse" />)}
        </div>
      ) : !hasAlerts ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <p className="font-semibold">Réseau stable ✅</p>
          <p className="text-xs text-muted-foreground mt-1">Aucune rupture détectée dans votre réseau</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {/* Local low stock */}
          {localAlerts.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-500 mb-2 flex items-center gap-1.5">
                <Package className="w-3 h-3" /> Stock local faible
              </p>
              <div className="space-y-2">
                {localAlerts.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-amber-400/20 bg-amber-500/5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-sm font-medium">{a.drug_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 rounded-full bg-secondary w-16 overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${Math.min(100, (a.current_stock / a.min_stock_threshold) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-amber-500 font-medium">{a.current_stock}/{a.min_stock_threshold}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-primary"
                        onClick={() => navigate(`/pharmacist/inventory?drug=${a.drug_id}`)}>
                        <ExternalLink className="w-3 h-3" /> Voir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critical */}
          {critiques.length > 0 && (
            <AnimatePresence>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-destructive mb-2 flex items-center gap-1.5">
                  <AlertOctagon className="w-3 h-3" /> {SEV.critical.label}
                </p>
                <div className="space-y-2">
                  {critiques.map(a => <AlertCard key={a.id} alert={a} navigate={navigate} />)}
                </div>
              </div>
            </AnimatePresence>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-warning mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> {SEV.warning.label}
              </p>
              <div className="space-y-2">
                {warnings.map(a => <AlertCard key={a.id} alert={a} navigate={navigate} />)}
              </div>
            </div>
          )}

          {/* Info */}
          {infos.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-info mb-2 flex items-center gap-1.5">
                <Info className="w-3 h-3" /> {SEV.info.label}
              </p>
              <div className="space-y-2">
                {infos.map(a => <AlertCard key={a.id} alert={a} navigate={navigate} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

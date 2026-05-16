/**
 * DCISwitchPanel — Generic substitution engine  (UI v2)
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight, CheckCircle, X, ChevronDown, ChevronUp,
  Pill, Package, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Drug {
  id: string; name_fr: string; generic_name: string;
  form?: string | null; dosage?: string | null;
  manufacturer?: string | null; price_dz?: number | null;
  is_generic?: boolean | null; cnas_reimbursable?: boolean | null;
}

interface DCISwitchPanelProps {
  medicationName: string; currentDrugId?: string;
  genericName?: string;
  /** Pre-fetched alternatives from a parent batch query — skips the internal query when provided */
  preloadedAlternatives?: (Drug & { inStock: boolean })[];
  onSelect: (drug: Drug) => void;
  onDismiss: () => void;
}

export function DCISwitchPanel({ medicationName, currentDrugId, genericName, preloadedAlternatives, onSelect, onDismiss }: DCISwitchPanelProps) {
  const [expanded, setExpanded] = useState(true);

  // Only run the internal query when the parent hasn't pre-fetched data
  const { data: fetchedAlternatives = [], isLoading } = useQuery({
    queryKey: ['dci-alt', currentDrugId, genericName],
    queryFn: async (): Promise<(Drug & { inStock: boolean })[]> => {
      if (!currentDrugId && !genericName) return [];

      let q = supabase
        .from('drugs')
        .select('id,name_fr,generic_name,form,dosage,manufacturer,price_dz,is_generic,cnas_reimbursable')
        .order('is_generic', { ascending: false })
        .order('price_dz', { ascending: true })
        .limit(8);

      if (genericName) q = q.ilike('generic_name', `%${genericName}%`);
      if (currentDrugId) q = q.neq('id', currentDrugId);

      const { data: drugs } = await q;
      if (!drugs?.length) return [];

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return drugs.map(d => ({ ...d, inStock: false }));

      const { data: inv } = await supabase
        .from('inventory').select('drug_id,current_stock')
        .eq('pharmacy_id', session.user.id)
        .in('drug_id', drugs.map(d => d.id))
        .gt('current_stock', 0);

      const stockSet = new Set((inv ?? []).map((i: any) => i.drug_id));
      return drugs
        .map(d => ({ ...d, inStock: stockSet.has(d.id) }))
        .sort((a, b) => {
          if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
          if (a.is_generic !== b.is_generic) return a.is_generic ? -1 : 1;
          return (a.price_dz ?? 9999) - (b.price_dz ?? 9999);
        })
        .slice(0, 5);
    },
    // Skip internal query entirely when parent already provided data
    enabled: preloadedAlternatives === undefined && !!(currentDrugId || genericName),
  });

  // Use pre-fetched data when available, fall back to internal query result
  const alternatives = preloadedAlternatives ?? fetchedAlternatives;

  return (
    <AnimatePresence>
      {expanded ? (
        <motion.div
          key="expanded"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-2 overflow-hidden"
        >
          <div className="rounded-xl border border-amber-400/25 bg-amber-500/5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-amber-400/15 bg-amber-500/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <ArrowLeftRight className="w-3 h-3 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-600">Substitut DCI disponible</p>
                  <p className="text-[10px] text-muted-foreground">{medicationName} — indisponible ou non référencé</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setExpanded(false)}>
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={onDismiss}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Alternatives */}
            <div className="p-3 space-y-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[1,2].map(i => <div key={i} className="h-12 rounded-lg bg-secondary/30 animate-pulse" />)}
                </div>
              ) : alternatives.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 text-center">Aucun substitut trouvé dans la base de données</p>
              ) : (
                alternatives.map((drug, idx) => (
                  <motion.div
                    key={drug.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                      drug.inStock
                        ? 'bg-success/5 border-success/20 hover:border-success/40 hover:bg-success/8'
                        : 'bg-secondary/30 border-border/40 opacity-65'
                    }`}
                  >
                    {/* Stock indicator */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${drug.inStock ? 'bg-success' : 'bg-muted-foreground/40'}`} />

                    {/* Drug info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <p className="text-sm font-semibold truncate">{drug.name_fr}</p>
                        {drug.is_generic && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-info/40 text-info leading-none">
                            Générique
                          </Badge>
                        )}
                        {drug.cnas_reimbursable && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-success/40 text-success leading-none">
                            CNAS
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {drug.dosage && <span>{drug.dosage}</span>}
                        {drug.manufacturer && <span className="truncate max-w-[90px]">{drug.manufacturer}</span>}
                        {drug.price_dz != null && (
                          <span className="text-primary font-semibold ml-auto">{drug.price_dz} DA</span>
                        )}
                      </div>
                    </div>

                    {/* Status + action */}
                    <div className="flex items-center gap-2 shrink-0">
                      {drug.inStock ? (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded-md">
                          <CheckCircle className="w-2.5 h-2.5" /> Stock
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded-md">
                          <Package className="w-2.5 h-2.5" /> Indispo
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant={drug.inStock ? 'default' : 'outline'}
                        className="h-7 text-xs px-2.5 gap-1"
                        onClick={() => { onSelect(drug); toast.success(`Substitut : ${drug.name_fr}`); }}
                      >
                        <Zap className="w-3 h-3" /> Utiliser
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}

              <Button variant="ghost" size="sm" className="w-full mt-1 text-xs text-muted-foreground h-7 hover:text-foreground" onClick={onDismiss}>
                Pas de substitution
              </Button>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5">
          <button onClick={() => setExpanded(true)}
            className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 transition-colors"
          >
            <ArrowLeftRight className="w-3 h-3" />
            Voir substituts DCI disponibles
            <ChevronDown className="w-3 h-3" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

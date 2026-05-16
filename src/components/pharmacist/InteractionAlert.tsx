import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
  Pill,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SeverityBadge } from '@/components/ui/severity-badge';

interface ExtractedMedication {
  name: string;
  name_ar?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
}

interface Interaction {
  id: string;
  severity: string;
  description_fr: string;
  description_ar: string;
  mechanism: string | null;
  recommendation_fr: string | null;
  drug_a_name: string;
  drug_b_name: string;
}

interface InteractionAlertProps {
  medications: ExtractedMedication[];
  patientId?: string;
  onComplete?: (interactions: Interaction[]) => void;
}

/**
 * Escape characters that would break a PostgREST .or() filter string.
 * PostgREST uses parentheses to group, commas to separate, and dots in
 * column paths — all of which are present in real drug names like
 * "Amoxicilline (500mg)" or "Vit. B12".
 */
function escapePostgRest(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/,/g, '\\,')
    .replace(/\./g, '\\.')
    .replace(/'/g, "''"); // SQL literal single-quote
}

export function InteractionAlert({ medications, patientId, onComplete }: InteractionAlertProps) {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [patientMeds, setPatientMeds] = useState<string[]>([]);

  useEffect(() => {
    if (medications.length > 0) {
      checkInteractions();
    }
  }, [medications]);

  const checkInteractions = async () => {
    setLoading(true);
    
    try {
      // 1. Get all drug names from extracted medications
      const medNames = medications.map((m) => m.name.toLowerCase());

      // 2. If we have a patient, fetch their existing medications
      let existingMedNames: string[] = [];
      if (patientId) {
        const { data: existingMeds } = await supabase
          .from('patient_medications')
          .select('drugs(name_fr, generic_name)')
          .eq('user_id', patientId);

        if (existingMeds) {
          existingMedNames = existingMeds.map((m: any) => 
            (m.drugs?.name_fr || m.drugs?.generic_name || '').toLowerCase()
          );
          setPatientMeds(existingMedNames);
        }
      }

      // 3. Combine all med names (prescription + existing)
      const allMedNames = [...new Set([...medNames, ...existingMedNames])];

      // Guard: nothing to search
      if (allMedNames.length === 0) {
        setInteractions([]);
        setLoading(false);
        onComplete?.([]);
        return;
      }

      // 4. Find matching drugs in DB
      //    Escape special characters so drug names with "(", ")", "," or "."
      //    don't break the PostgREST .or() filter syntax (Bug 6 fix).
      const { data: matchedDrugs } = await supabase
        .from('drugs')
        .select('id, name_fr, generic_name')
        .or(
          allMedNames
            .map((name) => {
              const safe = escapePostgRest(name);
              return `name_fr.ilike.%${safe}%,generic_name.ilike.%${safe}%`;
            })
            .join(',')
        );

      if (!matchedDrugs || matchedDrugs.length < 2) {
        setInteractions([]);
        setLoading(false);
        onComplete?.([]);
        return;
      }

      // 5. Check interactions between all matched drugs
      const drugIds = matchedDrugs.map((d) => d.id);
      const { data: foundInteractions } = await supabase
        .from('drug_interactions')
        .select('*')
        .or(
          drugIds
            .flatMap((id, i) =>
              drugIds.slice(i + 1).map((id2) =>
                `and(drug_a_id.eq.${id},drug_b_id.eq.${id2}),and(drug_a_id.eq.${id2},drug_b_id.eq.${id})`
              )
            )
            .join(',')
        );

      // 6. Map results with drug names
      const drugMap = new Map(matchedDrugs.map((d) => [d.id, d.name_fr]));
      const results: Interaction[] = (foundInteractions || []).map((i) => ({
        id: i.id,
        severity: i.severity,
        description_fr: i.description_fr,
        description_ar: i.description_ar,
        mechanism: i.mechanism,
        recommendation_fr: i.recommendation_fr,
        drug_a_name: drugMap.get(i.drug_a_id) || 'Unknown',
        drug_b_name: drugMap.get(i.drug_b_id) || 'Unknown',
      }));

      setInteractions(results);
      onComplete?.(results);
    } catch (error) {
      console.error('Interaction check error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card p-4"
      >
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
          <span className="text-sm">Vérification des interactions...</span>
        </div>
      </motion.div>
    );
  }

  const criticalCount = interactions.filter((i) => i.severity === 'critical' || i.severity === 'majeure').length;
  const warningCount = interactions.filter((i) => i.severity === 'warning' || i.severity === 'modérée').length;
  const safeCount = medications.length > 1 && interactions.length === 0 ? 1 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Summary Banner */}
      <div
        className={`glass-card p-4 border-l-4 ${
          criticalCount > 0
            ? 'border-l-destructive bg-destructive/5'
            : warningCount > 0
            ? 'border-l-warning bg-warning/5'
            : 'border-l-success bg-success/5'
        }`}
      >
        <div className="flex items-center gap-3">
          {criticalCount > 0 ? (
            <ShieldAlert className="w-6 h-6 text-destructive" />
          ) : warningCount > 0 ? (
            <AlertTriangle className="w-6 h-6 text-warning" />
          ) : (
            <CheckCircle className="w-6 h-6 text-success" />
          )}
          <div>
            <h4 className="font-semibold text-sm">
              {criticalCount > 0
                ? `⚠️ ${criticalCount} interaction(s) critique(s) détectée(s)!`
                : warningCount > 0
                ? `${warningCount} interaction(s) à surveiller`
                : '✅ Aucune interaction dangereuse détectée'}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {medications.length} médicament(s) analysé(s)
              {patientMeds.length > 0 && ` + ${patientMeds.length} traitement(s) en cours`}
            </p>
          </div>
        </div>
      </div>

      {/* Interaction Details */}
      <AnimatePresence>
        {interactions.map((interaction) => (
          <motion.div
            key={interaction.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card p-4 cursor-pointer"
            onClick={() => setExpandedId(expandedId === interaction.id ? null : interaction.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SeverityBadge
                  severity={
                    interaction.severity === 'majeure' || interaction.severity === 'critical'
                      ? 'critical'
                      : interaction.severity === 'modérée' || interaction.severity === 'warning'
                      ? 'warning'
                      : 'safe'
                  }
                />
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Pill className="w-3 h-3 text-primary" />
                    {interaction.drug_a_name}
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <Pill className="w-3 h-3 text-primary" />
                    {interaction.drug_b_name}
                  </div>
                </div>
              </div>
              {expandedId === interaction.id ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>

            <AnimatePresence>
              {expandedId === interaction.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
                    <p className="text-sm">{interaction.description_fr}</p>
                    {interaction.mechanism && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>Mécanisme: {interaction.mechanism}</span>
                      </div>
                    )}
                    {interaction.recommendation_fr && (
                      <div className="p-2 rounded bg-primary/5 text-xs">
                        💡 {interaction.recommendation_fr}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

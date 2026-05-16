/**
 * OrdonnanceClaire — Plain-language prescription view  (UI v2)
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Pill, Clock, Bell, Printer, Languages, CheckCircle,
  Calendar, ShieldCheck, Sparkles, BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Ordonnance {
  id: string; doctor_name: string; doctor_specialty?: string | null;
  prescription_date: string; notes?: string | null;
}
interface OrdonnanceMedication {
  id: string; medication_name: string; dosage?: string | null;
  frequency?: string | null; duration?: string | null;
  quantity?: number | null; instructions?: string | null; drug_id?: string | null;
}
interface DrugInfo {
  id: string; description_fr?: string | null; description_ar?: string | null;
  usage_tip_fr?: string | null; cnas_reimbursable?: boolean | null; generic_name?: string | null;
}

const parseDosageSchedule = (freq?: string | null) => {
  if (!freq) return [];
  const f = freq.toLowerCase();
  const times: Array<{ label: string; emoji: string; labelAr: string }> = [];
  if (f.includes('matin') || f.includes('morning') || /[34][\s×x]/.test(f) || f.includes('1×') || f.includes('1x'))
    times.push({ label: 'Matin', emoji: '🌅', labelAr: 'صباحاً' });
  if (f.includes('midi') || f.includes('noon') || /[34][\s×x]/.test(f))
    times.push({ label: 'Midi', emoji: '☀️', labelAr: 'ظهراً' });
  if (f.includes('soir') || f.includes('evening') || /[234][\s×x]/.test(f))
    times.push({ label: 'Soir', emoji: '🌆', labelAr: 'مساءً' });
  if (f.includes('nuit') || f.includes('coucher') || f.includes('night') || /4[\s×x]/.test(f))
    times.push({ label: 'Nuit', emoji: '🌙', labelAr: 'ليلاً' });
  if (times.length === 0 && freq)
    times.push({ label: 'Selon prescription', emoji: '💊', labelAr: 'حسب الوصفة' });
  return times;
};

function MedCard({ med, drugInfo, lang, onAddReminder, reminderAdded }: {
  med: OrdonnanceMedication; drugInfo?: DrugInfo; lang: 'fr' | 'ar';
  onAddReminder: (m: OrdonnanceMedication) => void; reminderAdded: boolean;
}) {
  const schedule    = parseDosageSchedule(med.frequency);
  const description = lang === 'ar'
    ? (drugInfo?.description_ar || drugInfo?.description_fr || 'دواء مقرر من طبيبك')
    : (drugInfo?.description_fr || 'Médicament prescrit par votre médecin');
  const tip         = lang === 'fr' ? (drugInfo?.usage_tip_fr ?? null) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border/60 overflow-hidden bg-card"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Drug header bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/40">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Pill className="w-4.5 h-4.5 text-primary" style={{ width: '1.1rem', height: '1.1rem' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{med.medication_name}</p>
          {med.dosage && <p className="text-xs text-muted-foreground">{med.dosage}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {drugInfo?.cnas_reimbursable && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-success/40 text-success gap-1">
              <ShieldCheck className="w-2.5 h-2.5" /> CNAS
            </Badge>
          )}
          {med.duration && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-1 border-info/30 text-info">
              <Calendar className="w-2.5 h-2.5" /> {med.duration}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Plain description */}
        <div className="flex gap-2.5">
          <BookOpen className="w-4 h-4 text-primary/60 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs leading-relaxed text-foreground/80">{description}</p>
            {tip && (
              <p className="text-xs text-info mt-1.5 flex items-start gap-1">
                <span className="shrink-0 mt-0.5">💡</span>
                <span>{tip}</span>
              </p>
            )}
          </div>
        </div>

        {/* Dosage schedule chips */}
        {schedule.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {schedule.map(s => (
              <span key={s.label}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-secondary/60 border border-border/50 hover:bg-secondary transition-colors"
              >
                <span className="text-base leading-none">{s.emoji}</span>
                <span>{lang === 'ar' ? s.labelAr : s.label}</span>
              </span>
            ))}
            {med.frequency && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1.5 rounded-full">
                <Clock className="w-3 h-3" /> {med.frequency}
              </span>
            )}
          </div>
        )}

        {/* Reminder button */}
        <div className="flex justify-end pt-1">
          <AnimatePresence mode="wait">
            {reminderAdded ? (
              <motion.span key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 text-xs text-success font-medium"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'تمت إضافة التذكير' : 'Rappel ajouté'}
              </motion.span>
            ) : (
              <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button variant="ghost" size="sm"
                  className="h-7 text-xs gap-1.5 text-primary hover:bg-primary/8 hover:text-primary"
                  onClick={() => onAddReminder(med)}
                >
                  <Bell className="w-3 h-3" />
                  {lang === 'ar' ? 'إضافة تذكير' : 'Ajouter un rappel'}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export function OrdonnanceClaire({ ordonnance, medications }: {
  ordonnance: Ordonnance; medications: OrdonnanceMedication[];
}) {
  const [lang, setLang]                     = useState<'fr' | 'ar'>('fr');
  const [remindersAdded, setRemindersAdded] = useState<Set<string>>(new Set());
  const queryClient                         = useQueryClient();

  const drugIds = medications.map(m => m.drug_id).filter(Boolean) as string[];

  const { data: drugInfoMap = {} } = useQuery({
    queryKey: ['drug-info-claire', drugIds],
    queryFn: async (): Promise<Record<string, DrugInfo>> => {
      if (!drugIds.length) return {};
      const { data } = await supabase
        .from('drugs')
        .select('id,description_fr,description_ar,usage_tip_fr,cnas_reimbursable,generic_name')
        .in('id', drugIds);
      const map: Record<string, DrugInfo> = {};
      for (const d of (data ?? []) as DrugInfo[]) map[d.id] = d;
      return map;
    },
    enabled: drugIds.length > 0,
  });

  const addReminder = useMutation({
    mutationFn: async (med: OrdonnanceMedication) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      await supabase.from('patient_medications').insert({
        user_id: session.user.id, medication_name: med.medication_name,
        dosage: med.dosage ?? null, frequency: med.frequency ?? null,
        duration: med.duration ?? null, start_date: new Date().toISOString().split('T')[0],
        notes: med.instructions ?? null, drug_id: med.drug_id ?? null, is_active: true,
      });
    },
    onSuccess: (_, med) => {
      setRemindersAdded(prev => new Set([...prev, med.id]));
      queryClient.invalidateQueries({ queryKey: ['patient-medications'] });
      toast.success(`Rappel ajouté — ${med.medication_name}`);
    },
    onError: () => toast.error('Erreur lors de l\'ajout du rappel'),
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/3 to-transparent p-4"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-gradient">
            {lang === 'ar' ? 'الوصفة الواضحة' : 'Ordonnance Claire'}
          </p>
          <Badge variant="outline" className="text-[10px] px-1.5 h-4 border-primary/30 text-primary">
            {lang === 'ar' ? 'مبسطة' : 'Simplifiée'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5"
            onClick={() => setLang(l => l === 'fr' ? 'ar' : 'fr')}
          >
            <Languages className="w-3.5 h-3.5" />
            {lang === 'fr' ? 'عربي' : 'Français'}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" />
            {lang === 'ar' ? 'طباعة' : 'Imprimer'}
          </Button>
        </div>
      </div>

      {/* Prescription meta */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-background/60 border border-border/40 text-xs">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <span className="text-base">👨‍⚕️</span>
        </div>
        <div>
          <p className="font-semibold">{ordonnance.doctor_name}</p>
          <p className="text-muted-foreground">
            {ordonnance.doctor_specialty && `${ordonnance.doctor_specialty} · `}
            {new Date(ordonnance.prescription_date).toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', { dateStyle: 'long' })}
          </p>
        </div>
      </div>

      {/* Medications */}
      {medications.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Aucun médicament enregistré</p>
      ) : (
        <div className="space-y-3">
          {medications.map((med, i) => (
            <motion.div key={med.id} transition={{ delay: i * 0.06 }}>
              <MedCard
                med={med}
                drugInfo={med.drug_id ? drugInfoMap[med.drug_id] : undefined}
                lang={lang}
                onAddReminder={m => addReminder.mutate(m)}
                reminderAdded={remindersAdded.has(med.id)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* Doctor notes */}
      {ordonnance.notes && (
        <div className="p-3 rounded-xl bg-warning/8 border border-warning/20 text-xs">
          <p className="font-semibold text-warning mb-1">
            {lang === 'ar' ? '📝 ملاحظات الطبيب' : '📝 Notes du médecin'}
          </p>
          <p className="text-muted-foreground leading-relaxed">{ordonnance.notes}</p>
        </div>
      )}
    </motion.div>
  );
}

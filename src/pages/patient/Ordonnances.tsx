import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
const OrdonnanceClaire = lazy(() =>
  import('@/components/patient/OrdonnanceClaire').then(m => ({ default: m.OrdonnanceClaire }))
);
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Calendar,
  User,
  Building,
  Pill,
  Clock,
  CheckCircle,
  Camera,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ScanLine,
  Activity,
  ArrowRight,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PatientSidebar } from '@/components/patient/PatientSidebar';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { GlowCard } from '@/components/ui/glow-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Ordonnance {
  id: string;
  doctor_name: string;
  doctor_specialty: string | null;
  hospital_name: string | null;
  prescription_date: string;
  notes: string | null;
  status: string;
  created_at: string;
}

interface OrdonnanceMedication {
  id: string;
  medication_name: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  quantity: number | null;
  instructions: string | null;
  is_dispensed: boolean;
}

/* ── status helpers ──────────────────────────────────────────────────────── */
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Active',   cls: 'bg-success/15 text-success border-success/30' },
  completed: { label: 'Complète', cls: 'bg-info/15 text-info border-info/30' },
  expired:   { label: 'Expirée',  cls: 'bg-muted text-muted-foreground border-border' },
};
const statusInfo = (s: string) => STATUS_MAP[s] ?? { label: s, cls: 'bg-secondary text-foreground border-border' };

/* ── individual ordonnance card ──────────────────────────────────────────── */
const OrdonnanceCard = ({
  ordonnance,
  meds,
  index,
}: {
  ordonnance: Ordonnance;
  meds: OrdonnanceMedication[];
  index: number;
}) => {
  const [open, setOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'standard' | 'claire'>('standard');
  const { label, cls } = statusInfo(ordonnance.status);
  const dispensed = meds.filter(m => m.is_dispensed).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="relative overflow-hidden rounded-2xl glass-card border border-border/50 hover:border-primary/30 transition-all duration-300 group"
    >
      {/* subtle gradient mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/8 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* header row — clickable */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-full text-left px-4 md:px-6 py-4 md:py-5 flex items-center gap-3 md:gap-4"
      >
        {/* icon */}
        <div className="relative shrink-0">
          <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-primary/20 to-info/10 flex items-center justify-center">
            <FileText className="w-5 h-5 md:w-6 md:h-6 text-primary" />
          </div>
          {ordonnance.status === 'active' && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-success rounded-full border-2 border-background animate-pulse" />
          )}
        </div>

        {/* info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold text-sm md:text-base truncate">{ordonnance.doctor_name}</span>
            <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded-full border whitespace-nowrap font-medium ${cls}`}>
              {label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            {ordonnance.doctor_specialty && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[100px] md:max-w-none">{ordonnance.doctor_specialty}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 shrink-0" />
              {new Date(ordonnance.prescription_date).toLocaleDateString('fr-DZ')}
            </span>
            {meds.length > 0 && (
              <span className="flex items-center gap-1">
                <Pill className="w-3 h-3 shrink-0" />
                {dispensed}/{meds.length} délivrés
              </span>
            )}
          </div>
        </div>

        {/* chevron */}
        <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${open ? 'bg-primary/15 text-primary' : 'bg-secondary/50 text-muted-foreground'}`}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* expanded body */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-6 pb-4 md:pb-5 pt-1 border-t border-border/50">
              {ordonnance.hospital_name && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <Building className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                  {ordonnance.hospital_name}
                </div>
              )}

              {/* View toggle — only show when there are meds */}
              {meds.length > 0 && (
                <div className="flex items-center gap-1.5 mb-3">
                  <button
                    onClick={() => setViewMode('standard')}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                      viewMode === 'standard'
                        ? 'bg-primary/10 text-primary border-primary/30 font-medium'
                        : 'text-muted-foreground border-border/50 hover:border-border'
                    }`}
                  >
                    Vue Standard
                  </button>
                  <button
                    onClick={() => setViewMode('claire')}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                      viewMode === 'claire'
                        ? 'bg-primary/10 text-primary border-primary/30 font-medium'
                        : 'text-muted-foreground border-border/50 hover:border-border'
                    }`}
                  >
                    📋 Vue Claire
                  </button>
                </div>
              )}

              {/* Vue Claire */}
              {viewMode === 'claire' && meds.length > 0 && (
                <Suspense fallback={<div className="h-20 rounded-xl bg-secondary/30 animate-pulse" />}>
                  <OrdonnanceClaire ordonnance={ordonnance} medications={meds} />
                </Suspense>
              )}

              {/* medications — standard view */}
              {viewMode === 'standard' && meds.length > 0 ? (
                <>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Médicaments · {meds.length}
                  </p>
                  <div className="space-y-2">
                    {meds.map(med => (
                      <div
                        key={med.id}
                        className={`flex items-center gap-3 p-2.5 md:p-3 rounded-xl border transition-colors ${
                          med.is_dispensed
                            ? 'bg-success/5 border-success/20'
                            : 'bg-secondary/40 border-border/50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          med.is_dispensed ? 'bg-success/15' : 'bg-primary/10'
                        }`}>
                          {med.is_dispensed
                            ? <CheckCircle className="w-4 h-4 text-success" />
                            : <Pill className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{med.medication_name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' · ')}
                          </p>
                          {med.instructions && (
                            <p className="text-xs text-info mt-0.5 truncate">{med.instructions}</p>
                          )}
                        </div>
                        {med.is_dispensed && (
                          <span className="text-[10px] font-medium text-success shrink-0 bg-success/10 px-1.5 py-0.5 rounded-md">
                            Délivré
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              ) : viewMode === 'standard' ? (
                <p className="text-xs text-muted-foreground italic">Aucun médicament enregistré</p>
              ) : null}

              {ordonnance.notes && (
                <div className="mt-3 p-3 rounded-xl bg-warning/8 border border-warning/20">
                  <p className="text-xs text-muted-foreground">{ordonnance.notes}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════ */
/*  Main page                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */
export default function Ordonnances() {
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([]);
  const [medications, setMedications] = useState<Record<string, OrdonnanceMedication[]>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    doctor_name: '',
    doctor_specialty: '',
    hospital_name: '',
    prescription_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [newMedications, setNewMedications] = useState([
    { medication_name: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '' },
  ]);

  /* derived stats */
  const stats = {
    total:     ordonnances.length,
    active:    ordonnances.filter(o => o.status === 'active').length,
    completed: ordonnances.filter(o => o.status === 'completed').length,
    meds:      Object.values(medications).reduce((s, m) => s + m.length, 0),
  };

  /* ── fetch ── */
  const fetchOrdonnances = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate('/auth'); return; }

    const { data } = await supabase
      .from('ordonnances')
      .select('*')
      .eq('user_id', session.user.id)
      .order('prescription_date', { ascending: false });

    if (data) {
      setOrdonnances(data);

      // ── Single batch query instead of N individual queries ────────────────
      if (data.length > 0) {
        const ids = data.map(o => o.id);
        const { data: allMeds } = await supabase
          .from('ordonnance_medications')
          .select('*')
          .in('ordonnance_id', ids);

        if (allMeds) {
          const medsMap: Record<string, OrdonnanceMedication[]> = {};
          for (const med of allMeds) {
            if (!medsMap[(med as any).ordonnance_id]) medsMap[(med as any).ordonnance_id] = [];
            medsMap[(med as any).ordonnance_id].push(med);
          }
          setMedications(medsMap);
        }
      }
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => { fetchOrdonnances(); }, [fetchOrdonnances]);

  const handleRefresh = async () => { await fetchOrdonnances(); toast.success('Données actualisées'); };

  /* ── medication fields ── */
  const addMedicationField = () =>
    setNewMedications(p => [...p, { medication_name: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '' }]);

  const updateMedicationField = (i: number, field: string, value: string) => {
    setNewMedications(p => { const n = [...p]; n[i] = { ...n[i], [field]: value }; return n; });
  };

  /* ── scan ── */
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Veuillez sélectionner une image'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("L'image doit faire moins de 10 Mo"); return; }

    setIsScanning(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      try {
        const { scanPrescriptionImage, scanPrescriptionLocal } = await import('@/lib/ai-service');
        let result: any;
        try {
          result = await scanPrescriptionLocal(file);
        } catch {
          result = await scanPrescriptionImage(base64);
        }
        if (result.success) {
          setFormData(p => ({
            ...p,
            doctor_name: result.doctor_name || p.doctor_name,
            prescription_date: result.prescription_date || p.prescription_date,
            notes: result.notes || p.notes,
          }));
          if (result.medications?.length > 0) {
            setNewMedications(result.medications.map((m: any) => ({
              medication_name: m.name || '',
              dosage: m.dosage || '',
              frequency: m.frequency || '',
              duration: m.duration || '',
              quantity: m.quantity || '',
              instructions: m.instructions || '',
            })));
          }
          toast.success('Ordonnance scannée avec succès !');
        } else {
          toast.error(result.error || "Impossible d'extraire les données");
        }
      } catch (err) {
        toast.error("Échec de la connexion à l'IA");
      } finally {
        setIsScanning(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  /* ── submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: ordonnance, error } = await supabase
      .from('ordonnances')
      .insert({
        ...formData,
        user_id: session.user.id,
        doctor_specialty: formData.doctor_specialty || null,
        hospital_name: formData.hospital_name || null,
        notes: formData.notes || null,
      })
      .select()
      .single();

    if (error || !ordonnance) { toast.error("Erreur lors de la création"); return; }

    const validMeds = newMedications.filter(m => m.medication_name.trim());
    if (validMeds.length > 0) {
      await supabase.from('ordonnance_medications').insert(
        validMeds.map(m => ({
          ordonnance_id: ordonnance.id,
          medication_name: m.medication_name,
          dosage: m.dosage || null,
          frequency: m.frequency || null,
          duration: m.duration || null,
          quantity: m.quantity ? parseInt(m.quantity) : null,
          instructions: m.instructions || null,
        }))
      );
    }

    toast.success('Ordonnance créée avec succès');
    setDialogOpen(false);
    setFormData({ doctor_name: '', doctor_specialty: '', hospital_name: '', prescription_date: new Date().toISOString().split('T')[0], notes: '' });
    setNewMedications([{ medication_name: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '' }]);
    fetchOrdonnances();
  };

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-background">
        <PatientSidebar />
        <main className="flex-1 p-4 md:p-8 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-secondary/30 animate-pulse" />
          ))}
        </main>
      </div>
    );
  }

  /* ══════════ RENDER ══════════ */
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <PatientSidebar />

      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <main className="p-4 md:p-8">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl md:text-3xl font-bold mb-1 md:mb-2"
              >
                Mes <span className="text-gradient">Ordonnances</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="text-sm md:text-base text-muted-foreground"
              >
                Gérez vos prescriptions médicales
              </motion.p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                  <Button variant="hero" className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Nouvelle Ordonnance
                  </Button>
                </motion.div>
              </DialogTrigger>

              {/* ── Dialog ── */}
              <DialogContent className="max-w-[95vw] md:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    Ajouter une Ordonnance
                  </DialogTitle>
                </DialogHeader>

                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />

                {/* Scan banner */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isScanning}
                  className="w-full relative overflow-hidden rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all group p-4 text-left mb-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-info/4 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {isScanning
                        ? <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
                        : <Camera className="w-5 h-5 text-primary-foreground" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-primary">
                        {isScanning ? 'Analyse IA en cours…' : 'Scanner avec l\'IA'}
                      </p>
                      <p className="text-xs text-muted-foreground">Remplissage automatique du formulaire</p>
                    </div>
                    {!isScanning && <ArrowRight className="w-4 h-4 text-primary ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />}
                  </div>
                </button>

                <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5 mt-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="doctor_name">Nom du Médecin *</Label>
                      <Input id="doctor_name" value={formData.doctor_name} onChange={e => setFormData({ ...formData, doctor_name: e.target.value })} placeholder="Dr. …" required className="bg-secondary/30" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="doctor_specialty">Spécialité</Label>
                      <Input id="doctor_specialty" value={formData.doctor_specialty} onChange={e => setFormData({ ...formData, doctor_specialty: e.target.value })} placeholder="Généraliste, Cardiologue…" className="bg-secondary/30" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="hospital_name">Établissement</Label>
                      <Input id="hospital_name" value={formData.hospital_name} onChange={e => setFormData({ ...formData, hospital_name: e.target.value })} placeholder="Hôpital, Clinique…" className="bg-secondary/30" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="prescription_date">Date de Prescription *</Label>
                      <Input id="prescription_date" type="date" value={formData.prescription_date} onChange={e => setFormData({ ...formData, prescription_date: e.target.value })} required className="bg-secondary/30" />
                    </div>
                  </div>

                  {/* medications */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-semibold">Médicaments</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addMedicationField} className="h-7 text-xs gap-1">
                        <Plus className="w-3 h-3" /> Ajouter
                      </Button>
                    </div>
                    <div className="space-y-2.5">
                      {newMedications.map((med, i) => (
                        <div key={i} className="p-3 md:p-4 rounded-xl border border-border/60 bg-secondary/20 space-y-2.5">
                          <Input placeholder="Nom du médicament *" value={med.medication_name} onChange={e => updateMedicationField(i, 'medication_name', e.target.value)} className="bg-background/50" />
                          <div className="grid grid-cols-3 gap-2">
                            <Input placeholder="Dosage" value={med.dosage} onChange={e => updateMedicationField(i, 'dosage', e.target.value)} className="bg-background/50 text-sm" />
                            <Input placeholder="Fréquence" value={med.frequency} onChange={e => updateMedicationField(i, 'frequency', e.target.value)} className="bg-background/50 text-sm" />
                            <Input placeholder="Durée" value={med.duration} onChange={e => updateMedicationField(i, 'duration', e.target.value)} className="bg-background/50 text-sm" />
                          </div>
                          <Input placeholder="Instructions spéciales" value={med.instructions} onChange={e => updateMedicationField(i, 'instructions', e.target.value)} className="bg-background/50" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea id="notes" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Notes supplémentaires…" className="bg-secondary/30 resize-none" rows={3} />
                  </div>

                  <Button type="submit" variant="hero" className="w-full">
                    Créer l'Ordonnance
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* ── Stats strip ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8"
          >
            {[
              { label: 'Total',      value: stats.total,     icon: FileText,  critical: false },
              { label: 'Actives',    value: stats.active,    icon: Activity,  critical: false },
              { label: 'Complètes',  value: stats.completed, icon: CheckCircle, critical: false },
              { label: 'Médicaments',value: stats.meds,      icon: Pill,      critical: false },
            ].map((s, i) => (
              <GlowCard key={s.label} delay={i * 0.05} glowColor="primary">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm text-muted-foreground mb-1 truncate">{s.label}</p>
                    <p className="text-xl md:text-3xl font-display font-bold">
                      <AnimatedCounter value={s.value} />
                    </p>
                  </div>
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <s.icon className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                </div>
              </GlowCard>
            ))}
          </motion.div>

          {/* ── Scan hero banner ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => { setDialogOpen(true); setTimeout(() => fileInputRef.current?.click(), 200); }}
            className="relative mb-6 md:mb-8 overflow-hidden rounded-2xl cursor-pointer group glass-card-elevated border border-primary/20 hover:border-primary/50 transition-all duration-500"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-info/5 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="absolute -top-16 -right-16 w-52 h-52 bg-primary/20 rounded-full blur-3xl group-hover:bg-primary/30 transition-all duration-700" />
            <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-info/20 rounded-full blur-3xl group-hover:bg-info/30 transition-all duration-700" />
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
                    IA · Remplissage auto
                  </span>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Photographiez votre ordonnance · extraction automatique des médicaments et du médecin
                </p>
              </div>

              <Button
                variant="hero"
                className="w-full md:w-auto group-hover:translate-x-1 transition-transform"
                onClick={e => { e.stopPropagation(); setDialogOpen(true); setTimeout(() => fileInputRef.current?.click(), 200); }}
              >
                Scanner maintenant
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>

          {/* ── List ── */}
          {ordonnances.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {ordonnances.map((ord, i) => (
                <OrdonnanceCard
                  key={ord.id}
                  ordonnance={ord}
                  meds={medications[ord.id] || []}
                  index={i}
                />
              ))}
            </div>
          ) : (
            /* ── Empty state ── */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="relative overflow-hidden glass-card p-10 md:p-16 text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-info/5" />
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
              <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-info/10 flex items-center justify-center mx-auto mb-5">
                  <FileText className="w-10 h-10 md:w-12 md:h-12 text-primary" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold mb-2">
                  Aucune <span className="text-gradient">Ordonnance</span>
                </h2>
                <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-sm mx-auto">
                  Ajoutez vos ordonnances pour un meilleur suivi de vos traitements médicaux
                </p>
                <Button variant="hero" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une ordonnance
                </Button>
              </div>
            </motion.div>
          )}

        </main>
      </PullToRefresh>
    </div>
  );
}

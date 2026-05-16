import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pill,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  Trash2,
  Activity,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlowCard } from '@/components/ui/glow-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { PatientSidebar } from '@/components/patient/PatientSidebar';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Drug {
  id: string;
  name_fr: string;
  generic_name: string;
  dosage: string | null;
  form: string | null;
}

interface PatientMedication {
  id: string;
  drug_id: string;
  dosage: string | null;
  frequency: string | null;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  drugs?: Drug;
}

export default function PatientMedications() {
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchDrug, setSearchDrug] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'done'>('all');
  const [formData, setFormData] = useState({
    drug_id: '',
    dosage: '',
    frequency: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchMedications();
    fetchDrugs();
  }, []);

  const fetchMedications = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('patient_medications')
      .select(`*, drugs (id, name_fr, generic_name, dosage, form)`)
      .eq('user_id', session.user.id)
      .order('start_date', { ascending: false });

    if (data) setMedications(data);
    setLoading(false);
  }, [navigate]);

  const fetchDrugs = async () => {
    const { data } = await supabase
      .from('drugs')
      .select('id, name_fr, generic_name, dosage, form')
      .order('name_fr');
    if (data) setDrugs(data);
  };

  const handleRefresh = async () => {
    await fetchMedications();
    toast.success('Données actualisées');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.from('patient_medications').insert({
      user_id: session.user.id,
      drug_id: formData.drug_id,
      dosage: formData.dosage || null,
      frequency: formData.frequency || null,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      notes: formData.notes || null
    });

    if (error) {
      toast.error('Erreur lors de l\'ajout');
    } else {
      toast.success('Médicament ajouté');
      setDialogOpen(false);
      setFormData({
        drug_id: '',
        dosage: '',
        frequency: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        notes: ''
      });
      fetchMedications();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('patient_medications').delete().eq('id', id);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Médicament supprimé');
      fetchMedications();
    }
  };

  const isActive = (med: PatientMedication) => {
    if (!med.end_date) return true;
    return new Date(med.end_date) >= new Date();
  };

  const activeMeds  = medications.filter(m => isActive(m));
  const doneMeds    = medications.filter(m => !isActive(m));

  const displayed = filter === 'active' ? activeMeds
                  : filter === 'done'   ? doneMeds
                  : medications;

  const filteredDrugs = drugs.filter(d =>
    d.name_fr.toLowerCase().includes(searchDrug.toLowerCase()) ||
    d.generic_name.toLowerCase().includes(searchDrug.toLowerCase())
  );

  /* ─── Skeleton ─── */
  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-background">
        <PatientSidebar />
        <div className="flex-1 p-4 md:p-8 space-y-6">
          <div className="h-10 w-64 rounded-xl bg-secondary/50 animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[0,1,2].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-secondary/20 animate-pulse" />
            ))}
          </div>
          {[0,1,2].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-secondary/20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <PatientSidebar />

      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <main className="p-4 md:p-8">

          {/* ── Hero Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-6 md:mb-8 overflow-hidden rounded-2xl md:rounded-3xl border border-border/40 bg-gradient-to-br from-success/8 via-background to-primary/8 p-6 md:p-8"
          >
            <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-success/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-success" />
                  <span className="text-xs font-medium text-success uppercase tracking-widest">Traitements</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                  Mes <span className="text-gradient">Médicaments</span>
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Suivez et gérez vos traitements en cours
                </p>
              </div>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" className="w-full sm:w-auto gap-2">
                    <Plus className="w-4 h-4" />
                    Ajouter un Médicament
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] md:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Ajouter un Médicament</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>Médicament *</Label>
                      <Input
                        placeholder="Rechercher un médicament..."
                        value={searchDrug}
                        onChange={(e) => setSearchDrug(e.target.value)}
                        className="mb-2 mt-1"
                      />
                      <Select
                        value={formData.drug_id}
                        onValueChange={(value) => setFormData({ ...formData, drug_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un médicament" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60 bg-popover">
                          {filteredDrugs.map((drug) => (
                            <SelectItem key={drug.id} value={drug.id}>
                              {drug.name_fr} {drug.dosage && `- ${drug.dosage}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="dosage">Dosage</Label>
                        <Input
                          id="dosage"
                          value={formData.dosage}
                          onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                          placeholder="Ex: 1 comprimé"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="frequency">Fréquence</Label>
                        <Input
                          id="frequency"
                          value={formData.frequency}
                          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                          placeholder="Ex: 3 fois/jour"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="start_date">Date de Début *</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="end_date">Date de Fin</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Input
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Instructions spéciales..."
                        className="mt-1"
                      />
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={!formData.drug_id}>
                      Ajouter
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>

          {/* ── Stats Strip ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8"
          >
            <GlowCard>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p className="text-2xl font-display font-bold">
                    <AnimatedCounter value={medications.length} />
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center">
                  <Pill className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
            </GlowCard>

            <GlowCard delay={0.05}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Actifs</p>
                  <p className="text-2xl font-display font-bold text-success">
                    <AnimatedCounter value={activeMeds.length} />
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-success to-info flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
            </GlowCard>

            <GlowCard delay={0.1}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Terminés</p>
                  <p className="text-2xl font-display font-bold text-muted-foreground">
                    <AnimatedCounter value={doneMeds.length} />
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </GlowCard>
          </motion.div>

          {/* ── Filter Tabs ── */}
          {medications.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-2 mb-4 md:mb-6"
            >
              <Filter className="w-4 h-4 text-muted-foreground" />
              {(['all','active','done'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filter === f
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {f === 'all' ? 'Tous' : f === 'active' ? 'Actifs' : 'Terminés'}
                </button>
              ))}
            </motion.div>
          )}

          {/* ── Medication List ── */}
          <AnimatePresence mode="popLayout">
            {displayed.length > 0 ? (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid gap-3 md:gap-4"
              >
                {displayed.map((med, index) => (
                  <motion.div
                    key={med.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.04 }}
                    className={`glass-card-elevated p-4 md:p-5 ${!isActive(med) ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 md:gap-4 min-w-0">
                        <div className={`w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isActive(med)
                            ? 'bg-gradient-to-br from-success to-info shadow-md'
                            : 'bg-secondary'
                        }`}>
                          <Pill className={`w-5 h-5 md:w-6 md:h-6 ${isActive(med) ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-semibold text-sm md:text-base">{med.drugs?.name_fr || 'Médicament'}</h3>
                            {isActive(med) ? (
                              <span className="inline-flex items-center gap-1 text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                Actif
                              </span>
                            ) : (
                              <span className="text-[10px] md:text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                Terminé
                              </span>
                            )}
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground mb-2">
                            {med.drugs?.generic_name}
                            {med.drugs?.form && ` • ${med.drugs.form}`}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs">
                            {med.dosage && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Pill className="w-3 h-3" />{med.dosage}
                              </span>
                            )}
                            {med.frequency && (
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="w-3 h-3" />{med.frequency}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {new Date(med.start_date).toLocaleDateString('fr-DZ')}
                              {med.end_date && ` → ${new Date(med.end_date).toLocaleDateString('fr-DZ')}`}
                            </span>
                          </div>
                          {med.notes && (
                            <p className="text-xs text-info mt-2 italic">{med.notes}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive flex-shrink-0"
                        onClick={() => handleDelete(med.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-success/5 via-background to-primary/5 p-10 md:p-14 text-center"
              >
                <div className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-success/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-success to-info flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg">
                    <Pill className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" />
                  </div>
                  <h2 className="text-lg md:text-xl font-semibold mb-2">Aucun Médicament</h2>
                  <p className="text-sm md:text-base text-muted-foreground mb-6">
                    Ajoutez vos médicaments pour suivre vos traitements
                  </p>
                  <Button variant="hero" onClick={() => setDialogOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Ajouter un Médicament
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </PullToRefresh>
    </div>
  );
}

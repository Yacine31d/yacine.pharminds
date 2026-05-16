/**
 * PharmacistChifa — CNAS Chifa Auto  (UI v2)
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Plus, Clock, CheckCircle, XCircle, Send,
  DollarSign, FileText, Loader2, ChevronRight, ArrowRight,
  BadgeCheck, TrendingUp, Wallet, Percent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlowCard } from '@/components/ui/glow-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { PharmacistSidebar } from '@/components/pharmacist/Sidebar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type ClaimStatus = 'pending' | 'submitted' | 'approved' | 'paid' | 'rejected';

interface ChifaClaim {
  id: string;
  patient_chifa_number: string;
  patient_name: string | null;
  ordonnance_id: string | null;
  total_amount: number;
  reimbursable_amount: number;
  status: ClaimStatus;
  submitted_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

interface Ordonnance { id: string; doctor_name: string; prescription_date: string; }
interface OrdMed {
  medication_name: string; quantity: number | null; drug_id: string | null;
  drugs?: { price_dz: number | null; cnas_reimbursable: boolean | null } | null;
}

/* ── Status config ── */
const STATUS_CFG: Record<ClaimStatus, { label: string; cls: string; dot: string; icon: React.ElementType }> = {
  pending:   { label: 'En attente',  cls: 'bg-amber-500/10 text-amber-600 border-amber-400/30',       dot: 'bg-amber-400',    icon: Clock },
  submitted: { label: 'Soumise',     cls: 'bg-blue-500/10 text-blue-500 border-blue-400/30',           dot: 'bg-blue-400',     icon: Send },
  approved:  { label: 'Approuvée',   cls: 'bg-success/10 text-success border-success/30',               dot: 'bg-success',      icon: CheckCircle },
  paid:      { label: 'Payée',       cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-400/30',   dot: 'bg-emerald-400',  icon: BadgeCheck },
  rejected:  { label: 'Rejetée',     cls: 'bg-destructive/10 text-destructive border-destructive/30',   dot: 'bg-destructive',  icon: XCircle },
};

const StatusBadge = ({ status }: { status: ClaimStatus }) => {
  const c = STATUS_CFG[status] ?? STATUS_CFG.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
};

const TABS: { key: ClaimStatus | 'all'; label: string }[] = [
  { key: 'all',       label: 'Toutes' },
  { key: 'pending',   label: 'En attente' },
  { key: 'submitted', label: 'Soumises' },
  { key: 'approved',  label: 'Approuvées' },
  { key: 'paid',      label: 'Payées' },
];

/* ── New Claim Dialog ── */
function NewClaimDialog({ pharmacistId, onCreated }: { pharmacistId: string; onCreated: () => void }) {
  const [open, setOpen]               = useState(false);
  const [step, setStep]               = useState(1);
  const [chifaNumber, setChifaNumber] = useState('');
  const [patientName, setPatientName] = useState('');
  const [ordonnanceId, setOrdonnanceId] = useState('');
  const [saving, setSaving]           = useState(false);

  const { data: ordonnances = [] } = useQuery({
    queryKey: ['ph-ordonnances-all'],
    queryFn: async (): Promise<Ordonnance[]> => {
      // Pharmacists can view all ordonnances via RLS — fetch recent ones from any patient
      const { data } = await supabase
        .from('ordonnances').select('id,doctor_name,prescription_date')
        .order('prescription_date', { ascending: false }).limit(30);
      return (data ?? []) as Ordonnance[];
    },
    enabled: open,
  });

  const { data: medData } = useQuery({
    queryKey: ['ord-meds-chifa', ordonnanceId],
    queryFn: async () => {
      if (!ordonnanceId) return { total: 0, reimbursable: 0, count: 0 };
      const { data } = await supabase
        .from('ordonnance_medications')
        .select('medication_name,quantity,drug_id,drugs(price_dz,cnas_reimbursable)')
        .eq('ordonnance_id', ordonnanceId);
      let total = 0, reimbursable = 0, count = 0;
      for (const m of (data ?? []) as OrdMed[]) {
        const price = (m.drugs as any)?.price_dz ?? 0;
        const qty   = m.quantity ?? 1;
        total += price * qty; count++;
        if ((m.drugs as any)?.cnas_reimbursable) reimbursable += price * qty;
      }
      return { total, reimbursable, count };
    },
    enabled: !!ordonnanceId,
  });

  const reset = () => { setStep(1); setChifaNumber(''); setPatientName(''); setOrdonnanceId(''); };

  const handleCreate = async () => {
    if (!chifaNumber.trim()) { toast.error('Numéro Chifa requis'); return; }
    setSaving(true);
    try {
      await supabase.from('chifa_claims').insert({
        pharmacist_id: pharmacistId, patient_chifa_number: chifaNumber,
        patient_name: patientName || null, ordonnance_id: ordonnanceId || null,
        total_amount: medData?.total ?? 0, reimbursable_amount: medData?.reimbursable ?? 0,
        status: 'pending',
      });
      toast.success('Déclaration créée avec succès');
      setOpen(false); reset(); onCreated();
    } catch { toast.error('Erreur lors de la création'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="hero" className="gap-2 shadow-lg">
          <Plus className="w-4 h-4" /> Nouvelle Déclaration
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-emerald-500" />
            </div>
            Nouvelle Déclaration Chifa
          </DialogTitle>
        </DialogHeader>

        {/* Progress bar */}
        <div className="flex gap-1 mb-5">
          {[1,2,3].map(n => (
            <div key={n} className="flex-1 flex flex-col gap-1">
              <div className={`h-1 rounded-full transition-all duration-300 ${step >= n ? 'bg-primary' : 'bg-secondary'}`} />
              <span className={`text-[10px] text-center ${step >= n ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                {n === 1 ? 'Patient' : n === 2 ? 'Ordonnance' : 'Confirmation'}
              </span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Numéro Carte Chifa *</Label>
                <Input placeholder="1234567890123" value={chifaNumber} onChange={e => setChifaNumber(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Nom du Patient <span className="text-muted-foreground text-xs">(facultatif)</span></Label>
                <Input placeholder="Nom Prénom" value={patientName} onChange={e => setPatientName(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => setStep(2)} disabled={!chifaNumber.trim()}>
                Suivant <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Ordonnance associée <span className="text-muted-foreground text-xs">(facultatif)</span></Label>
                <select
                  value={ordonnanceId} onChange={e => setOrdonnanceId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-secondary/50 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">— Aucune ordonnance —</option>
                  {ordonnances.map(o => (
                    <option key={o.id} value={o.id}>
                      Dr. {o.doctor_name} · {new Date(o.prescription_date).toLocaleDateString('fr-DZ')}
                    </option>
                  ))}
                </select>
              </div>

              {ordonnanceId && medData && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-gradient-to-r from-success/5 to-emerald-400/5 border border-success/20 space-y-2"
                >
                  <p className="text-xs font-semibold text-success uppercase tracking-wide">Calcul automatique CNAS</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{medData.count} médicament(s)</span>
                    <span className="font-medium">{medData.total.toFixed(2)} DA</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-success/15 pt-2">
                    <span className="text-success font-medium">Remboursable CNAS</span>
                    <span className="font-bold text-success text-base">{medData.reimbursable.toFixed(2)} DA</span>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Retour</Button>
                <Button className="flex-1" onClick={() => setStep(3)}>Suivant <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-4">
              <div className="p-4 rounded-xl bg-secondary/30 space-y-2.5 text-sm">
                <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-1">Récapitulatif</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">N° Chifa</span>
                  <span className="font-mono font-bold">{chifaNumber}</span>
                </div>
                {patientName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patient</span>
                    <span>{patientName}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border/50 pt-2">
                  <span className="text-muted-foreground">Montant total</span>
                  <span className="font-semibold">{(medData?.total ?? 0).toFixed(2)} DA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-success font-medium">Remboursable</span>
                  <span className="font-bold text-success text-base">{(medData?.reimbursable ?? 0).toFixed(2)} DA</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Retour</Button>
                <Button variant="hero" className="flex-1 gap-2" onClick={handleCreate} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Confirmer
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main page ── */
export default function PharmacistChifa() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ClaimStatus | 'all'>('all');

  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['chifa-claims', user?.id],
    queryFn: async (): Promise<ChifaClaim[]> => {
      if (!user) return [];
      const { data } = await supabase.from('chifa_claims').select('*')
        .eq('pharmacist_id', user.id).order('created_at', { ascending: false });
      return (data ?? []) as ChifaClaim[];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ClaimStatus }) => {
      const u: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === 'submitted') u.submitted_at = new Date().toISOString();
      if (status === 'approved')  u.approved_at  = new Date().toISOString();
      if (status === 'paid')      u.paid_at      = new Date().toISOString();
      await supabase.from('chifa_claims').update(u).eq('id', id);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['chifa-claims'] }); toast.success('Statut mis à jour'); },
    onError:   () => toast.error('Erreur lors de la mise à jour'),
  });

  const now       = new Date();
  const thisMonth = (d: string | null) => !!d && new Date(d).getMonth() === now.getMonth();

  const pending   = claims.filter(c => c.status === 'pending');
  const paidMonth = claims.filter(c => c.status === 'paid' && thisMonth(c.paid_at));
  const approved  = claims.filter(c => c.status === 'approved' || c.status === 'paid');
  const rate      = claims.length ? Math.round(approved.length / claims.length * 100) : 0;

  const stats = [
    { label: 'En attente',         value: pending.length,   suffix: '',   icon: Clock,      color: 'warning' },
    { label: 'Montant en attente', value: Math.round(pending.reduce((s, c) => s + c.reimbursable_amount, 0)), suffix: ' DA', icon: Wallet, color: 'primary' },
    { label: 'Payées ce mois',     value: paidMonth.length, suffix: '',   icon: BadgeCheck, color: 'success' },
    { label: 'Taux approbation',   value: rate,             suffix: '%',  icon: Percent,    color: 'info' },
  ];

  const filtered = tab === 'all' ? claims : claims.filter(c => c.status === tab);

  const NEXT: Partial<Record<ClaimStatus, { status: ClaimStatus; label: string }>> = {
    pending:   { status: 'submitted', label: 'Soumettre' },
    submitted: { status: 'approved',  label: 'Approuver' },
    approved:  { status: 'paid',      label: 'Marquer payée' },
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <PharmacistSidebar />

      <main className="flex-1 overflow-auto">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/8 via-background to-primary/5 border-b border-border/40">
          <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 w-48 h-48 rounded-full bg-primary/8 blur-3xl" />
          <div className="relative p-6 md:p-10 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold mb-4">
                <CreditCard className="w-3.5 h-3.5" />
                Chifa Auto — CNAS
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Déclarations{' '}
                <span className="bg-gradient-to-r from-emerald-400 to-primary bg-clip-text text-transparent">Chifa</span>
              </h1>
              <p className="text-muted-foreground text-sm md:text-base">
                Gérez et soumettez vos remboursements CNAS automatiquement
              </p>
            </div>
            {user && (
              <NewClaimDialog
                pharmacistId={user.id}
                onCreated={() => queryClient.invalidateQueries({ queryKey: ['chifa-claims'] })}
              />
            )}
          </div>
        </div>

        <div className="p-4 md:p-8 space-y-6">

          {/* ── Stats ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4"
          >
            {stats.map((s, i) => (
              <GlowCard key={s.label} delay={i * 0.05} glowColor={s.color as any}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-1 truncate">{s.label}</p>
                    <p className="text-xl md:text-2xl font-display font-bold">
                      {isLoading ? '…' : <><AnimatedCounter value={s.value} />{s.suffix}</>}
                    </p>
                  </div>
                  <div className={`w-9 h-9 rounded-xl bg-${s.color}/10 flex items-center justify-center shrink-0`}>
                    <s.icon className={`w-4.5 h-4.5 text-${s.color}`} style={{ width: '1.1rem', height: '1.1rem' }} />
                  </div>
                </div>
              </GlowCard>
            ))}
          </motion.div>

          {/* ── Tab bar ── */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {TABS.map(t => {
              const count = t.key === 'all' ? claims.length : claims.filter(c => c.status === t.key).length;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    tab === t.key
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  }`}
                >
                  {t.label}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      tab === t.key ? 'bg-white/20 text-white' : 'bg-secondary text-muted-foreground'
                    }`}>{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Claims list ── */}
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-secondary/30 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-sm">Aucune déclaration</p>
              <p className="text-xs text-muted-foreground mt-1">
                {tab === 'all' ? 'Créez votre première déclaration Chifa' : `Aucune déclaration dans l'onglet « ${TABS.find(t => t.key === tab)?.label} »`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((claim, idx) => {
                const next = NEXT[claim.status];
                return (
                  <motion.div
                    key={claim.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="glass-card p-4 md:p-5 hover:border-border transition-all"
                  >
                    <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
                      {/* Icon */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        claim.status === 'paid' ? 'bg-emerald-500/15' :
                        claim.status === 'approved' ? 'bg-success/15' :
                        claim.status === 'rejected' ? 'bg-destructive/15' : 'bg-primary/10'
                      }`}>
                        {(() => { const Icon = STATUS_CFG[claim.status].icon; return <Icon className={`w-5 h-5 ${
                          claim.status === 'paid' ? 'text-emerald-500' :
                          claim.status === 'approved' ? 'text-success' :
                          claim.status === 'rejected' ? 'text-destructive' : 'text-primary'
                        }`} />; })()}
                      </div>

                      {/* Patient */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {claim.patient_name ?? 'Patient anonyme'}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">{claim.patient_chifa_number}</p>
                      </div>

                      {/* Amounts */}
                      <div className="hidden md:flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                          <p className="font-medium">{claim.total_amount.toFixed(0)} DA</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase">Remboursable</p>
                          <p className="font-bold text-success">{claim.reimbursable_amount.toFixed(0)} DA</p>
                        </div>
                      </div>

                      {/* Status + date + action */}
                      <div className="flex items-center gap-2 shrink-0 ml-auto">
                        <StatusBadge status={claim.status} />
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">
                          {new Date(claim.created_at).toLocaleDateString('fr-DZ')}
                        </span>
                        {next && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => updateStatus.mutate({ id: claim.id, status: next.status })}
                            disabled={updateStatus.isPending}
                          >
                            {next.label}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Mobile amounts */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/40 md:hidden text-sm">
                      <span className="text-muted-foreground">Total: <strong>{claim.total_amount.toFixed(0)} DA</strong></span>
                      <span className="text-success">Remboursable: <strong>{claim.reimbursable_amount.toFixed(0)} DA</strong></span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

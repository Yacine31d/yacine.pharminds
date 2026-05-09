import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlowCard } from '@/components/ui/glow-card';
import { PatientSidebar } from '@/components/patient/PatientSidebar';
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

interface CarteChifaData {
  id: string;
  card_number: string;
  holder_name: string;
  birth_date: string | null;
  expiry_date: string | null;
  coverage_type: string;
  is_active: boolean;
}

const COVERAGE_LABELS: Record<string, string> = {
  standard: 'Standard',
  complete: 'Complète',
  famille: 'Famille',
};

export default function CarteChifa() {
  const [carte, setCarte] = useState<CarteChifaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    card_number: '',
    holder_name: '',
    birth_date: '',
    expiry_date: '',
    coverage_type: 'standard'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchCarteChifa();
  }, []);

  const fetchCarteChifa = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('carte_chifa')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (data) {
      setCarte(data);
      setFormData({
        card_number: data.card_number,
        holder_name: data.holder_name,
        birth_date: data.birth_date || '',
        expiry_date: data.expiry_date || '',
        coverage_type: data.coverage_type || 'standard'
      });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const carteData = {
      ...formData,
      user_id: session.user.id,
      birth_date: formData.birth_date || null,
      expiry_date: formData.expiry_date || null
    };

    let result;
    if (carte) {
      result = await supabase.from('carte_chifa').update(carteData).eq('id', carte.id).select().single();
    } else {
      result = await supabase.from('carte_chifa').insert(carteData).select().single();
    }

    if (result.error) {
      toast.error('Erreur lors de l\'enregistrement');
    } else {
      setCarte(result.data);
      toast.success(carte ? 'Carte mise à jour' : 'Carte enregistrée');
      setDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!carte) return;
    const { error } = await supabase.from('carte_chifa').delete().eq('id', carte.id);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      setCarte(null);
      setFormData({ card_number: '', holder_name: '', birth_date: '', expiry_date: '', coverage_type: 'standard' });
      toast.success('Carte supprimée');
    }
  };

  /* ─── Skeleton ─── */
  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-background">
        <PatientSidebar />
        <div className="flex-1 p-4 md:p-8 space-y-6">
          <div className="h-10 w-48 rounded-xl bg-secondary/50 animate-pulse" />
          <div className="grid grid-cols-3 gap-4">
            {[0,1,2].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-secondary/20 animate-pulse" />
            ))}
          </div>
          <div className="max-w-lg aspect-[1.6/1] rounded-2xl bg-secondary/20 animate-pulse" />
        </div>
      </div>
    );
  }

  /* ─── Shared form fields ─── */
  const ChifaForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="card_number">Numéro de Carte *</Label>
        <Input
          id="card_number"
          value={formData.card_number}
          onChange={(e) => setFormData({ ...formData, card_number: e.target.value })}
          placeholder="XXXX XXXX XXXX"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="holder_name">Nom du Titulaire *</Label>
        <Input
          id="holder_name"
          value={formData.holder_name}
          onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
          required
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="birth_date">Date de Naissance</Label>
          <Input
            id="birth_date"
            type="date"
            value={formData.birth_date}
            onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="expiry_date">Date d'Expiration</Label>
          <Input
            id="expiry_date"
            type="date"
            value={formData.expiry_date}
            onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="coverage_type">Type de Couverture</Label>
        <Select
          value={formData.coverage_type}
          onValueChange={(value) => setFormData({ ...formData, coverage_type: value })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="complete">Complète</SelectItem>
            <SelectItem value="famille">Famille</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" variant="hero" className="w-full">Enregistrer</Button>
    </form>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <PatientSidebar />

      <main className="flex-1 p-4 md:p-8 overflow-auto">

        {/* ── Hero Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-6 md:mb-8 overflow-hidden rounded-2xl md:rounded-3xl border border-border/40 bg-gradient-to-br from-primary/8 via-background to-info/8 p-6 md:p-8"
        >
          <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-info/10 blur-3xl" />

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-xs font-medium text-primary uppercase tracking-widest">CNAS · Sécurité Sociale</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                Carte <span className="text-gradient">Chifa</span>
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Gérez votre carte d'assurance maladie CNAS
              </p>
            </div>

            {carte && (
              <div className="flex gap-2">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Edit2 className="w-4 h-4" />
                      Modifier
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[95vw] md:max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Modifier la Carte Chifa</DialogTitle>
                    </DialogHeader>
                    <ChifaForm />
                  </DialogContent>
                </Dialog>
                <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Supprimer</span>
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {carte ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-6"
          >
            {/* ── Stats Strip ── */}
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <GlowCard>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Statut</p>
                    <p className={`text-sm font-semibold ${carte.is_active ? 'text-success' : 'text-warning'}`}>
                      {carte.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    carte.is_active ? 'bg-gradient-to-br from-success to-info' : 'bg-warning/20'
                  }`}>
                    {carte.is_active
                      ? <CheckCircle className="w-4 h-4 text-primary-foreground" />
                      : <AlertCircle className="w-4 h-4 text-warning" />}
                  </div>
                </div>
              </GlowCard>

              <GlowCard delay={0.05}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Couverture</p>
                    <p className="text-sm font-semibold capitalize">{COVERAGE_LABELS[carte.coverage_type] || carte.coverage_type}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center">
                    <Shield className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              </GlowCard>

              <GlowCard delay={0.1}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Expiration</p>
                    <p className="text-sm font-semibold">
                      {carte.expiry_date
                        ? new Date(carte.expiry_date).toLocaleDateString('fr-DZ', { month: 'short', year: 'numeric' })
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-info to-primary flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              </GlowCard>
            </div>

            {/* ── Visual Card ── */}
            <div className="relative max-w-lg">
              <div className="w-full aspect-[1.6/1] bg-gradient-to-br from-primary via-primary/80 to-info rounded-2xl p-5 md:p-7 text-primary-foreground shadow-2xl overflow-hidden">
                {/* card shine effect */}
                <div className="pointer-events-none absolute top-0 right-0 w-2/3 h-full bg-gradient-to-l from-white/10 to-transparent" />
                <div className="pointer-events-none absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
                <div className="pointer-events-none absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />

                <div className="relative flex justify-between items-start mb-6 md:mb-10">
                  <div>
                    <p className="text-[10px] md:text-xs opacity-80 tracking-widest uppercase">République Algérienne</p>
                    <h3 className="text-xl md:text-2xl font-bold tracking-wide">CARTE CHIFA</h3>
                    <p className="text-[10px] md:text-xs opacity-70">CNAS · Sécurité Sociale</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                </div>

                <div className="relative mb-4 md:mb-6">
                  <p className="text-[10px] md:text-xs opacity-70 mb-1 tracking-widest uppercase">Numéro de Carte</p>
                  <p className="text-xl md:text-2xl font-mono tracking-[0.2em]">{carte.card_number}</p>
                </div>

                <div className="relative flex justify-between items-end">
                  <div className="min-w-0">
                    <p className="text-[10px] md:text-xs opacity-70 mb-0.5 tracking-widest uppercase">Titulaire</p>
                    <p className="font-semibold text-sm md:text-base truncate">{carte.holder_name}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-[10px] md:text-xs opacity-70 mb-0.5 tracking-widest uppercase">Expiration</p>
                    <p className="font-semibold text-sm md:text-base">
                      {carte.expiry_date ? new Date(carte.expiry_date).toLocaleDateString('fr-DZ') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {carte.is_active && (
                <div className="absolute -top-2 -right-2 bg-success text-success-foreground px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Active
                </div>
              )}
            </div>

            {/* ── Card Details ── */}
            <div className="glass-card-elevated p-4 md:p-6 max-w-lg">
              <h3 className="font-semibold mb-4 text-sm md:text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Détails de la Carte
              </h3>
              <div className="space-y-3">
                {[
                  { icon: CreditCard, label: 'Numéro', value: carte.card_number },
                  { icon: User, label: 'Titulaire', value: carte.holder_name },
                  {
                    icon: Calendar, label: 'Date de Naissance',
                    value: carte.birth_date ? new Date(carte.birth_date).toLocaleDateString('fr-DZ') : 'Non renseignée'
                  },
                  { icon: Shield, label: 'Type de Couverture', value: COVERAGE_LABELS[carte.coverage_type] || carte.coverage_type },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30 border border-border/30">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-medium truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          /* ── Empty State ── */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/5 via-background to-info/5 p-10 md:p-14 text-center max-w-lg"
          >
            <div className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-info/10 blur-3xl" />
            <div className="relative">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-info flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg">
                <CreditCard className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" />
              </div>
              <h2 className="text-lg md:text-xl font-semibold mb-2">Aucune Carte Chifa</h2>
              <p className="text-sm md:text-base text-muted-foreground mb-6">
                Ajoutez votre carte Chifa pour bénéficier du remboursement CNAS
              </p>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="hero" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Ajouter ma Carte
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] md:max-w-lg mx-auto">
                  <DialogHeader>
                    <DialogTitle>Ajouter une Carte Chifa</DialogTitle>
                  </DialogHeader>
                  <ChifaForm />
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

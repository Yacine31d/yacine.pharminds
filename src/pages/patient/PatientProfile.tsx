import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  Languages,
  Shield,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PatientSidebar } from '@/components/patient/PatientSidebar';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const wilayas = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar',
  'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Alger',
  'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma',
  'Constantine', 'Médéa', 'Mostaganem', 'M\'Sila', 'Mascara', 'Ouargla', 'Oran', 'El Bayadh',
  'Illizi', 'Bordj Bou Arréridj', 'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued',
  'Khenchela', 'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent',
  'Ghardaïa', 'Relizane'
];

export default function PatientProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    wilaya: '',
    preferred_language: 'fr'
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (data) {
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
        phone: data.phone || '',
        wilaya: data.wilaya || '',
        preferred_language: data.preferred_language || 'fr'
      });
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name || null,
        phone: formData.phone || null,
        wilaya: formData.wilaya || null,
        preferred_language: formData.preferred_language
      })
      .eq('user_id', profile.user_id);

    if (error) {
      toast.error('Erreur lors de la mise à jour');
    } else {
      toast.success('Profil mis à jour');
    }
    setSaving(false);
  };

  /* ─── Skeleton ─── */
  if (loading) {
    return (
      <div className="flex flex-col md:flex-row min-h-screen bg-background">
        <PatientSidebar />
        <div className="flex-1 p-4 md:p-8 space-y-6 max-w-2xl">
          <div className="h-10 w-48 rounded-xl bg-secondary/50 animate-pulse" />
          <div className="h-28 rounded-2xl bg-secondary/30 animate-pulse" />
          <div className="h-80 rounded-2xl bg-secondary/20 animate-pulse" />
        </div>
      </div>
    );
  }

  const initials = formData.full_name
    ? formData.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'PA';

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

          <div className="relative flex items-center gap-4 md:gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary to-info flex items-center justify-center text-primary-foreground text-xl md:text-2xl font-bold shadow-lg">
                {initials}
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-background flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-success-foreground" />
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Profil</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1">
                Mon <span className="text-gradient">Profil</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                {profile?.email}
              </p>
            </div>

            <div className="ml-auto hidden sm:flex flex-col items-end gap-1.5">
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                Patient
              </span>
              {formData.wilaya && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />{formData.wilaya}
                </span>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl"
        >
          {/* ── Profile Form ── */}
          <form onSubmit={handleSubmit} className="glass-card-elevated p-4 md:p-6 space-y-5">
            <h2 className="font-semibold text-base flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Informations Personnelles
            </h2>

            <div>
              <Label htmlFor="full_name" className="flex items-center gap-2 text-sm mb-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                Nom Complet
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Votre nom complet"
              />
            </div>

            <div>
              <Label htmlFor="email" className="flex items-center gap-2 text-sm mb-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="opacity-50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                L'email ne peut pas être modifié
              </p>
            </div>

            <div>
              <Label htmlFor="phone" className="flex items-center gap-2 text-sm mb-1.5">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                Téléphone
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0XXX XX XX XX"
              />
            </div>

            <div>
              <Label htmlFor="wilaya" className="flex items-center gap-2 text-sm mb-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                Wilaya
              </Label>
              <Select
                value={formData.wilaya}
                onValueChange={(value) => setFormData({ ...formData, wilaya: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner votre wilaya" />
                </SelectTrigger>
                <SelectContent className="max-h-60 bg-popover">
                  {wilayas.map((wilaya) => (
                    <SelectItem key={wilaya} value={wilaya}>
                      {wilaya}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="language" className="flex items-center gap-2 text-sm mb-1.5">
                <Languages className="w-3.5 h-3.5 text-muted-foreground" />
                Langue Préférée
              </Label>
              <Select
                value={formData.preferred_language}
                onValueChange={(value) => setFormData({ ...formData, preferred_language: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="ar">🇩🇿 العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" variant="hero" className="w-full gap-2" disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer les modifications
                </>
              )}
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}

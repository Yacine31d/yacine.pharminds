import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PharmacistSidebar } from '@/components/pharmacist/Sidebar';
import { GlowCard } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Bell, 
  Shield, 
  Palette,
  Store,
  Save,
  Loader2,
  KeyRound,
  LogOut,
  Check
} from 'lucide-react';

export default function PharmacistSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark' | 'system'>('dark');
  
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    phone: '',
    pharmacy_name: '',
    wilaya: '',
    preferred_language: 'fr'
  });

  const [notifications, setNotifications] = useState({
    lowStockAlerts: true,
    interactionAlerts: true,
    emailNotifications: true,
    soundEnabled: true
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileData) {
          setProfile({
            full_name: profileData.full_name || '',
            email: profileData.email || '',
            phone: profileData.phone || '',
            pharmacy_name: profileData.pharmacy_name || '',
            wilaya: profileData.wilaya || '',
            preferred_language: profileData.preferred_language || 'fr'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: profile.full_name,
            phone: profile.phone,
            pharmacy_name: profile.pharmacy_name,
            wilaya: profile.wilaya,
            preferred_language: profile.preferred_language
          })
          .eq('user_id', user.id);

        if (error) throw error;

        toast({
          title: "Profil mis à jour",
          description: "Vos informations ont été enregistrées avec succès."
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!profile.email) {
      toast({
        title: "Erreur",
        description: "Aucune adresse email associée à ce compte.",
        variant: "destructive"
      });
      return;
    }

    setSendingReset(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/auth`
      });

      if (error) throw error;

      toast({
        title: "Email envoyé",
        description: "Un lien de réinitialisation a été envoyé à votre adresse email."
      });
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'email de réinitialisation.",
        variant: "destructive"
      });
    } finally {
      setSendingReset(false);
    }
  };

  const handleSignOutAllSessions = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Erreur",
        description: "Impossible de déconnecter les sessions.",
        variant: "destructive"
      });
      setSigningOut(false);
    }
  };

  const wilayas = [
    'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra', 'Béchar',
    'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret', 'Tizi Ouzou', 'Alger',
    'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda', 'Sidi Bel Abbès', 'Annaba', 'Guelma',
    'Constantine', 'Médéa', 'Mostaganem', 'M\'Sila', 'Mascara', 'Ouargla', 'Oran', 'El Bayadh'
  ];

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row h-screen bg-background">
        <PharmacistSidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background">
      <PharmacistSidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 md:mb-8"
          >
            <h1 className="text-2xl md:text-3xl font-display font-bold">Paramètres</h1>
            <p className="text-sm md:text-base text-muted-foreground">Gérez vos préférences et informations</p>
          </motion.div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="profile" className="gap-2">
                <User className="w-4 h-4" />
                Profil
              </TabsTrigger>
              <TabsTrigger value="pharmacy" className="gap-2">
                <Store className="w-4 h-4" />
                Pharmacie
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-2">
                <Palette className="w-4 h-4" />
                Apparence
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="w-4 h-4" />
                Sécurité
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <GlowCard className="p-6">
                <h2 className="text-xl font-semibold mb-6">Informations personnelles</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nom complet</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Dr. Ahmed Benali"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">L'email ne peut pas être modifié</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+213 XX XX XX XX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Langue préférée</Label>
                    <Select 
                      value={profile.preferred_language} 
                      onValueChange={(value) => setProfile({ ...profile, preferred_language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="ar">العربية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </GlowCard>
            </TabsContent>

            <TabsContent value="pharmacy">
              <GlowCard className="p-6">
                <h2 className="text-xl font-semibold mb-6">Informations de la pharmacie</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="pharmacy_name">Nom de la pharmacie</Label>
                    <Input
                      id="pharmacy_name"
                      value={profile.pharmacy_name}
                      onChange={(e) => setProfile({ ...profile, pharmacy_name: e.target.value })}
                      placeholder="Pharmacie Centrale"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wilaya">Wilaya</Label>
                    <Select 
                      value={profile.wilaya} 
                      onValueChange={(value) => setProfile({ ...profile, wilaya: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une wilaya" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {wilayas.map((wilaya) => (
                          <SelectItem key={wilaya} value={wilaya}>
                            {wilaya}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </GlowCard>
            </TabsContent>

            <TabsContent value="notifications">
              <GlowCard className="p-6">
                <h2 className="text-xl font-semibold mb-6">Préférences de notifications</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <div>
                      <p className="font-medium">Alertes de stock bas</p>
                      <p className="text-sm text-muted-foreground">
                        Recevoir des notifications quand le stock est faible
                      </p>
                    </div>
                    <Switch
                      checked={notifications.lowStockAlerts}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, lowStockAlerts: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <div>
                      <p className="font-medium">Alertes d'interactions</p>
                      <p className="text-sm text-muted-foreground">
                        Notifications pour les interactions médicamenteuses critiques
                      </p>
                    </div>
                    <Switch
                      checked={notifications.interactionAlerts}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, interactionAlerts: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <div>
                      <p className="font-medium">Notifications par email</p>
                      <p className="text-sm text-muted-foreground">
                        Recevoir les alertes importantes par email
                      </p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, emailNotifications: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50">
                    <div>
                      <p className="font-medium">Sons de notification</p>
                      <p className="text-sm text-muted-foreground">
                        Jouer un son lors des alertes
                      </p>
                    </div>
                    <Switch
                      checked={notifications.soundEnabled}
                      onCheckedChange={(checked) => 
                        setNotifications({ ...notifications, soundEnabled: checked })
                      }
                    />
                  </div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Les préférences de notifications sont enregistrées localement sur cet appareil.
                </p>
              </GlowCard>
            </TabsContent>

            <TabsContent value="appearance">
              <GlowCard className="p-6">
                <h2 className="text-xl font-semibold mb-6">Apparence</h2>
                <div className="space-y-6">
                  <div>
                    <Label className="mb-4 block">Thème de l'interface</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <button
                        onClick={() => setActiveTheme('light')}
                        className={`relative p-4 rounded-xl border-2 transition-all ${
                          activeTheme === 'light' 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-8 rounded bg-white border border-border flex items-center justify-center">
                            <span className="text-black text-xs">☀️</span>
                          </div>
                          <span className="text-sm font-medium">Clair</span>
                        </div>
                        {activeTheme === 'light' && (
                          <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTheme('dark')}
                        className={`relative p-4 rounded-xl border-2 transition-all ${
                          activeTheme === 'dark' 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-8 rounded bg-slate-900 border border-slate-700 flex items-center justify-center">
                            <span className="text-white text-xs">🌙</span>
                          </div>
                          <span className="text-sm font-medium">Sombre</span>
                        </div>
                        {activeTheme === 'dark' && (
                          <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTheme('system')}
                        className={`relative p-4 rounded-xl border-2 transition-all ${
                          activeTheme === 'system' 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-8 rounded bg-gradient-to-r from-white to-slate-900 border border-border flex items-center justify-center">
                            <span className="text-xs">💻</span>
                          </div>
                          <span className="text-sm font-medium">Système</span>
                        </div>
                        {activeTheme === 'system' && (
                          <Check className="absolute top-2 right-2 w-4 h-4 text-primary" />
                        )}
                      </button>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                      Le thème sombre est actuellement le seul thème disponible. D'autres thèmes seront disponibles prochainement.
                    </p>
                  </div>
                </div>
              </GlowCard>
            </TabsContent>

            <TabsContent value="security">
              <GlowCard className="p-6">
                <h2 className="text-xl font-semibold mb-6">Sécurité du compte</h2>
                <div className="space-y-8">
                  <div className="p-6 rounded-xl bg-secondary/30 border border-border/50">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <KeyRound className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">Réinitialiser le mot de passe</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Pour des raisons de sécurité, vous recevrez un email avec un lien de réinitialisation à l'adresse <span className="text-foreground font-medium">{profile.email}</span>
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={handlePasswordReset}
                          disabled={sendingReset}
                        >
                          {sendingReset ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Envoi en cours...
                            </>
                          ) : (
                            <>
                              <KeyRound className="w-4 h-4 mr-2" />
                              Envoyer le lien de réinitialisation
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/30">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                        <LogOut className="w-6 h-6 text-destructive" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">Déconnexion globale</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Déconnectez-vous de toutes les sessions actives sur tous vos appareils. Vous devrez vous reconnecter après cette action.
                        </p>
                        <Button 
                          variant="destructive"
                          onClick={handleSignOutAllSessions}
                          disabled={signingOut}
                        >
                          {signingOut ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Déconnexion...
                            </>
                          ) : (
                            <>
                              <LogOut className="w-4 h-4 mr-2" />
                              Déconnecter toutes les sessions
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </GlowCard>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
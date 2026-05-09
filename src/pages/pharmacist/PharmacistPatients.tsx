import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Search, 
  UserPlus,
  FileText,
  Pill,
  AlertTriangle,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Droplet,
  Activity,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlowCard } from '@/components/ui/glow-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { PharmacistSidebar } from '@/components/pharmacist/Sidebar';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PatientDetailDialog } from '@/components/pharmacist/PatientDetailDialog';

interface PharmacyPatient {
  id: string;
  pharmacist_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  address: string | null;
  wilaya: string | null;
  carte_chifa_number: string | null;
  blood_type: string | null;
  allergies: string[] | null;
  chronic_conditions: string[] | null;
  notes: string | null;
  has_alerts: boolean;
  last_visit_at: string;
  created_at: string;
}

const WILAYAS = [
  'Adrar', 'Chlef', 'Laghouat', 'Oum El Bouaghi', 'Batna', 'Béjaïa', 'Biskra',
  'Béchar', 'Blida', 'Bouira', 'Tamanrasset', 'Tébessa', 'Tlemcen', 'Tiaret',
  'Tizi Ouzou', 'Alger', 'Djelfa', 'Jijel', 'Sétif', 'Saïda', 'Skikda',
  'Sidi Bel Abbès', 'Annaba', 'Guelma', 'Constantine', 'Médéa', 'Mostaganem',
  'M\'Sila', 'Mascara', 'Ouargla', 'Oran', 'El Bayadh', 'Illizi', 'Bordj Bou Arréridj',
  'Boumerdès', 'El Tarf', 'Tindouf', 'Tissemsilt', 'El Oued', 'Khenchela',
  'Souk Ahras', 'Tipaza', 'Mila', 'Aïn Defla', 'Naâma', 'Aïn Témouchent',
  'Ghardaïa', 'Relizane', 'El M\'Ghair', 'El Meniaa', 'Ouled Djellal',
  'Bordj Badji Mokhtar', 'Béni Abbès', 'Timimoun', 'Touggourt', 'Djanet',
  'In Salah', 'In Guezzam'
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function PharmacistPatients() {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<PharmacyPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PharmacyPatient | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    full_name: '',
    email: '',
    phone: '',
    birth_date: '',
    wilaya: '',
    carte_chifa_number: '',
    blood_type: '',
    allergies: '',
    chronic_conditions: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndLoadPatients();
  }, []);

  const checkAuthAndLoadPatients = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    setCurrentUserId(session.user.id);
    await fetchPatients(session.user.id);
  };

  const fetchPatients = async (userId: string) => {
    try {
      setLoading(true);
      
      // Try to fetch patients from database
      const { data, error } = await supabase
        .from('pharmacy_patients')
        .select('*')
        .order('last_visit_at', { ascending: false });

      if (error) {
        console.error('Error fetching patients:', error);
        // Fall back to sample data if no patients exist
        await initializeSamplePatients(userId);
        return;
      }

      if (data && data.length > 0) {
        setPatients(data);
      } else {
        // Initialize sample patients for demo
        await initializeSamplePatients(userId);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors du chargement des patients');
    } finally {
      setLoading(false);
    }
  };

  const initializeSamplePatients = async (userId: string) => {
    const samplePatients = [
      { full_name: 'Ahmed Benali', email: 'ahmed.benali@gmail.com', phone: '0555 12 34 56', birth_date: '1985-03-15', wilaya: 'Alger', carte_chifa_number: '1234567890123456', blood_type: 'A+', allergies: ['Pénicilline'], chronic_conditions: ['Hypertension', 'Diabète type 2'], has_alerts: true },
      { full_name: 'Fatima Hadj', email: 'fatima.hadj@outlook.com', phone: '0661 78 90 12', birth_date: '1990-07-22', wilaya: 'Oran', carte_chifa_number: '2345678901234567', blood_type: 'B+', allergies: null, chronic_conditions: ['Asthme'], has_alerts: false },
      { full_name: 'Mohamed Krim', email: 'mohamed.krim@yahoo.fr', phone: '0770 34 56 78', birth_date: '1978-11-08', wilaya: 'Constantine', carte_chifa_number: '3456789012345678', blood_type: 'O+', allergies: ['Aspirine', 'Ibuprofène'], chronic_conditions: ['Insuffisance cardiaque', 'Hypercholestérolémie'], has_alerts: true },
      { full_name: 'Amina Slimani', email: 'amina.slimani@gmail.com', phone: '0550 90 12 34', birth_date: '1995-02-28', wilaya: 'Blida', carte_chifa_number: '4567890123456789', blood_type: 'AB-', allergies: null, chronic_conditions: null, has_alerts: false },
      { full_name: 'Youcef Boudiaf', email: 'youcef.boudiaf@hotmail.com', phone: '0660 56 78 90', birth_date: '1982-09-10', wilaya: 'Sétif', carte_chifa_number: '5678901234567890', blood_type: 'A-', allergies: ['Sulfamides'], chronic_conditions: ['Épilepsie'], has_alerts: false },
      { full_name: 'Khadija Messaoudi', email: 'khadija.messaoudi@gmail.com', phone: '0555 23 45 67', birth_date: '1988-12-05', wilaya: 'Annaba', carte_chifa_number: '6789012345678901', blood_type: 'B-', allergies: null, chronic_conditions: ['Thyroïdite de Hashimoto'], has_alerts: false },
      { full_name: 'Rachid Belkacem', email: 'rachid.belkacem@yahoo.fr', phone: '0771 89 01 23', birth_date: '1970-06-18', wilaya: 'Tizi Ouzou', carte_chifa_number: '7890123456789012', blood_type: 'O-', allergies: ['Latex', 'Codéine'], chronic_conditions: ['BPCO', 'Arthrose'], has_alerts: true },
      { full_name: 'Samira Bouzid', email: 'samira.bouzid@outlook.com', phone: '0662 34 56 78', birth_date: '1992-04-30', wilaya: 'Batna', carte_chifa_number: '8901234567890123', blood_type: 'AB+', allergies: null, chronic_conditions: ['Dépression', 'Anxiété'], has_alerts: false },
    ];

    // Insert sample patients with the current user as pharmacist
    for (const patient of samplePatients) {
      try {
        await supabase.from('pharmacy_patients').insert({
          pharmacist_id: userId,
          full_name: patient.full_name,
          email: patient.email,
          phone: patient.phone,
          birth_date: patient.birth_date,
          wilaya: patient.wilaya,
          carte_chifa_number: patient.carte_chifa_number,
          blood_type: patient.blood_type,
          allergies: patient.allergies,
          chronic_conditions: patient.chronic_conditions,
          has_alerts: patient.has_alerts,
          last_visit_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        });
      } catch (e) {
        // Ignore insert errors for sample data
      }
    }

    // Fetch again after inserting
    const { data } = await supabase
      .from('pharmacy_patients')
      .select('*')
      .order('last_visit_at', { ascending: false });

    if (data) {
      setPatients(data);
    }
  };

  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (patient.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
    (patient.phone?.includes(searchQuery) ?? false) ||
    (patient.wilaya?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const stats = [
    { label: 'Total Patients', value: patients.length, icon: Users, color: 'primary' },
    { label: 'Avec Alertes', value: patients.filter(p => p.has_alerts).length, icon: AlertTriangle, color: 'warning' },
    { label: 'Cette Semaine', value: patients.filter(p => Date.now() - new Date(p.last_visit_at).getTime() < 7 * 24 * 60 * 60 * 1000).length, icon: Calendar, color: 'success' },
    { label: 'Conditions Chroniques', value: patients.filter(p => p.chronic_conditions && p.chronic_conditions.length > 0).length, icon: Activity, color: 'info' },
  ];

  const formatDate = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleAddPatient = async () => {
    if (!newPatient.full_name.trim()) {
      toast.error('Le nom complet est obligatoire');
      return;
    }

    if (!currentUserId) {
      toast.error('Vous devez être connecté');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase
        .from('pharmacy_patients')
        .insert({
          pharmacist_id: currentUserId,
          full_name: newPatient.full_name,
          email: newPatient.email || null,
          phone: newPatient.phone || null,
          birth_date: newPatient.birth_date || null,
          wilaya: newPatient.wilaya || null,
          carte_chifa_number: newPatient.carte_chifa_number || null,
          blood_type: newPatient.blood_type || null,
          allergies: newPatient.allergies ? newPatient.allergies.split(',').map(a => a.trim()) : null,
          chronic_conditions: newPatient.chronic_conditions ? newPatient.chronic_conditions.split(',').map(c => c.trim()) : null,
          notes: newPatient.notes || null,
          has_alerts: false
        })
        .select()
        .single();

      if (error) throw error;

      setPatients(prev => [data, ...prev]);
      setNewPatient({
        full_name: '', email: '', phone: '', birth_date: '',
        wilaya: '', carte_chifa_number: '', blood_type: '',
        allergies: '', chronic_conditions: '', notes: ''
      });
      setIsAddDialogOpen(false);
      toast.success(`Patient "${newPatient.full_name}" ajouté avec succès`);
    } catch (error) {
      console.error('Error adding patient:', error);
      toast.error('Erreur lors de l\'ajout du patient');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePatient = async (patientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce patient ?')) return;

    try {
      const { error } = await supabase
        .from('pharmacy_patients')
        .delete()
        .eq('id', patientId);

      if (error) throw error;

      setPatients(prev => prev.filter(p => p.id !== patientId));
      toast.success('Patient supprimé');
    } catch (error) {
      console.error('Error deleting patient:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const openPatientDetail = (patient: PharmacyPatient) => {
    setSelectedPatient(patient);
    setIsDetailOpen(true);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <PharmacistSidebar />
      
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold mb-2"
            >
              Suivi <span className="text-gradient">Patients</span>
            </motion.h1>
            <p className="text-muted-foreground">
              Gestion des dossiers patients et ordonnances
            </p>
          </div>
          
          <Button className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
            <UserPlus className="w-4 h-4" />
            Nouveau Patient
          </Button>
        </div>

        {/* Add Patient Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Nouveau Patient
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="full_name">Nom complet *</Label>
                  <Input
                    id="full_name"
                    placeholder="Ex: Ahmed Benali"
                    value={newPatient.full_name}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="patient@email.com"
                    value={newPatient.email}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    placeholder="0555 12 34 56"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Date de naissance</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={newPatient.birth_date}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, birth_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="wilaya">Wilaya</Label>
                  <Select value={newPatient.wilaya} onValueChange={(v) => setNewPatient(prev => ({ ...prev, wilaya: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {WILAYAS.map(w => (
                        <SelectItem key={w} value={w}>{w}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="carte_chifa">N° Carte Chifa</Label>
                  <Input
                    id="carte_chifa"
                    placeholder="16 chiffres"
                    maxLength={16}
                    value={newPatient.carte_chifa_number}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, carte_chifa_number: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blood_type">Groupe sanguin</Label>
                  <Select value={newPatient.blood_type} onValueChange={(v) => setNewPatient(prev => ({ ...prev, blood_type: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOOD_TYPES.map(bt => (
                        <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="allergies">Allergies (séparées par virgule)</Label>
                  <Input
                    id="allergies"
                    placeholder="Ex: Pénicilline, Aspirine"
                    value={newPatient.allergies}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, allergies: e.target.value }))}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="chronic_conditions">Conditions chroniques (séparées par virgule)</Label>
                  <Input
                    id="chronic_conditions"
                    placeholder="Ex: Diabète, Hypertension"
                    value={newPatient.chronic_conditions}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, chronic_conditions: e.target.value }))}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notes supplémentaires..."
                    value={newPatient.notes}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddPatient} disabled={isSubmitting}>
                {isSubmitting ? 'Ajout...' : 'Ajouter Patient'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Patient Detail Dialog */}
        <PatientDetailDialog
          patient={selectedPatient}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
        />

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((stat, index) => (
            <GlowCard key={stat.label} delay={index * 0.05} glowColor={stat.color as any}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-display font-bold">
                    {loading ? '...' : <AnimatedCounter value={stat.value} />}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-lg bg-${stat.color}/10 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                </div>
              </div>
            </GlowCard>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 mb-6"
        >
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par nom, email, téléphone, wilaya..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/30 border-border/50"
            />
          </div>
        </motion.div>

        {/* Patients Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {loading ? (
            <div className="col-span-full glass-card p-8 text-center text-muted-foreground">
              Chargement des patients...
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="col-span-full glass-card p-8 text-center text-muted-foreground">
              Aucun patient trouvé
            </div>
          ) : (
            filteredPatients.map((patient, index) => (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-4 hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => openPatientDetail(patient)}
              >
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {getInitials(patient.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{patient.full_name}</h3>
                      {patient.has_alerts && (
                        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                      )}
                    </div>
                    
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {patient.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3 h-3" />
                          <span className="truncate">{patient.email}</span>
                        </div>
                      )}
                      {patient.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3 h-3" />
                          <span>{patient.phone}</span>
                        </div>
                      )}
                      {patient.wilaya && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          <span>{patient.wilaya}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {patient.blood_type && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Droplet className="w-3 h-3" />
                          {patient.blood_type}
                        </Badge>
                      )}
                      {patient.chronic_conditions && patient.chronic_conditions.length > 0 && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Activity className="w-3 h-3" />
                          {patient.chronic_conditions.length} condition{patient.chronic_conditions.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDate(patient.last_visit_at)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1">
                    Voir Dossier
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDeletePatient(patient.id, e)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      </main>
    </div>
  );
}
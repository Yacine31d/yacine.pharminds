import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Heart,
  AlertTriangle,
  Pill,
  FileText,
  Clock,
  Activity,
  X,
  Droplet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface Medication {
  id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'completed' | 'paused';
}

interface Ordonnance {
  id: string;
  doctor_name: string;
  prescription_date: string;
  medications_count: number;
  status: string;
}

interface PatientDetailDialogProps {
  patient: PharmacyPatient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientDetailDialog({ patient, open, onOpenChange }: PatientDetailDialogProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patient && open) {
      fetchPatientData();
    }
  }, [patient, open]);

  const fetchPatientData = async () => {
    if (!patient) return;
    setLoading(true);
    
    // Simulate fetching medications and ordonnances
    // In real app, you'd query from actual patient data linked to user accounts
    const mockMedications: Medication[] = [
      { id: '1', drug_name: 'Metformine 500mg', dosage: '1 comprimé', frequency: '2x/jour', start_date: '2024-01-15', end_date: null, status: 'active' },
      { id: '2', drug_name: 'Amlodipine 5mg', dosage: '1 comprimé', frequency: '1x/jour matin', start_date: '2024-02-01', end_date: null, status: 'active' },
      { id: '3', drug_name: 'Atorvastatine 20mg', dosage: '1 comprimé', frequency: '1x/jour soir', start_date: '2024-01-20', end_date: null, status: 'active' },
      { id: '4', drug_name: 'Oméprazole 20mg', dosage: '1 gélule', frequency: '1x/jour avant repas', start_date: '2024-03-01', end_date: '2024-03-30', status: 'completed' },
    ];

    const mockOrdonnances: Ordonnance[] = [
      { id: '1', doctor_name: 'Dr. Khaled Mansouri', prescription_date: '2024-12-20', medications_count: 3, status: 'active' },
      { id: '2', doctor_name: 'Dr. Amira Benali', prescription_date: '2024-11-15', medications_count: 2, status: 'completed' },
      { id: '3', doctor_name: 'Dr. Karim Hadj', prescription_date: '2024-10-01', medications_count: 4, status: 'completed' },
    ];

    setMedications(mockMedications);
    setOrdonnances(mockOrdonnances);
    setLoading(false);
  };

  if (!patient) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-DZ', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const age = calculateAge(patient.birth_date);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {getInitials(patient.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{patient.full_name}</h2>
                {patient.has_alerts && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Alerte
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {age && <span>{age} ans</span>}
                {patient.blood_type && (
                  <Badge variant="outline" className="gap-1">
                    <Droplet className="w-3 h-3" />
                    {patient.blood_type}
                  </Badge>
                )}
                {patient.wilaya && <span>{patient.wilaya}</span>}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1">
          <TabsList className="w-full justify-start border-b border-border/50 rounded-none bg-transparent px-6 h-12">
            <TabsTrigger value="info" className="gap-2">
              <User className="w-4 h-4" />
              Informations
            </TabsTrigger>
            <TabsTrigger value="medications" className="gap-2">
              <Pill className="w-4 h-4" />
              Médicaments ({medications.filter(m => m.status === 'active').length})
            </TabsTrigger>
            <TabsTrigger value="ordonnances" className="gap-2">
              <FileText className="w-4 h-4" />
              Ordonnances ({ordonnances.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="w-4 h-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(90vh-200px)]">
            <TabsContent value="info" className="p-6 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Information */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4 space-y-4"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    Coordonnées
                  </h3>
                  <div className="space-y-3">
                    {patient.email && (
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{patient.email}</span>
                      </div>
                    )}
                    {patient.phone && (
                      <div className="flex items-center gap-3 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{patient.phone}</span>
                      </div>
                    )}
                    {patient.address && (
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{patient.address}</span>
                      </div>
                    )}
                    {patient.birth_date && (
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>Né(e) le {formatDate(patient.birth_date)}</span>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Health Information */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="glass-card p-4 space-y-4"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <Heart className="w-4 h-4 text-primary" />
                    Santé
                  </h3>
                  <div className="space-y-3">
                    {patient.carte_chifa_number && (
                      <div className="flex items-center gap-3 text-sm">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <span>Carte Chifa: {patient.carte_chifa_number}</span>
                      </div>
                    )}
                    {patient.blood_type && (
                      <div className="flex items-center gap-3 text-sm">
                        <Droplet className="w-4 h-4 text-muted-foreground" />
                        <span>Groupe sanguin: {patient.blood_type}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span>Dernière visite: {formatDate(patient.last_visit_at)}</span>
                    </div>
                  </div>
                </motion.div>

                {/* Allergies */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass-card p-4 space-y-4"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    Allergies
                  </h3>
                  {patient.allergies && patient.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.map((allergy, idx) => (
                        <Badge key={idx} variant="destructive" className="text-xs">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune allergie connue</p>
                  )}
                </motion.div>

                {/* Chronic Conditions */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass-card p-4 space-y-4"
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-warning" />
                    Conditions chroniques
                  </h3>
                  {patient.chronic_conditions && patient.chronic_conditions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patient.chronic_conditions.map((condition, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucune condition chronique</p>
                  )}
                </motion.div>
              </div>

              {/* Notes */}
              {patient.notes && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="glass-card p-4 mt-6"
                >
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground">{patient.notes}</p>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="medications" className="p-6 m-0">
              <div className="space-y-4">
                <h3 className="font-semibold">Médicaments actifs</h3>
                {loading ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : medications.length === 0 ? (
                  <p className="text-muted-foreground">Aucun médicament enregistré</p>
                ) : (
                  <div className="space-y-3">
                    {medications.map((med, idx) => (
                      <motion.div
                        key={med.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="glass-card p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            med.status === 'active' ? 'bg-primary/10' : 'bg-secondary'
                          }`}>
                            <Pill className={`w-5 h-5 ${
                              med.status === 'active' ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">{med.drug_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {med.dosage} • {med.frequency}
                            </p>
                          </div>
                        </div>
                        <Badge variant={med.status === 'active' ? 'default' : 'secondary'}>
                          {med.status === 'active' ? 'En cours' : 'Terminé'}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="ordonnances" className="p-6 m-0">
              <div className="space-y-4">
                <h3 className="font-semibold">Historique des ordonnances</h3>
                {loading ? (
                  <p className="text-muted-foreground">Chargement...</p>
                ) : ordonnances.length === 0 ? (
                  <p className="text-muted-foreground">Aucune ordonnance enregistrée</p>
                ) : (
                  <div className="space-y-3">
                    {ordonnances.map((ord, idx) => (
                      <motion.div
                        key={ord.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="glass-card p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{ord.doctor_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(ord.prescription_date)} • {ord.medications_count} médicaments
                            </p>
                          </div>
                        </div>
                        <Badge variant={ord.status === 'active' ? 'default' : 'secondary'}>
                          {ord.status === 'active' ? 'Active' : 'Terminée'}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="p-6 m-0">
              <div className="space-y-4">
                <h3 className="font-semibold">Historique des visites</h3>
                <div className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="glass-card p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div>
                        <p className="font-medium">Dernière visite</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(patient.last_visit_at)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                      <div>
                        <p className="font-medium">Date d'inscription</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(patient.created_at)}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
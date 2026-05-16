import { motion } from 'framer-motion';
import {
  Shield,
  Stethoscope,
  User,
  ArrowRight,
  LineChart,
  Bell,
  Pill,
  Calendar,
  Lock,
  Globe,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const roles = [
  {
    id: 'admin',
    icon: Shield,
    title: 'Tableau de bord Admin',
    subtitle: 'Aperçu global du système',
    description: 'Surveillance des utilisateurs, statistiques générales, et gestion des rôles.',
    features: [
      { icon: Globe, label: 'Statistiques Globales' },
      { icon: LineChart, label: 'Données Analytiques' },
      { icon: Lock, label: 'Gestion des Rôles' },
    ],
    gradient: 'from-accent to-destructive',
    path: '/admin',
    buttonLabel: 'Accès Admin',
  },
  {
    id: 'pharmacist',
    icon: Stethoscope,
    title: 'Espace Pharmacien',
    subtitle: 'Vérification et Stock',
    description: 'Alertes sur les interactions médicamenteuses, gestion du stock, et historique des patients.',
    features: [
      { icon: Bell, label: 'Alertes Interactions' },
      { icon: Pill, label: 'Gestion du Stock' },
      { icon: LineChart, label: 'Tableau de bord' },
    ],
    gradient: 'from-primary to-info',
    path: '/pharmacist',
    buttonLabel: 'Accès Pharmacien',
  },
  {
    id: 'patient',
    icon: User,
    title: 'Espace Patient',
    subtitle: 'Suivi Personnel',
    description: 'Historique des ordonnances, suivi des médicaments en cours, et assistant vocal multilingue.',
    features: [
      { icon: Calendar, label: 'Ordonnances' },
      { icon: Pill, label: 'Médicaments Actifs' },
      { icon: MessageCircle, label: 'Assistant Vocal' },
    ],
    gradient: 'from-info to-primary',
    path: '/patient',
    buttonLabel: 'Accès Patient',
  },
];

export function RolesSection() {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();

  return (
    <section id="roles" className="py-24 relative overflow-hidden bg-secondary/30" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="container relative z-10 px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-display text-sm tracking-widest uppercase mb-4 block">
            {language === 'ar' ? 'تجارب المستخدمين' : 'Expériences Utilisateurs'}
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            {language === 'ar' ? 'مصمم لـ' : 'Conçu pour'}{' '}
            <span className="text-gradient">
              {language === 'ar' ? 'كل دور' : 'Chaque Rôle'}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === 'ar'
              ? 'واجهات مخصصة للاحتياجات الفريدة للمهنيين الصحيين والمرضى'
              : 'Des interfaces sur mesure pour les besoins spécifiques des professionnels de santé et des patients'}
          </p>
        </motion.div>

        {/* Roles Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.2, duration: 0.6 }}
              whileHover={{ y: -8 }}
              className="group relative"
            >
              <div className="glass-card-elevated p-8 h-full flex flex-col relative overflow-hidden">
                {/* Background Gradient */}
                <div 
                  className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${role.gradient}`}
                />

                {/* Icon */}
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${role.gradient} p-5 mb-6 relative`}>
                  <role.icon className="w-full h-full text-foreground" />
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${role.gradient} blur-xl opacity-50`} />
                </div>

                {/* Content */}
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-2">{role.title}</h3>
                  <p className="text-primary text-sm font-medium mb-4">{role.subtitle}</p>
                  <p className="text-muted-foreground mb-6">{role.description}</p>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {role.features.map((feature) => (
                      <div key={feature.label} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <feature.icon className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm">{feature.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <Button 
                    variant="hero"
                    className="w-full group/btn"
                    onClick={() => navigate(role.path)}
                  >
                    {role.buttonLabel}
                    <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

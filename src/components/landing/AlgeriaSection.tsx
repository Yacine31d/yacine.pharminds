import { motion } from 'framer-motion';
import { MapPin, Shield, FileText, Database, Globe, Lock } from 'lucide-react';
import { GlowCard } from '@/components/ui/glow-card';

const features = [
  {
    icon: MapPin,
    title: '58 Wilayas',
    description: 'Couverture nationale avec support pour toutes les wilayas algériennes dans le système.',
  },
  {
    icon: Database,
    title: 'Base de Données Médicaments',
    description: 'Base de données pharmaceutique avec noms locaux, génériques, codes ATC et vérification des interactions.',
  },
  {
    icon: FileText,
    title: 'Carte Chifa & CNAS',
    description: 'Gestion de la carte Chifa et compatibilité avec le système de sécurité sociale algérien.',
  },
  {
    icon: Shield,
    title: 'Données Sécurisées',
    description: 'Authentification sécurisée, contrôle d\'accès par rôle et traçabilité des actions.',
  },
  {
    icon: Lock,
    title: 'Accès Protégé',
    description: 'Système de rôles (Admin, Pharmacien, Patient) avec routes protégées et sessions sécurisées.',
  },
  {
    icon: Globe,
    title: 'Français & Arabe',
    description: 'Interface bilingue complète avec support de la saisie vocale en français, arabe et darija.',
  },
];

export function AlgeriaSection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-primary font-display text-sm tracking-widest uppercase mb-4 block">
              Conçu pour l'Algérie
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Adapté à la{' '}
              <span className="text-gradient">Réalité Algérienne</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              PharMinds est conçu pour répondre aux besoins spécifiques des pharmacies algériennes :
              carte Chifa, nomenclature locale, et interface bilingue.
            </p>

            {/* Key Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="text-center p-4 glass-card">
                <p className="text-3xl font-display font-bold text-gradient">58</p>
                <p className="text-xs text-muted-foreground">Wilayas</p>
              </div>
              <div className="text-center p-4 glass-card">
                <p className="text-3xl font-display font-bold text-gradient">2</p>
                <p className="text-xs text-muted-foreground">Langues (FR & AR)</p>
              </div>
              <div className="text-center p-4 glass-card">
                <p className="text-3xl font-display font-bold text-gradient">3</p>
                <p className="text-xs text-muted-foreground">Portails Utilisateurs</p>
              </div>
            </div>

            {/* Arabic Text */}
            <div className="glass-card p-6 rtl-text text-right">
              <p className="text-xl font-arabic text-primary mb-2">
                صيدليات الجزائر الذكية
              </p>
              <p className="text-muted-foreground font-arabic">
                منصة مصممة خصيصًا للصيدليات الجزائرية
              </p>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 gap-4"
          >
            {features.map((feature, index) => (
              <GlowCard
                key={feature.title}
                delay={index * 0.1}
                className="p-4"
              >
                <feature.icon className="w-8 h-8 text-primary mb-3" />
                <h4 className="font-semibold mb-1 text-sm">{feature.title}</h4>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </GlowCard>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

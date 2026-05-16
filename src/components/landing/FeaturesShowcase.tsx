/**
 * FeaturesShowcase — Highlights the 5 smart features of PharMinds
 * Radar Stock · Ordonnance Claire · DCI Switch · Chifa Auto · Rupture Alert
 */
import { motion } from 'framer-motion';
import { MapPin, FileText, RefreshCw, CreditCard, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

const features = [
  {
    icon: MapPin,
    color: 'from-cyan-500 to-blue-600',
    glow: 'rgba(6, 182, 212, 0.25)',
    badge: 'Patient',
    title: { fr: 'Radar Stock', ar: 'رادار المخزون' },
    description: {
      fr: 'Trouvez en temps réel les pharmacies de votre wilaya qui ont votre médicament en stock — avec carte interactive et itinéraire GPS.',
      ar: 'ابحث في الوقت الفعلي عن الصيدليات في ولايتك التي لديها دواؤك في المخزون — مع خريطة تفاعلية وإتجاهات GPS.',
    },
    href: '/patient/drug-search',
  },
  {
    icon: FileText,
    color: 'from-emerald-500 to-teal-600',
    glow: 'rgba(52, 211, 153, 0.25)',
    badge: 'Patient',
    title: { fr: 'Ordonnance Claire', ar: 'الوصفة الواضحة' },
    description: {
      fr: 'Votre ordonnance expliquée en français simple. Dosage, horaires, durée et avertissements — sans jargon médical.',
      ar: 'وصفتك الطبية مشروحة بلغة بسيطة. الجرعة والتوقيت والمدة والتحذيرات — بدون مصطلحات طبية.',
    },
    href: '/patient/ordonnances',
  },
  {
    icon: RefreshCw,
    color: 'from-violet-500 to-purple-600',
    glow: 'rgba(139, 92, 246, 0.25)',
    badge: 'Pharmacien',
    title: { fr: 'DCI Switch', ar: 'تبديل الجنيسات' },
    description: {
      fr: "Substituez automatiquement tout médicament en rupture par son équivalent générique disponible en stock — en un clic.",
      ar: 'استبدل تلقائياً أي دواء نافد بمكافئه الجنيس المتوفر في المخزون — بنقرة واحدة.',
    },
    href: '/pharmacist',
  },
  {
    icon: CreditCard,
    color: 'from-amber-500 to-orange-600',
    glow: 'rgba(245, 158, 11, 0.25)',
    badge: 'Pharmacien',
    title: { fr: 'Chifa Auto', ar: 'شيفا أوتو' },
    description: {
      fr: 'Automatisez le suivi des remboursements CNAS. Calcul du montant remboursable, suivi du statut et gestion des déclarations Chifa.',
      ar: 'أتمتة تتبع تسديدات CNAS. حساب المبلغ القابل للتسديد وتتبع الحالة وإدارة إقرارات شيفا.',
    },
    href: '/pharmacist/chifa',
  },
  {
    icon: AlertTriangle,
    color: 'from-rose-500 to-red-600',
    glow: 'rgba(244, 63, 94, 0.25)',
    badge: 'Pharmacien',
    title: { fr: 'Rupture Alert', ar: 'تنبيه النقص' },
    description: {
      fr: "Détectez les risques de rupture avant qu'ils surviennent. Alertes réseau par wilaya, niveaux critiques et recommandations de réapprovisionnement.",
      ar: 'اكتشف مخاطر نفاد المخزون قبل حدوثها. تنبيهات الشبكة حسب الولاية والمستويات الحرجة وتوصيات إعادة التزويد.',
    },
    href: '/pharmacist/alerts',
  },
];

const badgeColors: Record<string, string> = {
  Patient: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  Pharmacien: 'bg-primary/15 text-primary border-primary/30',
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export function FeaturesShowcase() {
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  return (
    <section id="features" className="py-24 relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-sm font-medium mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {language === 'ar' ? 'ميزات ذكية جديدة' : 'Nouvelles fonctionnalités intelligentes'}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-5">
            {language === 'ar' ? 'خمس أدوات' : 'Cinq outils'}{' '}
            <span className="text-gradient">
              {language === 'ar' ? 'تغيّر قواعد اللعبة' : 'qui changent tout'}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === 'ar'
              ? 'مصممة لتوفير الوقت وتحسين السلامة لكل من الصيادلة والمرضى'
              : "Conçus pour gagner du temps et améliorer la sécurité, pour les pharmaciens comme pour les patients"}
          </p>
        </motion.div>

        {/* Features Grid — 3 + 2 layout */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid md:grid-cols-3 gap-5 mb-5"
        >
          {features.slice(0, 3).map((feature) => (
            <FeatureCard key={feature.title.fr} feature={feature} language={language} navigate={navigate} />
          ))}
        </motion.div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto"
        >
          {features.slice(3).map((feature) => (
            <FeatureCard key={feature.title.fr} feature={feature} language={language} navigate={navigate} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeatureCard({
  feature,
  language,
  navigate,
}: {
  feature: (typeof features)[0];
  language: string;
  navigate: ReturnType<typeof useNavigate>;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
      }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      onClick={() => navigate(feature.href)}
      className="group relative glass-card p-6 cursor-pointer overflow-hidden"
      style={{ '--feature-glow': feature.glow } as React.CSSProperties}
    >
      {/* Hover glow overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl pointer-events-none"
        style={{ background: `radial-gradient(circle at 30% 30%, ${feature.glow}, transparent 70%)` }}
      />

      {/* Icon + Badge row */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg`}
        >
          <feature.icon className="w-5 h-5 text-white" />
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded-full border ${badgeColors[feature.badge]}`}
        >
          {feature.badge}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold mb-2 relative z-10 group-hover:text-primary transition-colors duration-200">
        {feature.title[language as 'fr' | 'ar']}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed relative z-10 mb-4">
        {feature.description[language as 'fr' | 'ar']}
      </p>

      {/* Arrow */}
      <div className="flex items-center gap-1.5 text-xs font-medium text-primary/70 group-hover:text-primary transition-colors relative z-10">
        <span>{language === 'ar' ? 'اكتشف المزيد' : 'Découvrir'}</span>
        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
      </div>

      {/* Subtle gradient border on hover */}
      <div
        className={`absolute inset-0 rounded-xl border-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br ${feature.color}`}
        style={{ WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: '1px' }}
      />
    </motion.div>
  );
}

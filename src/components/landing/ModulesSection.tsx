import { motion, AnimatePresence } from 'framer-motion';
import { Brain, TrendingUp, MessageCircle, ArrowRight, Zap, Database, Users, CheckCircle, Target, Shield, Play } from 'lucide-react';
import { GlowCard } from '@/components/ui/glow-card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { InteractionPreview, InventoryPreview, AssistantPreview } from './ModulePreview';

interface ModuleDetails {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: { fr: string; ar: string };
  description: { fr: string; ar: string };
  features: { fr: string[]; ar: string[] };
  gradient: string;
  glowColor: 'primary' | 'info' | 'warning';
  stats: { value: string; label: { fr: string; ar: string } };
  details: {
    howItWorks: { fr: string; ar: string };
    benefits: { fr: string[]; ar: string[] };
    techSpecs: { fr: string[]; ar: string[] };
  };
}

const modules: ModuleDetails[] = [
  {
    id: 'interactions',
    icon: Brain,
    title: { fr: 'Détection des Interactions Médicamenteuses', ar: 'كشف التفاعلات الدوائية' },
    description: { 
      fr: 'Vérifie automatiquement les interactions entre médicaments prescrits et traitements en cours du patient à partir de notre base de données.',
      ar: 'يتحقق تلقائياً من التفاعلات بين الأدوية الموصوفة والعلاجات الحالية للمريض من قاعدة بياناتنا.'
    },
    features: {
      fr: ['Alertes par niveau de sévérité', 'Croisement avec les traitements en cours', 'Scan OCR des ordonnances', 'Recommandations alternatives'],
      ar: ['تنبيهات حسب مستوى الخطورة', 'مقارنة مع العلاجات الحالية', 'مسح ضوئي للوصفات', 'توصيات بدائل علاجية']
    },
    gradient: 'from-primary to-info',
    glowColor: 'primary',
    stats: { value: '✓', label: { fr: 'Base de données intégrée', ar: 'قاعدة بيانات متكاملة' } },
    details: {
      howItWorks: {
        fr: 'Le système vérifie chaque combinaison de médicaments dans une base de données d\'interactions connues et croise avec les traitements déjà pris par le patient. Les alertes sont classées par sévérité (critique, modérée, ou OK).',
        ar: 'يتحقق النظام من كل تركيبة أدوية في قاعدة بيانات التفاعلات المعروفة ويقارنها بالعلاجات الحالية للمريض. التنبيهات مصنفة حسب الخطورة (حرجة، متوسطة، أو آمنة).'
      },
      benefits: {
        fr: ['Détection instantanée des interactions dangereuses', 'Scanner les ordonnances avec l\'appareil photo', 'Alertes visuelles claires par sévérité', 'Création automatique d\'ordonnance à partir du scan'],
        ar: ['كشف فوري للتفاعلات الخطيرة', 'مسح الوصفات بكاميرا الهاتف', 'تنبيهات بصرية واضحة حسب الخطورة', 'إنشاء وصفة تلقائياً من المسح']
      },
      techSpecs: {
        fr: ['Base de données Supabase', 'OCR TrOCR (fine-tuné)', 'Alertes en temps réel', 'Interface responsive'],
        ar: ['قاعدة بيانات Supabase', 'مسح ضوئي TrOCR (مُدرَّب)', 'تنبيهات فورية', 'واجهة متجاوبة']
      }
    }
  },
  {
    id: 'inventory',
    icon: TrendingUp,
    title: { fr: 'Gestion du Stock Pharmaceutique', ar: 'إدارة المخزون الصيدلاني' },
    description: { 
      fr: 'Suivi en temps réel des niveaux de stock, alertes de seuil bas, et mise à jour facile des quantités pour chaque médicament.',
      ar: 'متابعة فورية لمستويات المخزون، تنبيهات انخفاض المخزون، وتحديث سهل للكميات لكل دواء.'
    },
    features: {
      fr: ['Alertes stock bas automatiques', 'Mise à jour rapide des quantités', 'Tableau de bord du stock', 'Historique des mouvements'],
      ar: ['تنبيهات انخفاض المخزون', 'تحديث سريع للكميات', 'لوحة تحكم المخزون', 'سجل الحركات']
    },
    gradient: 'from-info to-primary',
    glowColor: 'info',
    stats: { value: '58', label: { fr: 'Wilayas Supportées', ar: 'ولاية مدعومة' } },
    details: {
      howItWorks: {
        fr: 'Le système de gestion du stock permet de suivre en temps réel les niveaux de chaque médicament. Des alertes automatiques sont envoyées quand un produit passe sous le seuil minimum configuré.',
        ar: 'يتيح نظام إدارة المخزون متابعة مستويات كل دواء في الوقت الفعلي. يتم إرسال تنبيهات تلقائية عندما ينخفض المنتج تحت الحد الأدنى المحدد.'
      },
      benefits: {
        fr: ['Suivi des 58 wilayas algériennes', 'Notifications push en cas de stock bas', 'Gestion simplifiée des commandes', 'Tableau de bord analytique'],
        ar: ['تغطية 58 ولاية جزائرية', 'إشعارات فورية عند انخفاض المخزون', 'إدارة مبسطة للطلبيات', 'لوحة تحليلات']
      },
      techSpecs: {
        fr: ['Backend: Supabase + Edge Functions', 'Notifications en temps réel', 'Graphiques Recharts', 'PWA avec mode hors ligne'],
        ar: ['الخلفية: Supabase + Edge Functions', 'إشعارات في الوقت الفعلي', 'رسوم بيانية Recharts', 'PWA مع وضع عدم الاتصال']
      }
    }
  },
  {
    id: 'assistant',
    icon: MessageCircle,
    title: { fr: 'Assistant Chat Pharmaceutique', ar: 'مساعد المحادثة الصيدلاني' },
    description: { 
      fr: 'Chatbot intelligent qui répond aux questions sur les médicaments, la posologie et les interactions. Support vocal en français et arabe.',
      ar: 'روبوت محادثة ذكي يجيب على أسئلة الأدوية والجرعات والتفاعلات. دعم صوتي بالفرنسية والعربية.'
    },
    features: {
      fr: ['Chat en français et arabe', 'Entrée vocale multilingue', 'Réponses sur les médicaments', 'Mode accessible pour les patients'],
      ar: ['محادثة بالفرنسية والعربية', 'إدخال صوتي متعدد اللغات', 'إجابات عن الأدوية', 'وضع سهل الاستخدام للمرضى']
    },
    gradient: 'from-warning to-accent',
    glowColor: 'warning',
    stats: { value: '3', label: { fr: 'Langues supportées', ar: 'لغات مدعومة' } },
    details: {
      howItWorks: {
        fr: 'L\'assistant utilise Arcee AI (modèle trinity-mini) pour répondre aux questions pharmaceutiques. Il supporte la saisie vocale en français, arabe standard et dialecte algérien grâce à l\'API Web Speech.',
        ar: 'يستخدم المساعد Arcee AI (نموذج trinity-mini) للإجابة على الأسئلة الصيدلانية. يدعم الإدخال الصوتي بالفرنسية والعربية الفصحى والدارجة الجزائرية عبر واجهة Web Speech.'
      },
      benefits: {
        fr: ['Support vocal français, arabe et darija', 'Réponses contextualisées pour l\'Algérie', 'Interface accessible aux patients non francophones', 'Mode hors ligne avec PWA'],
        ar: ['دعم صوتي بالفرنسية والعربية والدارجة', 'إجابات مخصصة للسياق الجزائري', 'واجهة متاحة للمرضى غير الناطقين بالفرنسية', 'وضع عدم الاتصال مع PWA']
      },
      techSpecs: {
        fr: ['IA: Arcee AI (trinity-mini)', 'Voix: Web Speech API', 'Langues: FR, AR, Darija', 'Streaming SSE en temps réel'],
        ar: ['الذكاء: Arcee AI (trinity-mini)', 'الصوت: Web Speech API', 'اللغات: فرنسية، عربية، دارجة', 'بث SSE مباشر']
      }
    }
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut" as const,
    },
  },
};

export function ModulesSection() {
  const [selectedModule, setSelectedModule] = useState<ModuleDetails | null>(null);
  const { language, isRTL } = useLanguage();
  const navigate = useNavigate();

  const dialogContentVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const }
    })
  };

  const handleGetStarted = () => {
    setSelectedModule(null);
    navigate('/auth');
  };

  return (
    <section className="py-24 relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-info/10 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-display text-sm tracking-widest uppercase mb-4 block">
            {language === 'ar' ? 'الوحدات الأساسية' : 'Fonctionnalités Principales'}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {language === 'ar' ? 'ثلاثة وحدات' : 'Trois Modules'}{' '}
            <span className="text-gradient">{language === 'ar' ? 'أساسية متكاملة' : 'Essentiels'}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === 'ar' 
              ? 'أدوات عملية مصممة الاحتياجات اليومية للصيدليات الجزائرية'
              : 'Des outils concrets conçus pour le quotidien des pharmacies algériennes'}
          </p>
        </motion.div>

        {/* Modules Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid lg:grid-cols-3 gap-8"
        >
          {modules.map((module, index) => (
            <motion.div key={module.id} variants={itemVariants}>
              <GlowCard 
                className="h-full flex flex-col"
                glowColor={module.glowColor}
                delay={index * 0.1}
              >
                {/* Icon */}
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${module.gradient} p-4 mb-6`}>
                  <module.icon className="w-full h-full text-background" />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-3">{module.title[language]}</h3>
                
                {/* Description */}
                <p className="text-muted-foreground mb-6">{module.description[language]}</p>

                {/* Features List */}
                <ul className="space-y-2 mb-6 flex-grow">
                  {module.features[language].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Stat Highlight */}
                <div className="pt-6 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-display font-bold text-gradient">
                        {module.stats.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{module.stats.label[language]}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="group"
                      onClick={() => setSelectedModule(module)}
                    >
                      {language === 'ar' ? 'اعرف المزيد' : 'Learn More'}
                      <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isRTL ? 'mr-1 rotate-180' : 'ml-1'}`} />
                    </Button>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </motion.div>

        {/* Integration Note */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-6 glass-card px-8 py-4 flex-wrap justify-center">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <span className="text-sm">Vidal Algérie</span>
            </div>
            <div className="w-px h-6 bg-border hidden md:block" />
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-info" />
              <span className="text-sm">{language === 'ar' ? 'متوافق مع CNAS' : 'CNAS Compatible'}</span>
            </div>
            <div className="w-px h-6 bg-border hidden md:block" />
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning" />
              <span className="text-sm">{language === 'ar' ? 'متكامل مع ANPP' : 'ANPP Integrated'}</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Module Details Dialog */}
      <Dialog open={!!selectedModule} onOpenChange={() => setSelectedModule(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
          <AnimatePresence mode="wait">
            {selectedModule && (
              <motion.div
                key={selectedModule.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DialogHeader>
                  <motion.div 
                    custom={0}
                    initial="hidden"
                    animate="visible"
                    variants={dialogContentVariants}
                    className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${selectedModule.gradient} p-4 mb-4`}
                  >
                    <selectedModule.icon className="w-full h-full text-background" />
                  </motion.div>
                  <motion.div custom={1} initial="hidden" animate="visible" variants={dialogContentVariants}>
                    <DialogTitle className="text-2xl">{selectedModule.title[language]}</DialogTitle>
                  </motion.div>
                  <motion.div custom={2} initial="hidden" animate="visible" variants={dialogContentVariants}>
                    <DialogDescription>{selectedModule.description[language]}</DialogDescription>
                  </motion.div>
                </DialogHeader>

                <div className="space-y-6 mt-6">
                  {/* Animated Preview */}
                  <motion.div 
                    custom={3} 
                    initial="hidden" 
                    animate="visible" 
                    variants={dialogContentVariants}
                  >
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Play className="w-5 h-5 text-primary" />
                      {language === 'ar' ? 'عرض تفاعلي' : 'Démonstration interactive'}
                    </h4>
                    {selectedModule.id === 'interactions' && <InteractionPreview />}
                    {selectedModule.id === 'inventory' && <InventoryPreview />}
                    {selectedModule.id === 'assistant' && <AssistantPreview />}
                  </motion.div>

                  {/* How It Works */}
                  <motion.div custom={4} initial="hidden" animate="visible" variants={dialogContentVariants}>
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Target className="w-5 h-5 text-primary" />
                      {language === 'ar' ? 'كيف يعمل' : 'Comment ça marche'}
                    </h4>
                    <p className="text-muted-foreground">{selectedModule.details.howItWorks[language]}</p>
                  </motion.div>

                  {/* Benefits */}
                  <motion.div custom={5} initial="hidden" animate="visible" variants={dialogContentVariants}>
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      {language === 'ar' ? 'الفوائد' : 'Avantages'}
                    </h4>
                    <ul className="space-y-2">
                      {selectedModule.details.benefits[language].map((benefit, i) => (
                        <motion.li 
                          key={i} 
                          className="flex items-center gap-2 text-muted-foreground"
                          initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        >
                          <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                          {benefit}
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>

                  {/* Tech Specs */}
                  <motion.div custom={6} initial="hidden" animate="visible" variants={dialogContentVariants}>
                    <h4 className="font-semibold flex items-center gap-2 mb-3">
                      <Shield className="w-5 h-5 text-primary" />
                      {language === 'ar' ? 'المواصفات التقنية' : 'Spécifications techniques'}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedModule.details.techSpecs[language].map((spec, i) => (
                        <motion.div 
                          key={i} 
                          className="glass-card p-3 text-sm"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.7 + i * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          {spec}
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* CTA */}
                  <motion.div 
                    custom={7} 
                    initial="hidden" 
                    animate="visible" 
                    variants={dialogContentVariants}
                    className="pt-4 border-t border-border/50"
                  >
                    <Button 
                      variant="hero" 
                      className="w-full group" 
                      onClick={handleGetStarted}
                    >
                      {language === 'ar' ? 'ابدأ الآن' : 'Commencer maintenant'}
                      <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </section>
  );
}

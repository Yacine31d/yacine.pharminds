import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

const faqs = [
  {
    question: {
      fr: 'Comment fonctionne le système de détection des interactions médicamenteuses ?',
      ar: 'كيف يعمل نظام كشف التفاعلات الدوائية؟'
    },
    answer: {
      fr: 'Notre système vérifie automatiquement les médicaments scannés ou saisis manuellement contre une base de données d\'interactions, et les croise avec les traitements en cours du patient. Il affiche des alertes classées par niveau de sévérité (critique, modérée, sûr).',
      ar: 'يقوم نظامنا بالتحقق التلقائي من الأدوية الممسوحة ضوئياً أو المدخلة يدوياً ضد قاعدة بيانات التفاعلات، ويقارنها مع العلاجات الحالية للمريض. يعرض تنبيهات مصنفة حسب مستوى الخطورة (حرجة، متوسطة، آمنة).'
    }
  },
  {
    question: {
      fr: 'PharMinds est-il adapté aux pharmacies en Algérie ?',
      ar: 'هل فارمايندز مناسب للصيدليات في الجزائر؟'
    },
    answer: {
      fr: 'Oui, la plateforme est conçue spécifiquement pour le contexte algérien. Elle gère la carte Chifa (bien que sans connexion directe CNAS pour le moment, les données peuvent être saisies), et inclut une interface entièrement bilingue Français/Arabe.',
      ar: 'نعم، المنصة مصممة خصيصاً للسياق الجزائري. تدير بطاقة الشفاء (رغم عدم وجود اتصال مباشر مع CNAS حالياً، يمكن إدخال البيانات)، وتتضمن واجهة ثنائية اللغة فرنسي/عربي بالكامل.'
    }
  },
  {
    question: {
      fr: 'Mes données sont-elles sécurisées ?',
      ar: 'هل بياناتي آمنة؟'
    },
    answer: {
      fr: 'Absolument. Nous utilisons Supabase pour gérer l\'authentification et la base de données de manière sécurisée (Row Level Security). Les accès sont strictement séparés : les patients ne voient que leurs données, et les pharmaciens ont accès aux informations nécessaires à leur exercice.',
      ar: 'بالتأكيد. نستخدم Supabase لإدارة المصادقة وقاعدة البيانات بشكل آمن (Row Level Security). الوصول مفصول بدقة: المرضى يرون بياناتهم فقط، والصيادلة لديهم وصول للمعلومات اللازمة لعملهم.'
    }
  },
  {
    question: {
      fr: 'L\'application supporte-t-elle la langue arabe et le dialecte algérien ?',
      ar: 'هل التطبيق يدعم اللغة العربية والدارجة الجزائرية؟'
    },
    answer: {
      fr: 'Oui, l\'interface de PharMinds supporte le français et l\'arabe standard. De plus, notre assistant chatbot peut comprendre les requêtes vocales en dialecte algérien (Darija) via l\'API Web Speech.',
      ar: 'نعم، تدعم واجهة فارمايندز الفرنسية والعربية الفصحى. بالإضافة إلى ذلك، يمكن لمساعد المحادثة الخاص بنا فهم الطلبات الصوتية بالدارجة الجزائرية عبر واجهة Web Speech.'
    }
  },
  {
    question: {
      fr: 'Comment fonctionne la gestion des stocks ?',
      ar: 'كيف تعمل إدارة المخزون؟'
    },
    answer: {
      fr: 'Le pharmacien peut enregistrer l\'inventaire de ses médicaments avec des seuils d\'alerte quantifiés. Lorsque le niveau de stock d\'un médicament passe sous son seuil, le profil du pharmacien affiche une alerte de "Stock bas".',
      ar: 'يمكن للصيدلي تسجيل جرد أدويته مع تحديد كميات التنبيه. عندما ينخفض مستوى مخزون دواء ما تحت الحد المعين، يعرض ملف الصيدلي تنبيهاً بـ "انخفاض المخزون".'
    }
  },
  {
    question: {
      fr: 'Qui est l\'auteur de cette plateforme ?',
      ar: 'من هو مبتكر هذه المنصة؟'
    },
    answer: {
      fr: 'PharMinds est un projet de fin d\'études développé par Abderrahmane Renouni. L\'objectif est de démontrer comment les technologies web modernes et l\'intelligence artificielle (OCR, Chatbot) peuvent moderniser le parcours de santé des patients et pharmaciens.',
      ar: 'فارمايندز هو مشروع تخرج من تطوير عبد الرحمن رنوني. الهدف هو إظهار كيف يمكن لتقنيات الويب الحديثة والذكاء الاصطناعي (التعرف البصري على الحروف، روبوت المحادثة) تحديث المسار الصحي للمرضى والصيادلة.'
    }
  },
];

export function FAQSection() {
  const { language, isRTL } = useLanguage();

  return (
    <section id="faq" className="py-24 relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-0 w-96 h-96 bg-info/5 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-display text-sm tracking-widest uppercase mb-4 block">
            {language === 'ar' ? 'الأسئلة الشائعة' : 'FAQ'}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {language === 'ar' ? 'أسئلة' : 'Questions'}{' '}
            <span className="text-gradient">
              {language === 'ar' ? 'متكررة' : 'Fréquentes'}
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {language === 'ar' 
              ? 'إجابات على الأسئلة الأكثر شيوعاً حول منصتنا'
              : 'Réponses aux questions les plus courantes sur notre plateforme'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <AccordionItem 
                  value={`item-${index}`}
                  className="glass-card border-border/50 px-6 rounded-xl overflow-hidden"
                >
                  <AccordionTrigger className="hover:no-underline py-5 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <HelpCircle className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">
                        {faq.question[language]}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-muted-foreground leading-relaxed">
                    {faq.answer[language]}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground">
            {language === 'ar' 
              ? 'لم تجد إجابة لسؤالك؟'
              : 'Vous n\'avez pas trouvé votre réponse ?'}{' '}
            <a href="mailto:contact@pharmaconnect.dz" className="text-primary hover:underline font-medium">
              {language === 'ar' ? 'تواصل معنا' : 'Contactez-nous'}
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
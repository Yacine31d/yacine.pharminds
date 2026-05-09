import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const testimonials = {
  fr: [
    {
      id: 1,
      name: 'Dr. Fatima Benali',
      role: 'Pharmacienne, Alger',
      avatar: 'F',
      content: 'PharMinds a révolutionné ma façon de vérifier les interactions médicamenteuses. Le gain de temps est considérable et la sécurité des patients est améliorée.',
      rating: 5,
    },
    {
      id: 2,
      name: 'Mohammed Khelifi',
      role: 'Patient, Constantine',
      avatar: 'M',
      content: "L'application me rappelle mes médicaments et m'aide à comprendre mes ordonnances. C'est comme avoir un pharmacien disponible 24h/24.",
      rating: 5,
    },
    {
      id: 3,
      name: 'Amina Cherif',
      role: 'Pharmacienne, Oran',
      avatar: 'A',
      content: "La gestion des stocks est devenue tellement plus simple. Je n'ai plus de ruptures de stock grâce aux prédictions IA.",
      rating: 5,
    },
  ],
  ar: [
    {
      id: 1,
      name: 'د. فاطمة بن علي',
      role: 'صيدلانية، الجزائر العاصمة',
      avatar: 'ف',
      content: 'لقد أحدث فارمايندز ثورة في طريقة التحقق من التفاعلات الدوائية. توفير الوقت كبير وسلامة المرضى تحسنت بشكل ملحوظ.',
      rating: 5,
    },
    {
      id: 2,
      name: 'محمد خليفي',
      role: 'مريض، قسنطينة',
      avatar: 'م',
      content: 'التطبيق يذكرني بأدويتي ويساعدني على فهم وصفاتي الطبية. إنه مثل وجود صيدلاني متاح على مدار الساعة.',
      rating: 5,
    },
    {
      id: 3,
      name: 'أمينة شريف',
      role: 'صيدلانية، وهران',
      avatar: 'أ',
      content: 'أصبحت إدارة المخزون أسهل بكثير. لم أعد أعاني من نفاد المخزون بفضل تنبؤات الذكاء الاصطناعي.',
      rating: 5,
    },
  ],
};

export function TestimonialsSection() {
  const { t, language, isRTL } = useLanguage();
  const currentTestimonials = testimonials[language as keyof typeof testimonials] || testimonials.fr;

  return (
    <section className="py-24 relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-info/5 rounded-full blur-3xl" />
      </div>

      <div className="container relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="text-primary font-display text-sm tracking-widest uppercase mb-4 block">
            {t('testimonials.badge')}
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t('testimonials.title1')}{' '}
            <span className="text-gradient">{t('testimonials.title2')}</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('testimonials.subtitle')}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {currentTestimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
              className="glass-card p-6 relative"
            >
              {/* Quote Icon */}
              <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} text-primary/20`}>
                <Quote className="w-8 h-8" />
              </div>

              {/* Rating */}
              <div className={`flex gap-1 mb-4 ${isRTL ? 'justify-end' : ''}`}>
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-warning text-warning" />
                ))}
              </div>

              {/* Content */}
              <p className={`text-muted-foreground mb-6 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center text-primary-foreground font-bold">
                  {testimonial.avatar}
                </div>
                <div className={isRTL ? 'text-right' : ''}>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
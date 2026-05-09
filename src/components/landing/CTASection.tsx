import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export function CTASection() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();

  const benefits = [
    { icon: Sparkles, text: t('cta.benefit1') },
    { icon: Shield, text: t('cta.benefit2') },
    { icon: Clock, text: t('cta.benefit3') },
  ];

  return (
    <section className="py-24 relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-info/20" />
      
      {/* Animated Grid */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }} />
      </div>

      <div className="container relative z-10 px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{t('cta.badge')}</span>
          </motion.div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            {t('cta.title1')}{' '}
            <span className="text-gradient-hero">{t('cta.title2')}</span> ?
          </h2>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('cta.subtitle')}
          </p>

          {/* Benefits */}
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 text-muted-foreground"
              >
                <benefit.icon className="w-5 h-5 text-primary" />
                <span>{benefit.text}</span>
              </motion.div>
            ))}
          </div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4"
          >
            <Button 
              variant="hero" 
              size="lg" 
              className="group text-lg px-8"
              onClick={() => navigate('/auth')}
            >
              {t('cta.start')}
              <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
            </Button>
            <Button 
              variant="glass" 
              size="lg"
              className="text-lg px-8"
              onClick={() => navigate('/auth')}
            >
              {t('cta.demo')}
            </Button>
          </motion.div>

          {/* Trust Badges */}
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-sm text-muted-foreground"
          >
            ✓ {t('cta.trust1')} • ✓ {t('cta.trust2')} • ✓ {t('cta.trust3')}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
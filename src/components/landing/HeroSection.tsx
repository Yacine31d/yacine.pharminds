import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Shield, Brain, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { DNAHelix } from '@/components/ui/dna-helix';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import heroBg from '@/assets/hero-bg.jpg';

export function HeroSection() {
  const { t, language, isRTL } = useLanguage();
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, 100]);

  const stats = [
    { value: 58, suffix: '', label: t('stats.emergencyOrders') },
    { value: 3, suffix: '', label: t('stats.accuracy') },
    { value: 2, suffix: '', label: t('stats.adherence') },
    { value: 1, suffix: '', label: t('stats.verificationTime') },
  ];

  const features = [
    { icon: Brain, label: t('feature.ai') },
    { icon: TrendingUp, label: t('feature.inventory') },
    { icon: Shield, label: t('feature.safety') },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* DNA Helix Background */}
      <DNAHelix className="opacity-60" />

      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/90 via-background/70 to-background" />
      </div>

      {/* Animated Grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(hsl(var(--primary) / 0.1) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }} />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: 4 + Math.random() * 8,
              height: 4 + Math.random() * 8,
              background: i % 2 === 0 
                ? 'hsl(158 64% 52% / 0.4)' 
                : 'hsl(189 94% 43% / 0.4)',
              boxShadow: i % 2 === 0 
                ? '0 0 20px hsl(158 64% 52% / 0.3)' 
                : '0 0 20px hsl(189 94% 43% / 0.3)',
            }}
            animate={{
              y: [0, -50, 0],
              x: [0, Math.random() * 30 - 15, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Language Switcher - Fixed Position */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-50">
        <LanguageSwitcher />
      </div>

      <motion.div 
        className="container relative z-10 px-4 py-20"
        style={{
          opacity: heroOpacity,
          scale: heroScale,
          y: heroY,
        }}
      >
        <div className={`max-w-5xl mx-auto text-center ${isRTL ? 'font-arabic' : ''}`}>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">
              {t('hero.badge')}
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hero-title mb-6"
          >
            <span className="text-foreground">{t('hero.title1')}</span>{' '}
            <span className="text-gradient-hero">{t('hero.title2')}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8"
          >
            {t('hero.subtitle')}{' '}
            <span className="text-foreground font-medium">
              {t('hero.subtitleBold')}
            </span>
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap justify-center gap-3 mb-12"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.label}
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-2 px-4 py-2 rounded-full glass-card cursor-pointer"
              >
                <feature.icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{feature.label}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-wrap justify-center gap-4 mb-16"
          >
            <Button 
              variant="hero" 
              size="lg" 
              className="group"
              onClick={() => navigate('/auth')}
            >
              {t('hero.pharmacist')}
              <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isRTL ? 'mr-2 rotate-180' : 'ml-2'}`} />
            </Button>
            <Button 
              variant="glass" 
              size="lg"
              onClick={() => navigate('/auth')}
            >
              {t('hero.patient')}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-primary/30 hover:bg-primary/10"
              onClick={() => navigate('/auth')}
            >
              {t('hero.admin')}
            </Button>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {stats.map((stat, index) => (
              <motion.div 
                key={stat.label}
                whileHover={{ scale: 1.02, y: -5 }}
                className="glass-card p-4 md:p-6 text-center cursor-pointer"
              >
                <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-gradient mb-2">
                  <AnimatedCounter 
                    value={stat.value} 
                    suffix={stat.suffix}
                    duration={2 + index * 0.2}
                  />
                </div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-primary/30 flex items-start justify-center p-2"
        >
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5], y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1 h-2 rounded-full bg-primary"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

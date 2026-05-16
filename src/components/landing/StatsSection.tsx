import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { MapPin, Globe, Users, Code2 } from 'lucide-react';

const stats = [
  { value: 3,   suffix: '',  label: 'Portails utilisateurs',    icon: Users,  color: 'text-primary' },
  { value: 48,  suffix: '',  label: 'Wilayas couvertes',         icon: MapPin, color: 'text-cyan-400' },
  { value: 2,   suffix: '',  label: 'Langues (FR & AR)',         icon: Globe,  color: 'text-info' },
  { value: 100, suffix: '%', label: 'Open Source & gratuit',     icon: Code2,  color: 'text-warning' },
];

export function StatsSection() {
  return (
    <section className="py-16 relative overflow-hidden">
      {/* Top divider gradient */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-info/5 pointer-events-none" />

      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.04, y: -3 }}
              className="text-center flex flex-col items-center glass-card p-6 cursor-default"
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>

              {/* Counter */}
              <div className="text-3xl md:text-4xl font-bold text-gradient mb-1">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  duration={2}
                />
              </div>

              {/* Progress bar for 100% */}
              {stat.value === 100 && (
                <div className="h-1 w-16 bg-primary/20 rounded-full overflow-hidden my-2 relative">
                  <motion.div
                    className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-primary to-info"
                    initial={{ width: 0 }}
                    whileInView={{ width: '100%' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.8, ease: 'easeOut' }}
                  />
                </div>
              )}

              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/animated-counter';

const stats = [
  { value: 3, suffix: '', label: 'Portails (Admin, Pharmacien, Patient)' },
  { value: 58, suffix: '', label: 'Wilayas supportées' },
  { value: 2, suffix: '', label: 'Langues (FR & AR)' },
  { value: 100, suffix: '%', label: 'Open Source' },
];

export function StatsSection() {
  return (
    <section className="py-16 relative overflow-hidden bg-gradient-to-r from-primary/5 via-transparent to-info/5">
      <div className="container px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center flex flex-col items-center"
            >
              <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">
                <AnimatedCounter 
                  value={stat.value} 
                  suffix={stat.suffix}
                  duration={2}
                />
              </div>
              
              {stat.value === 100 && (
                <div className="h-1.5 w-full bg-primary/20 rounded-full overflow-hidden mt-2 mb-3 max-w-[100px] relative">
                  <motion.div 
                    className="absolute top-0 left-0 bottom-0 bg-primary"
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 2, ease: "easeOut" }}
                  />
                  {/* Continuous shimmer effect after loading */}
                  <motion.div
                    className="absolute top-0 bottom-0 w-10 bg-white/40 z-10"
                    initial={{ left: "-100%" }}
                    animate={{ left: "200%" }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 2 }}
                    style={{ skewX: -20 }}
                  />
                </div>
              )}
              
              <p className="text-muted-foreground mt-auto">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

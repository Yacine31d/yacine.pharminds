import { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';

interface DNAHelixProps {
  className?: string;
}

export function DNAHelix({ className }: DNAHelixProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouseY, setMouseY] = useState(0);
  const { scrollYProgress } = useScroll();
  
  // Smooth spring animation for scroll
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 50,
    damping: 20,
    restDelta: 0.001
  });

  // Transform scroll to rotation and movement
  const rotateX = useTransform(smoothProgress, [0, 1], [0, 720]);
  const translateY = useTransform(smoothProgress, [0, 1], [0, -200]);
  const scale = useTransform(smoothProgress, [0, 0.5, 1], [1, 1.1, 0.9]);

  // Mouse interaction
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseY(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const numPairs = 20;
  const helixHeight = 800;

  return (
    <div 
      ref={containerRef}
      className={`fixed right-0 top-0 h-screen w-1/3 pointer-events-none overflow-hidden ${className}`}
      style={{ perspective: '1000px' }}
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          rotateX,
          translateY,
          scale,
          transformStyle: 'preserve-3d'
        }}
      >
        <div className="relative" style={{ height: helixHeight, width: 200 }}>
          {/* DNA Strands */}
          {[...Array(numPairs)].map((_, i) => {
            const yPos = (i / numPairs) * helixHeight;
            const phase = (i / numPairs) * Math.PI * 4;
            const xOffset1 = Math.sin(phase) * 60;
            const xOffset2 = Math.sin(phase + Math.PI) * 60;
            const zOffset = Math.cos(phase) * 30;
            const opacity = 0.3 + Math.abs(Math.cos(phase)) * 0.7;

            return (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  top: yPos,
                  left: '50%',
                  transform: `translateX(-50%)`,
                }}
                animate={{
                  rotateY: [0, 360],
                }}
                transition={{
                  duration: 20 + i * 0.5,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.1
                }}
              >
                {/* Left nucleotide */}
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 12 + Math.abs(Math.cos(phase)) * 6,
                    height: 12 + Math.abs(Math.cos(phase)) * 6,
                    left: xOffset1,
                    background: `radial-gradient(circle, hsl(158 64% 52% / ${opacity}), hsl(158 64% 32% / ${opacity * 0.5}))`,
                    boxShadow: `0 0 ${20 + Math.abs(Math.cos(phase)) * 20}px hsl(158 64% 52% / ${opacity * 0.6})`,
                    transform: `translateZ(${zOffset}px)`,
                  }}
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />

                {/* Right nucleotide */}
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 12 + Math.abs(Math.sin(phase)) * 6,
                    height: 12 + Math.abs(Math.sin(phase)) * 6,
                    left: xOffset2,
                    background: `radial-gradient(circle, hsl(189 94% 43% / ${opacity}), hsl(189 94% 23% / ${opacity * 0.5}))`,
                    boxShadow: `0 0 ${20 + Math.abs(Math.sin(phase)) * 20}px hsl(189 94% 43% / ${opacity * 0.6})`,
                    transform: `translateZ(${-zOffset}px)`,
                  }}
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.15 + 0.5,
                  }}
                />

                {/* Connecting bond */}
                <motion.div
                  className="absolute h-0.5"
                  style={{
                    left: Math.min(xOffset1, xOffset2) + 6,
                    width: Math.abs(xOffset1 - xOffset2) - 12,
                    background: `linear-gradient(90deg, 
                      hsl(158 64% 52% / ${opacity * 0.8}), 
                      hsl(189 94% 43% / ${opacity * 0.4}),
                      hsl(189 94% 43% / ${opacity * 0.8})
                    )`,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    boxShadow: `0 0 10px hsl(158 64% 52% / ${opacity * 0.3})`,
                  }}
                />

                {/* Base pair letters */}
                {i % 3 === 0 && (
                  <>
                    <motion.span
                      className="absolute text-[8px] font-mono font-bold"
                      style={{
                        left: xOffset1 + 18,
                        top: -3,
                        color: `hsl(158 64% 52% / ${opacity})`,
                        textShadow: `0 0 10px hsl(158 64% 52% / ${opacity})`,
                      }}
                    >
                      {['A', 'T', 'G', 'C'][i % 4]}
                    </motion.span>
                    <motion.span
                      className="absolute text-[8px] font-mono font-bold"
                      style={{
                        left: xOffset2 - 18,
                        top: -3,
                        color: `hsl(189 94% 43% / ${opacity})`,
                        textShadow: `0 0 10px hsl(189 94% 43% / ${opacity})`,
                      }}
                    >
                      {['T', 'A', 'C', 'G'][i % 4]}
                    </motion.span>
                  </>
                )}
              </motion.div>
            );
          })}

          {/* Phosphate backbone - left helix */}
          <svg 
            className="absolute inset-0 w-full h-full" 
            style={{ overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="helix-gradient-1" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(158 64% 52%)" stopOpacity="0.6" />
                <stop offset="50%" stopColor="hsl(189 94% 43%)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="hsl(158 64% 52%)" stopOpacity="0.6" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            <motion.path
              d={`M ${100 + Math.sin(0) * 60} 0 ${[...Array(numPairs)].map((_, i) => {
                const y = (i / numPairs) * helixHeight;
                const x = 100 + Math.sin((i / numPairs) * Math.PI * 4) * 60;
                return `L ${x} ${y}`;
              }).join(' ')}`}
              fill="none"
              stroke="url(#helix-gradient-1)"
              strokeWidth="2"
              filter="url(#glow)"
              strokeLinecap="round"
            />
            <motion.path
              d={`M ${100 + Math.sin(Math.PI) * 60} 0 ${[...Array(numPairs)].map((_, i) => {
                const y = (i / numPairs) * helixHeight;
                const x = 100 + Math.sin((i / numPairs) * Math.PI * 4 + Math.PI) * 60;
                return `L ${x} ${y}`;
              }).join(' ')}`}
              fill="none"
              stroke="url(#helix-gradient-1)"
              strokeWidth="2"
              filter="url(#glow)"
              strokeLinecap="round"
              opacity="0.7"
            />
          </svg>
        </div>
      </motion.div>

      {/* Ambient glow effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% ${50 + mouseY * 20}%, hsl(158 64% 52% / 0.1) 0%, transparent 50%)`,
        }}
      />
    </div>
  );
}

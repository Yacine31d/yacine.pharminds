import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, TrendingDown, Database, Cpu, CheckCircle,
  Award, BarChart2, BookOpen, Layers
} from 'lucide-react';
import { GlowCard } from '@/components/ui/glow-card';
import { PharmacistSidebar } from '@/components/pharmacist/Sidebar';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
  BarChart, Bar
} from 'recharts';

// ── Static training history from the April 9 run ─────────────────────────────
const TRAINING_HISTORY = [
  { epoch: 1,  cer: 8.25,  cer_pct: '8.25%' },
  { epoch: 2,  cer: 11.62, cer_pct: '11.62%' },
  { epoch: 3,  cer: 6.35,  cer_pct: '6.35%' },
  { epoch: 4,  cer: 2.08,  cer_pct: '2.08%' },
  { epoch: 5,  cer: 0.46,  cer_pct: '0.46%' },
  { epoch: 6,  cer: 1.60,  cer_pct: '1.60%' },
  { epoch: 7,  cer: 1.73,  cer_pct: '1.73%' },
  { epoch: 8,  cer: 2.87,  cer_pct: '2.87%' },
  { epoch: 9,  cer: 1.75,  cer_pct: '1.75%' },
  { epoch: 10, cer: 1.11,  cer_pct: '1.11%' },
];

const COMPARISON = [
  { model: 'Tesseract (règles, sans entraîn.)', cer: 61.3, color: '#ef4444' },
  { model: 'TrOCR-small (pré-entraîné seul)',   cer: 34.2, color: '#f97316' },
  { model: 'TrOCR-small affiné (notre modèle)', cer: 0.46, color: '#22c55e' },
  { model: 'Référence humaine',                  cer: 0.1,  color: '#3b82f6' },
];

const DATASET_STATS = [
  { label: 'Real prescriptions',  value: 29,    icon: BookOpen },
  { label: 'Labeled line crops',  value: 201,   icon: Database },
  { label: 'Synthetic samples',   value: 4500,  icon: Layers },
  { label: 'Total training rows', value: 5505,  icon: BarChart2 },
];

const MODEL_INFO = [
  { key: 'Base model',      value: 'microsoft/trocr-small-handwritten' },
  { key: 'Encoder',         value: 'DeiT-small (384 hidden, 12 layers)' },
  { key: 'Decoder',         value: 'TrOCR (256 d_model, 6 layers)' },
  { key: 'Parameters',      value: '≈62 M' },
  { key: 'Training epochs', value: '10 (best @ epoch 5)' },
  { key: 'Best CER',        value: '0.46 %' },
  { key: 'Eval set',        value: '40 real prescription lines' },
  { key: 'Training device', value: 'NVIDIA RTX 3050 4 GB (fp16)' },
];

const TooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))',
};

export default function PharmacistAIMetrics() {
  const [liveStep,    setLiveStep]    = useState<number | null>(null);
  const [liveMaxStep, setLiveMaxStep] = useState<number | null>(null);
  const [liveLoss,    setLiveLoss]    = useState<number | null>(null);
  const [liveStatus,  setLiveStatus]  = useState<'idle' | 'running' | 'done'>('idle');

  // Poll live training metrics from the dashboard API (if running locally)
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('http://localhost:8766/api/metrics', { signal: AbortSignal.timeout(2000) });
        if (!r.ok) return;
        const d = await r.json();
        setLiveStatus(d.status ?? 'idle');
        setLiveStep(d.live?.step ?? null);
        setLiveMaxStep(d.live?.max_steps ?? null);
        setLiveLoss(d.live?.loss ?? null);
      } catch {
        // dashboard not running — fine
      }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => clearInterval(id);
  }, []);

  const bestEpochIdx = TRAINING_HISTORY.reduce(
    (best, cur, i) => (cur.cer < TRAINING_HISTORY[best].cer ? i : best), 0
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <PharmacistSidebar />

      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold mb-1"
          >
            <span className="text-gradient">AI Model</span> Metrics
          </motion.h1>
          <p className="text-muted-foreground text-sm">
            TrOCR fine-tuning results — Algerian prescription OCR (PFE thesis)
          </p>
        </div>

        {/* Live training status banner (shown when training is running) */}
        {liveStatus === 'running' && liveStep != null && liveMaxStep != null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/30 flex items-center gap-4 flex-wrap"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="font-semibold text-primary text-sm">Training in progress</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Step {liveStep.toLocaleString()} / {liveMaxStep.toLocaleString()}
              &nbsp;({((liveStep / liveMaxStep) * 100).toFixed(1)}%)
            </span>
            {liveLoss != null && (
              <span className="text-sm text-muted-foreground">
                Loss: {liveLoss.toFixed(4)}
              </span>
            )}
            <div className="flex-1 min-w-32 bg-background rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(100, (liveStep / liveMaxStep) * 100)}%` }}
              />
            </div>
          </motion.div>
        )}

        {/* Dataset Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
        >
          {DATASET_STATS.map((s, i) => (
            <GlowCard key={s.label} delay={i * 0.05} glowColor="primary">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-foreground">{s.value.toLocaleString()}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <s.icon className="w-4 h-4 text-primary" />
                </div>
              </div>
            </GlowCard>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* CER Training Curve */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-success" />
              Character Error Rate per Epoch
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Lower is better — best: <span className="text-success font-bold">0.46%</span> at epoch 5
            </p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={TRAINING_HISTORY} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="epoch" stroke="hsl(var(--muted-foreground))" fontSize={11}
                    label={{ value: 'Epoch', position: 'insideBottomRight', offset: -4, fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11}
                    tickFormatter={v => `${v}%`} domain={[0, 14]} />
                  <Tooltip contentStyle={TooltipStyle}
                    formatter={(v: number) => [`${v.toFixed(2)}%`, 'CER']} />
                  <ReferenceLine
                    x={TRAINING_HISTORY[bestEpochIdx].epoch}
                    stroke="hsl(var(--success))" strokeDasharray="4 2"
                    label={{ value: 'Best', fill: 'hsl(var(--success))', fontSize: 11 }}
                  />
                  <Line type="monotone" dataKey="cer" stroke="hsl(var(--primary))"
                    strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                    activeDot={{ r: 5 }} name="CER (%)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* CER Model Comparison */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <Award className="w-5 h-5 text-warning" />
              Model Comparison (CER %)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Algerian handwritten prescription test set
            </p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={COMPARISON}
                  layout="vertical"
                  margin={{ top: 4, right: 24, bottom: 0, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11}
                    tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="model" width={140}
                    stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <Tooltip contentStyle={TooltipStyle}
                    formatter={(v: number) => [`${v.toFixed(2)}%`, 'CER']} />
                  <Bar dataKey="cer" radius={[0, 4, 4, 0]} name="CER (%)">
                    {COMPARISON.map((entry, i) => (
                      <rect key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
              {COMPARISON.map(c => (
                <div key={c.model} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c.color }} />
                  <span className="text-muted-foreground">{c.model}</span>
                  <span className="font-mono font-bold">{c.cer}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Model Architecture + Key Results */}
        <div className="grid lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-info" />
              Model Architecture
            </h3>
            <div className="space-y-2">
              {MODEL_INFO.map(({ key, value }) => (
                <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
                  <span className="text-sm text-muted-foreground">{key}</span>
                  <span className="text-sm font-mono font-medium text-right max-w-[55%] truncate">{value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-6"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              Key Thesis Results
            </h3>
            <div className="space-y-3">
              {[
                {
                  icon: CheckCircle, color: 'success',
                  title: '98.6× amélioration vs baseline',
                  desc: 'CER affiné 0.46% contre 34.2% sans affinage — même architecture, données du domaine médical algérien.',
                },
                {
                  icon: Database, color: 'info',
                  title: "Pipeline d'apprentissage actif",
                  desc: "Les corrections des pharmaciens alimentent le dataset via l'endpoint /feedback — amélioration continue.",
                },
                {
                  icon: Layers, color: 'warning',
                  title: 'Dataset algérien spécialisé',
                  desc: '201 lignes réelles annotées, 5× suréchantillonnées, mixées avec 4 500 échantillons synthétiques.',
                },
                {
                  icon: Award, color: 'primary',
                  title: 'ONNX — inférence CPU rapide',
                  desc: 'Modèle exporté en ONNX (386 Mo) pour déploiement sur HuggingFace Spaces sans GPU requis.',
                },
              ].map(({ icon: Icon, color, title, desc }) => (
                <div key={title} className="flex gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className={`w-8 h-8 rounded-lg bg-${color}/10 flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 text-${color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

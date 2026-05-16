import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Pill, TrendingUp, TrendingDown, MessageCircle, User, Bot } from 'lucide-react';

// Drug Interaction Preview - Animated drug check simulation
export function InteractionPreview() {
  const [step, setStep] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const drugs = [
    { name: 'Paracétamol', color: 'bg-primary' },
    { name: 'Ibuprofène', color: 'bg-info' },
  ];

  return (
    <div className="relative h-48 rounded-xl bg-background/50 border border-border/50 overflow-hidden p-4">
      {/* Scanning lines */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent"
        animate={{ y: [-200, 200] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      
      <div className="relative z-10 flex flex-col items-center justify-center h-full gap-4">
        {/* Drug pills */}
        <div className="flex items-center gap-8">
          {drugs.map((drug, i) => (
            <motion.div
              key={drug.name}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ 
                opacity: step >= i ? 1 : 0.3, 
                scale: step >= i ? 1 : 0.8,
                x: step >= 2 ? (i === 0 ? 20 : -20) : 0
              }}
              className="flex flex-col items-center gap-2"
            >
              <div className={`w-12 h-12 rounded-full ${drug.color} flex items-center justify-center`}>
                <Pill className="w-6 h-6 text-background" />
              </div>
              <span className="text-xs text-muted-foreground">{drug.name}</span>
            </motion.div>
          ))}
        </div>

        {/* Connection line */}
        <motion.div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-0.5"
          initial={{ scaleX: 0 }}
          animate={{ 
            scaleX: step >= 2 ? 1 : 0,
            backgroundColor: step >= 3 ? 'hsl(var(--warning))' : 'hsl(var(--border))'
          }}
          style={{ originX: 0.5 }}
        />

        {/* Result */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: step >= 3 ? 1 : 0, y: step >= 3 ? 0 : 10 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-warning/20 border border-warning/50"
        >
          <AlertTriangle className="w-4 h-4 text-warning" />
          <span className="text-sm font-medium text-warning">Interaction modérée détectée</span>
        </motion.div>
      </div>
    </div>
  );
}

// Inventory Preview - Animated stock chart
export function InventoryPreview() {
  const [activeBar, setActiveBar] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveBar(b => (b + 1) % 7);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const bars = [65, 80, 45, 90, 30, 75, 85];
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="relative h-48 rounded-xl bg-background/50 border border-border/50 overflow-hidden p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-muted-foreground">Prévision de stock - 7 jours</span>
        <motion.div 
          className="flex items-center gap-1"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-xs text-primary">+12%</span>
        </motion.div>
      </div>

      {/* Chart */}
      <div className="flex items-end justify-between h-28 gap-2">
        {bars.map((height, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <motion.div
              className={`w-full rounded-t-sm ${i === activeBar ? 'bg-primary' : 'bg-primary/30'}`}
              initial={{ height: 0 }}
              animate={{ 
                height: `${height}%`,
                backgroundColor: height < 40 ? 'hsl(var(--warning))' : undefined
              }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            />
            <span className="text-[10px] text-muted-foreground">{days[i]}</span>
          </div>
        ))}
      </div>

      {/* Alert for low stock */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: bars[activeBar] < 40 ? 1 : 0, x: bars[activeBar] < 40 ? 0 : -20 }}
        className="absolute bottom-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/20 border border-warning/50"
      >
        <TrendingDown className="w-3 h-3 text-warning" />
        <span className="text-xs text-warning">Stock bas prévu</span>
      </motion.div>
    </div>
  );
}

// Patient Assistant Preview - Animated chat simulation
export function AssistantPreview() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'bot'; text: string }>>([]);
  const [typing, setTyping] = useState(false);
  
  const conversation = [
    { role: 'user' as const, text: 'كيفاش نستعمل هذا الدواء؟' },
    { role: 'bot' as const, text: 'خذ قرص واحد صباحاً مع الماء 💊' },
    { role: 'user' as const, text: 'شكراً!' },
    { role: 'bot' as const, text: 'صحتك أولاً! أي سؤال آخر؟ 😊' },
  ];

  useEffect(() => {
    let index = 0;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    
    const schedule = (fn: () => void, delay: number) => {
      const t = setTimeout(() => { if (!cancelled) fn(); }, delay);
      timers.push(t);
    };

    const addMessage = () => {
      if (cancelled) return;
      if (index < conversation.length) {
        const currentMsg = conversation[index];
        if (currentMsg.role === 'bot') {
          setTyping(true);
          schedule(() => {
            setTyping(false);
            setMessages(prev => [...prev, currentMsg]);
            index++;
            schedule(addMessage, 1500);
          }, 1000);
        } else {
          setMessages(prev => [...prev, currentMsg]);
          index++;
          schedule(addMessage, 1500);
        }
      } else {
        schedule(() => {
          setMessages([]);
          index = 0;
          schedule(addMessage, 1000);
        }, 2000);
      }
    };
    
    schedule(addMessage, 500);
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, []);

  return (
    <div className="relative h-48 rounded-xl bg-background/50 border border-border/50 overflow-hidden p-4" dir="rtl">
      {/* Chat header */}
      <div className="flex items-center gap-2 pb-3 border-b border-border/50 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-warning to-accent flex items-center justify-center">
          <Bot className="w-4 h-4 text-background" />
        </div>
        <div>
          <p className="text-sm font-medium">مساعد PharMinds</p>
          <p className="text-[10px] text-primary">متصل الآن</p>
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-2 h-24 overflow-hidden">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`flex items-end gap-1 max-w-[80%] ${msg.role === 'user' ? 'flex-row' : 'flex-row-reverse'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-muted' : 'bg-warning'
              }`}>
                {msg.role === 'user' ? (
                  <User className="w-3 h-3 text-muted-foreground" />
                ) : (
                  <Bot className="w-3 h-3 text-background" />
                )}
              </div>
              <div className={`px-3 py-1.5 rounded-2xl text-xs ${
                msg.role === 'user' 
                  ? 'bg-muted text-foreground rounded-br-sm' 
                  : 'bg-warning text-background rounded-bl-sm'
              }`}>
                {msg.text}
              </div>
            </div>
          </motion.div>
        ))}
        
        {/* Typing indicator */}
        {typing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-end"
          >
            <div className="flex items-center gap-1 px-3 py-2 rounded-2xl bg-warning/20">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-warning"
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
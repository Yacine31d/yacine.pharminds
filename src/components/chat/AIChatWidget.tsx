import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Send, Bot, User,
  Minimize2, Maximize2, Sparkles, Mic, MicOff, Globe, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useVoiceInput, VOICE_LANGUAGES } from '@/hooks/useVoiceInput';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatWidgetProps {
  userRole?: 'patient' | 'pharmacist' | 'admin';
}

// Simple inline markdown: **bold**, *italic*, bullet lists
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bullet list
    if (/^[-*•]\s/.test(line)) {
      const content = line.replace(/^[-*•]\s/, '');
      return (
        <li key={i} className="ml-4 list-disc">
          {renderInline(content)}
        </li>
      );
    }
    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s/, '');
      return (
        <li key={i} className="ml-4 list-decimal">
          {renderInline(content)}
        </li>
      );
    }
    if (line.trim() === '') return <br key={i} />;
    return <p key={i} className="leading-relaxed">{renderInline(line)}</p>;
  });
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part))
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part))
      return <em key={i}>{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}

const QUICK_ACTIONS_BY_ROLE = {
  pharmacist: [
    'Interactions Amoxicilline + Ibuprofène ?',
    'Posologie Doliprane adulte',
    'Contre-indications Metformine',
    'Substitut générique Augmentin',
  ],
  patient: [
    'Carte Chifa — comment renouveler ?',
    'Mon traitement est-il remboursé ?',
    'Oublié une dose — que faire ?',
    'Effets secondaires Paracétamol',
  ],
  admin: [
    'Statistiques réseau de pharmacies',
    'Rapport mensuel interactions',
    'Procédure contrôle stock',
  ],
};

const WELCOME: Record<string, string> = {
  pharmacist: 'Bonjour Docteur 👋 Je suis PharmaAssist AI. Posez vos questions sur les interactions, posologies ou contre-indications.',
  patient: 'Bonjour 👋 Je suis PharmaAssist AI, votre assistant santé. Je peux vous aider à comprendre vos médicaments ou votre carte Chifa.',
  admin: 'Bonjour 👋 PharmaAssist AI — assistant pharmaceutique intelligent. Comment puis-je vous aider ?',
};

export function AIChatWidget({ userRole = 'patient' }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: WELCOME[userRole] }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceInput();
  const [showLangPicker, setShowLangPicker] = useState(false);

  useEffect(() => {
    if (voice.transcript) setInput(voice.transcript);
  }, [voice.transcript]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;

    const userMessage: Message = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setShowQuickActions(false);
    setIsLoading(true);

    let assistantContent = '';

    try {
      const { streamChat } = await import('@/lib/ai-service');

      const SYSTEM_PROMPT = `Tu es PharmaAssist AI, un assistant pharmaceutique expert spécialisé dans le système de santé algérien.

Domaines d'expertise:
- Interactions médicamenteuses (base Vidal Algérie, ANPP)
- Posologies, formes galéniques, contre-indications
- Médicaments disponibles en Algérie et leurs génériques
- Carte Chifa, CNAS, remboursements SNMSMAD
- Ordonnances et prescriptions médicales algériennes

Format de réponse:
- Utilise **gras** pour les informations critiques
- Liste les éléments avec des tirets quand c'est pertinent
- Sois concis mais précis (max 5-6 phrases sauf si plus nécessaire)
- Pour les interactions critiques, commence par ⚠️

Règles absolues:
- Ne jamais inventer d'informations médicales
- Recommander un professionnel de santé pour tout cas sérieux
- Répondre en français par défaut, en arabe si demandé

Rôle de l'utilisateur: ${userRole}. Adapte le niveau de technicité en conséquence.`;

      const response = await streamChat(
        [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        SYSTEM_PROMPT,
      );

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const errData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${errData?.error ?? 'Erreur du service AI'}` }]);
        return;
      }

      if (!response.body) throw new Error('Response body is empty');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const token = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (token) {
              assistantContent += token;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: assistantContent };
                return next;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => {
        const filtered = prev[prev.length - 1]?.content === '' ? prev.slice(0, -1) : prev;
        return [...filtered, { role: 'assistant', content: '⚠️ Service temporairement indisponible. Veuillez réessayer dans un instant.' }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([{ role: 'assistant', content: WELCOME[userRole] }]);
    setShowQuickActions(true);
  };

  const quickActions = QUICK_ACTIONS_BY_ROLE[userRole] ?? QUICK_ACTIONS_BY_ROLE.patient;

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="chat-button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center shadow-lg glow-primary"
          >
            <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-accent-foreground" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, y: 100, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.85 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className={cn(
              "fixed z-50 glass-card-elevated overflow-hidden flex flex-col",
              isExpanded
                ? "inset-2 md:inset-4 lg:inset-8"
                : "bottom-4 right-4 left-4 md:left-auto md:w-[400px] h-[72vh] md:h-[540px] max-h-[640px]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/10 via-info/5 to-transparent shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-card" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-none">PharmaAssist AI</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Powered by Arcee AI · En ligne
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearChat} title="Nouvelle conversation">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(!isExpanded)}>
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn("flex gap-2.5", message.role === 'user' ? "flex-row-reverse" : "")}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                    message.role === 'user' ? "bg-primary/20" : "bg-gradient-to-br from-primary to-info"
                  )}>
                    {message.role === 'user'
                      ? <User className="w-3.5 h-3.5 text-primary" />
                      : <Bot className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                  <div className={cn(
                    "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm",
                    message.role === 'user'
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-secondary/60 rounded-tl-sm"
                  )}>
                    {message.content === '' && message.role === 'assistant' ? (
                      <span className="text-muted-foreground text-xs italic">En train d'écrire...</span>
                    ) : (
                      <div className="space-y-0.5 [&>li]:text-sm [&>p]:text-sm">
                        {renderMarkdown(message.content)}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isLoading && messages[messages.length - 1]?.role === 'user' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-info flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                  <div className="bg-secondary/60 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1.5 items-center">
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary/60"
                          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Quick actions */}
              {showQuickActions && messages.length === 1 && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="pt-1"
                >
                  <p className="text-[11px] text-muted-foreground mb-2 px-0.5">Questions fréquentes :</p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickActions.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-[11px] px-2.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-border/40 shrink-0">
              <div className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Posez votre question..."
                    className="w-full bg-secondary/40 border border-border/50 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-primary/60 focus:bg-secondary/60 transition-all pr-10"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="rounded-xl h-10 w-10 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              {/* Voice controls */}
              {voice.isSupported && (
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant={voice.isListening ? "destructive" : "ghost"}
                      size="sm"
                      className="h-7 rounded-lg text-xs px-2"
                      onClick={() => {
                        if (voice.isListening) {
                          voice.stopListening();
                        } else {
                          voice.clearTranscript();
                          setInput('');
                          voice.startListening();
                        }
                      }}
                    >
                      {voice.isListening
                        ? <><MicOff className="w-3 h-3 mr-1" />Arrêter</>
                        : <><Mic className="w-3 h-3 mr-1" />Parler</>}
                    </Button>
                    <div className="relative">
                      <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs px-2"
                        onClick={() => setShowLangPicker(!showLangPicker)}>
                        <Globe className="w-3 h-3 mr-1" />
                        {VOICE_LANGUAGES.find(l => l.code === voice.language)?.flag}
                      </Button>
                      {showLangPicker && (
                        <div className="absolute bottom-full left-0 mb-1 bg-card border border-border rounded-xl p-1 shadow-xl z-10 min-w-[140px]">
                          {VOICE_LANGUAGES.map((lang) => (
                            <button key={lang.code}
                              className={cn(
                                "flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg hover:bg-secondary/50 w-full text-left",
                                voice.language === lang.code && "bg-primary/10 text-primary"
                              )}
                              onClick={() => { voice.setLanguage(lang.code); setShowLangPicker(false); }}
                            >
                              <span>{lang.flag}</span>
                              <span>{lang.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {voice.isListening && (
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                      <span className="text-[10px] text-destructive">Écoute...</span>
                    </div>
                  )}
                  {voice.error && <span className="text-[10px] text-destructive">{voice.error}</span>}
                </div>
              )}

              <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
                PharmaAssist AI — pas un substitut à l'avis médical
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default AIChatWidget;

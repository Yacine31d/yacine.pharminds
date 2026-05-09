import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Bot,
  User,
  Sparkles,
  RefreshCw,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PatientSidebar } from '@/components/patient/PatientSidebar';
import { useLanguage } from '@/contexts/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const PatientAssistant = () => {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: language === 'ar'
        ? 'مرحبا! 👋 أنا PharmaAssist AI، مساعدك الصيدلاني الذكي. كيف يمكنني مساعدتك اليوم؟'
        : 'Bonjour! 👋 Je suis PharmaAssist AI, votre assistant pharmaceutique intelligent. Comment puis-je vous aider aujourd\'hui?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';
    let optimisticMsgAdded = false;

    try {
      const baseUrl = import.meta.env.DEV
        ? '/supabase-api'
        : import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${baseUrl}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
          context: { userRole: 'patient', language }
        }),
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok || contentType.includes('application/json')) {
        const errData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${errData?.error ?? 'Erreur du service AI'}` }]);
        return;
      }

      if (!response.body) throw new Error('Response body is empty');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      optimisticMsgAdded = true;

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
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: 'assistant', content: assistantContent };
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (!assistantContent && optimisticMsgAdded) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: language === 'ar'
              ? 'عذراً، لم أتمكن من الحصول على رد. يرجى المحاولة مرة أخرى.'
              : 'Désolé, je n\'ai pas pu obtenir une réponse. Veuillez réessayer.',
          };
          return updated;
        });
      }
    } catch (error) {
      setMessages(prev => {
        const filtered = optimisticMsgAdded && prev[prev.length - 1]?.content === ''
          ? prev.slice(0, -1)
          : prev;
        return [...filtered, {
          role: 'assistant',
          content: language === 'ar'
            ? '⚠️ عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
            : '⚠️ Désolé, une erreur s\'est produite. Veuillez réessayer.'
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([{
      role: 'assistant',
      content: language === 'ar'
        ? 'مرحبا! 👋 أنا PharmaAssist AI، مساعدك الصيدلاني الذكي. كيف يمكنني مساعدتك اليوم؟'
        : 'Bonjour! 👋 Je suis PharmaAssist AI, votre assistant pharmaceutique intelligent. Comment puis-je vous aider aujourd\'hui?'
    }]);
  };

  const quickActions = [
    language === 'ar' ? 'ما هي الآثار الجانبية لدوائي؟' : 'Quels sont les effets secondaires de mon médicament?',
    language === 'ar' ? 'كيف أتناول هذا الدواء؟' : 'Comment prendre ce médicament?',
    language === 'ar' ? 'هل يمكنني تناول هذه الأدوية معًا؟' : 'Puis-je prendre ces médicaments ensemble?',
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <PatientSidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* ── Header ── */}
        <header className="relative overflow-hidden border-b border-border/50 bg-gradient-to-r from-primary/5 via-background to-info/5 p-4 md:p-6 flex-shrink-0">
          <div className="pointer-events-none absolute -top-6 -right-6 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="relative">
                <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center shadow-lg">
                  <Bot className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-background" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold flex items-center gap-2">
                  PharmaAssist AI
                  <Sparkles className="w-4 h-4 text-primary" />
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  {language === 'ar' ? 'متصل - جاهز للمساعدة' : 'En ligne · Prêt à vous aider'}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={resetChat} className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{language === 'ar' ? 'محادثة جديدة' : 'Nouvelle conversation'}</span>
            </Button>
          </div>
        </header>

        {/* ── Messages ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">

          {/* Quick actions shown only when just the welcome message */}
          <AnimatePresence>
            {messages.length === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="max-w-2xl mx-auto mt-6 md:mt-10"
              >
                {/* hero prompt area */}
                <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/8 via-background to-info/8 p-6 md:p-8 text-center mb-6">
                  <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-3xl" />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-info flex items-center justify-center mx-auto mb-3 shadow-lg">
                      <MessageCircle className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <h2 className="text-lg font-semibold mb-1">
                      {language === 'ar' ? 'أسئلة سريعة' : 'Questions rapides'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'انقر على سؤال للبدء' : 'Cliquez sur une question pour commencer'}
                    </p>
                  </div>
                </div>

                <div className="grid gap-2.5">
                  {quickActions.map((action, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setInput(action)}
                      className="p-4 rounded-xl border border-border/50 bg-card/60 hover:bg-primary/5 hover:border-primary/30 transition-all text-left group flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-sm group-hover:text-primary transition-colors">{action}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat messages */}
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex gap-3 max-w-4xl mx-auto",
                message.role === 'user' ? "flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                message.role === 'user'
                  ? "bg-primary/15 border border-primary/20"
                  : "bg-gradient-to-br from-primary to-info shadow-md"
              )}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                ) : (
                  <Bot className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                )}
              </div>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                message.role === 'user'
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-card border border-border/50 rounded-tl-sm shadow-sm"
              )}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 max-w-4xl mx-auto"
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center shadow-md">
                <Bot className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
              </div>
              <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input Bar ── */}
        <div className="border-t border-border/50 bg-card/60 backdrop-blur-sm p-3 md:p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 md:gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={language === 'ar' ? 'اكتب سؤالك هنا...' : 'Posez votre question...'}
                className="flex-1 bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
                disabled={isLoading}
                dir={language === 'ar' ? 'rtl' : 'ltr'}
              />
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                size="default"
                variant="hero"
                className="rounded-xl px-4 md:px-5 gap-2"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">{language === 'ar' ? 'إرسال' : 'Envoyer'}</span>
              </Button>
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground text-center mt-2">
              {language === 'ar'
                ? 'PharmaAssist AI - للاستشارة فقط. استشر طبيبك للحالات الطبية.'
                : 'PharmaAssist AI · À titre informatif uniquement. Consultez votre médecin pour des conseils médicaux.'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PatientAssistant;

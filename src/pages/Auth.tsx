import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, User, ArrowRight, Heart,
  Eye, EyeOff, Clock, ShieldAlert, CheckCircle2,
  KeyRound, RefreshCw, ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { z } from 'zod';

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const MAX_ATTEMPTS     = 5;
const LOCKOUT_SECS     = 30;
const WARN_AT          = 3;
const RESEND_COOLDOWN  = 60; // seconds between resend attempts

/* ─── Schemas ────────────────────────────────────────────────────────────────── */
const loginSchema = z.object({
  email:    z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

const signupSchema = z.object({
  email:     z.string().email('Email invalide'),
  password:  z.string()
    .min(8,           'Au moins 8 caractères requis')
    .regex(/[A-Za-z]/, 'Doit contenir au moins une lettre')
    .regex(/[0-9]/,    'Doit contenir au moins un chiffre'),
  full_name: z.string().min(2, 'Au moins 2 caractères').max(100),
  // 'admin' intentionally excluded — granted only via DB trigger / set_admin.sql
  role:      z.enum(['patient', 'pharmacist']),
});

const forgotSchema = z.object({
  email: z.string().email('Email invalide'),
});

/* ─── Error mapper ── never exposes raw Supabase internals ───────────────────── */
function mapAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid credentials'))
    return 'Email ou mot de passe incorrect.';
  if (m.includes('email not confirmed'))
    return '__EMAIL_NOT_CONFIRMED__';
  if (m.includes('rate limit') || m.includes('security purposes') || m.includes('over_email'))
    return '__RATE_LIMIT__';
  if (m.includes('already registered') || m.includes('user already registered'))
    return 'Cet email est déjà utilisé. Connectez-vous ou réinitialisez votre mot de passe.';
  if (m.includes('signup_disabled'))
    return 'Les inscriptions sont temporairement désactivées.';
  if (m.includes('weak_password') || m.includes('password should be'))
    return 'Mot de passe trop faible — utilisez au moins 8 caractères avec lettres et chiffres.';
  if (m.includes('too_many_requests') || m.includes('too many'))
    return 'Trop de tentatives — patientez quelques minutes.';
  if (m.includes('network') || m.includes('fetch') || m.includes('failed to fetch'))
    return 'Erreur réseau — vérifiez votre connexion internet.';
  if (m.includes('invalid email') || m.includes('unable to validate'))
    return 'Adresse email invalide.';
  return 'Une erreur est survenue. Veuillez réessayer.';
}

function parseRateLimitSecs(msg: string): number {
  const match = msg.match(/after (\d+) second/i);
  return match ? parseInt(match[1]) : 60;
}

/* ─── Countdown hook ─────────────────────────────────────────────────────────── */
function useCountdown(init = 0) {
  const [secs, setSecs] = useState(init);
  const [max, setMax]   = useState(init);
  const timer           = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback((seconds: number) => {
    setMax(seconds);
    setSecs(seconds);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setSecs(prev => {
        if (prev <= 1) { clearInterval(timer.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  return { secs, max, start, active: secs > 0 };
}

/* ─── Email Confirmation Screen ──────────────────────────────────────────────── */
function ConfirmEmailScreen({
  email,
  onBack,
}: {
  email: string;
  onBack: () => void;
}) {
  const [resent, setResent]   = useState(false);
  const [resending, setResending] = useState(false);
  const cooldown = useCountdown();

  const handleResend = async () => {
    if (cooldown.active || resending) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) {
      const mapped = mapAuthError(error.message);
      if (mapped === '__RATE_LIMIT__') {
        const secs = parseRateLimitSecs(error.message);
        cooldown.start(secs);
        toast.error(`Limite email — réessayez dans ${secs}s`);
      } else {
        toast.error(mapped === '__EMAIL_NOT_CONFIRMED__' ? 'Email déjà envoyé. Vérifiez votre boîte.' : mapped);
      }
    } else {
      setResent(true);
      cooldown.start(RESEND_COOLDOWN);
      toast.success('Email de confirmation renvoyé !');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/30">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md text-center space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mx-auto"
        >
          <CheckCircle2 className="w-10 h-10 text-success" />
        </motion.div>

        <div>
          <h2 className="text-2xl font-bold mb-2">Vérifiez votre email</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Un lien de confirmation a été envoyé à{' '}
            <strong className="text-foreground">{email}</strong>.<br />
            Cliquez sur le lien pour activer votre compte.
          </p>
        </div>

        {/* Info checklist */}
        <div className="glass-card p-4 text-left text-xs text-muted-foreground space-y-2">
          <p className="flex gap-2"><span>📬</span> Vérifiez votre dossier <strong>Spam / Indésirables</strong> si vous ne voyez pas l'email.</p>
          <p className="flex gap-2"><span>⏱️</span> Le lien expire dans <strong>24 heures</strong>.</p>
          <p className="flex gap-2"><span>🔒</span> Après confirmation, revenez ici pour vous connecter.</p>
        </div>

        {/* Resend button */}
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleResend}
            disabled={cooldown.active || resending}
          >
            {resending ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Envoi en cours…</>
            ) : cooldown.active ? (
              <><Clock className="w-4 h-4" /> Renvoyer dans {cooldown.secs}s</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> {resent ? 'Renvoyer à nouveau' : "Renvoyer l'email"}</>
            )}
          </Button>

          {/* Cooldown progress */}
          <AnimatePresence>
            {cooldown.active && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-1 rounded-full bg-border overflow-hidden"
              >
                <motion.div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(cooldown.secs / cooldown.max) * 100}%` }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button variant="ghost" className="w-full" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Retour à la connexion
        </Button>
      </motion.div>
    </div>
  );
}

/* ─── Forgot Password Screen ─────────────────────────────────────────────────── */
function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);
  const [error, setError]     = useState('');
  const cooldown = useCountdown();

  const sendResetEmail = async () => {
    setError('');
    const result = forgotSchema.safeParse({ email });
    if (!result.success) { setError(result.error.errors[0].message); return; }
    if (cooldown.active) return;

    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);

    if (err) {
      const mapped = mapAuthError(err.message);
      if (mapped === '__RATE_LIMIT__') {
        const secs = parseRateLimitSecs(err.message);
        cooldown.start(secs);
        setError(`Trop de tentatives — réessayez dans ${secs}s`);
      } else {
        setError(mapped);
      }
    } else {
      setDone(true);
      cooldown.start(RESEND_COOLDOWN);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendResetEmail();
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-info/15 flex items-center justify-center mx-auto">
          <Mail className="w-8 h-8 text-info" />
        </div>
        <div>
          <h3 className="font-bold text-lg mb-1">Email envoyé !</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Un lien de réinitialisation a été envoyé à <strong>{email}</strong>.<br />
            Vérifiez votre boîte de réception et vos spams.
          </p>
        </div>
        <div className="glass-card p-3 text-xs text-muted-foreground text-left space-y-1">
          <p>• Le lien expire dans <strong>1 heure</strong></p>
          <p>• Cliquez le lien depuis l'appareil sur lequel vous souhaitez vous connecter</p>
        </div>

        {/* Resend with cooldown */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={sendResetEmail}
          disabled={cooldown.active || loading}
        >
          {cooldown.active
            ? <><Clock className="w-3.5 h-3.5" /> Renvoyer dans {cooldown.secs}s</>
            : <><RefreshCw className="w-3.5 h-3.5" /> Renvoyer le lien</>
          }
        </Button>

        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-primary transition-colors">
          <ChevronLeft className="inline w-3.5 h-3.5 mr-0.5" /> Retour à la connexion
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-5"
    >
      <div>
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" /> Retour
        </button>
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Mot de passe oublié ?</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Entrez votre email — nous vous enverrons un lien de réinitialisation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="forgot-email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email
          </Label>
          <Input
            id="forgot-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="mt-2"
            autoComplete="email"
            disabled={loading || cooldown.active}
          />
          {error && <p className="text-xs text-destructive mt-1">{error}</p>}
        </div>

        <Button
          type="submit"
          variant="hero"
          className="w-full"
          disabled={loading || cooldown.active}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
              Envoi en cours…
            </span>
          ) : cooldown.active ? (
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> Attendez {cooldown.secs}s
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Envoyer le lien <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </Button>
      </form>
    </motion.div>
  );
}

/* ─── Main Auth Page ─────────────────────────────────────────────────────────── */
type Mode = 'login' | 'signup' | 'forgot';

export default function Auth() {
  const [mode, setMode]             = useState<Mode>('login');
  const [loading, setLoading]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signupDone, setSignupDone] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [formData, setFormData]     = useState({
    email: '', password: '', full_name: '', role: 'patient' as 'patient' | 'pharmacist',
  });
  const [errors, setErrors]         = useState<Record<string, string>>({});

  const navigate = useNavigate();
  const { user, role: userRole, loading: authLoading } = useAuth();
  const lockout  = useCountdown();

  /* Redirect if already authenticated */
  useEffect(() => {
    if (!authLoading && user && userRole) {
      const map: Record<string, string> = { admin: '/admin', pharmacist: '/pharmacist', patient: '/patient' };
      navigate(map[userRole] || '/patient');
    }
  }, [user, userRole, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockout.active || loading) return;
    setErrors({});
    setLoading(true);

    try {
      if (mode === 'login') {
        const v = loginSchema.parse(formData);
        const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });

        if (error) {
          const mapped = mapAuthError(error.message);
          if (mapped === '__RATE_LIMIT__') {
            const secs = parseRateLimitSecs(error.message);
            lockout.start(secs);
            toast.error(`Trop de tentatives — réessayez dans ${secs}s`);
          } else if (mapped === '__EMAIL_NOT_CONFIRMED__') {
            toast.error('Confirmez votre email avant de vous connecter. Vérifiez votre boîte de réception.', { duration: 7000 });
          } else {
            const next = failedAttempts + 1;
            setFailedAttempts(next);
            if (next >= MAX_ATTEMPTS) {
              lockout.start(LOCKOUT_SECS);
              toast.error(`Compte temporairement bloqué — réessayez dans ${LOCKOUT_SECS}s`);
            } else {
              toast.error(mapped);
              if (next >= WARN_AT) {
                const rem = MAX_ATTEMPTS - next;
                toast.warning(`${rem} tentative${rem > 1 ? 's' : ''} restante${rem > 1 ? 's' : ''} avant blocage`);
              }
            }
          }
        } else {
          setFailedAttempts(0);
          toast.success('Connexion réussie');
        }

      } else {
        /* signup */
        const v = signupSchema.parse(formData);
        const { data: signupData, error } = await supabase.auth.signUp({
          email: v.email,
          password: v.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: v.full_name, role: v.role },
          },
        });

        if (error) {
          const mapped = mapAuthError(error.message);
          if (mapped === '__RATE_LIMIT__') {
            const secs = parseRateLimitSecs(error.message);
            lockout.start(secs);
            toast.error(`Limite email — réessayez dans ${secs}s`);
          } else if (mapped === '__EMAIL_NOT_CONFIRMED__') {
            toast.error('Cet email est déjà enregistré mais non confirmé. Vérifiez vos emails ou connectez-vous.');
          } else {
            toast.error(mapped);
          }
        } else {
          /* If email confirmation is disabled in Supabase, the user is
             auto-confirmed — redirect directly instead of showing the
             "check your email" screen. */
          const autoConfirmed = !!signupData?.user?.email_confirmed_at;
          if (autoConfirmed) {
            toast.success('Compte créé avec succès ! Connexion en cours…');
            /* AuthContext listener will pick up the session and redirect */
          } else {
            setSignupDone(true);
          }
        }
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fe: Record<string, string> = {};
        err.errors.forEach(e => { if (e.path[0]) fe[e.path[0] as string] = e.message; });
        setErrors(fe);
      }
    }

    setLoading(false);
  };

  /* ── Signup confirmation pending ── */
  if (signupDone) {
    return (
      <ConfirmEmailScreen
        email={formData.email}
        onBack={() => { setSignupDone(false); setMode('login'); setFormData(f => ({ ...f, password: '' })); }}
      />
    );
  }

  const isLocked   = lockout.active;
  const isDisabled = loading || isLocked;
  const remaining  = MAX_ATTEMPTS - failedAttempts;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-secondary/30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-info flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold">
            Phar<span className="text-gradient">Minds</span>
          </h1>
          <p className="text-muted-foreground mt-2">
            {mode === 'login' ? 'Connectez-vous à votre compte'
              : mode === 'signup' ? 'Créez votre compte'
              : 'Réinitialisation du mot de passe'}
          </p>
        </div>

        {/* Lockout banner */}
        <AnimatePresence>
          {isLocked && (
            <motion.div
              key="lockout"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 p-4 rounded-xl border border-destructive/30 bg-destructive/8"
            >
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-4 h-4 text-destructive shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-destructive">Accès temporairement bloqué</p>
                  <p className="text-xs text-muted-foreground">
                    Réessayez dans <span className="font-bold text-destructive tabular-nums">{lockout.secs}s</span>
                  </p>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-destructive/20 overflow-hidden">
                <div
                  className="h-full bg-destructive rounded-full transition-all duration-1000"
                  style={{ width: `${(lockout.secs / lockout.max) * 100}%` }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attempts warning */}
        <AnimatePresence>
          {!isLocked && mode === 'login' && failedAttempts >= WARN_AT && failedAttempts < MAX_ATTEMPTS && (
            <motion.div
              key="warn"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-3 rounded-xl border border-warning/30 bg-warning/8 flex items-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 text-warning shrink-0" />
              <p className="text-xs text-warning font-medium">
                {remaining} tentative{remaining > 1 ? 's' : ''} restante{remaining > 1 ? 's' : ''} avant blocage temporaire
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card */}
        <div className="glass-card-elevated p-8">
          <AnimatePresence mode="wait">
            {mode === 'forgot' ? (
              <motion.div key="forgot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ForgotPasswordScreen onBack={() => setMode('login')} />
              </motion.div>
            ) : (
              <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Full name — signup only */}
                  {mode === 'signup' && (
                    <div>
                      <Label htmlFor="full_name" className="flex items-center gap-2">
                        <User className="w-4 h-4" /> Nom Complet
                      </Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Votre nom complet"
                        className="mt-2"
                        disabled={isDisabled}
                        autoComplete="name"
                      />
                      {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
                    </div>
                  )}

                  {/* Email */}
                  <div>
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="votre@email.com"
                      className="mt-2"
                      disabled={isDisabled}
                      autoComplete={mode === 'login' ? 'username' : 'email'}
                    />
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="flex items-center gap-2">
                        <Lock className="w-4 h-4" /> Mot de Passe
                      </Label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => setMode('forgot')}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          Mot de passe oublié ?
                        </button>
                      )}
                    </div>
                    <div className="relative mt-2">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        className="pr-10"
                        disabled={isDisabled}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                    {mode === 'signup' && !errors.password && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Min. 8 caractères, au moins une lettre et un chiffre
                      </p>
                    )}
                  </div>

                  {/* Role — signup only */}
                  {mode === 'signup' && (
                    <div>
                      <Label htmlFor="role">Type de Compte</Label>
                      <Select
                        value={formData.role}
                        onValueChange={(v: 'patient' | 'pharmacist') => setFormData({ ...formData, role: v })}
                        disabled={isDisabled}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="patient">Patient</SelectItem>
                          <SelectItem value="pharmacist">Pharmacien</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Submit */}
                  <Button type="submit" variant="hero" className="w-full" disabled={isDisabled}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                        Chargement…
                      </span>
                    ) : isLocked ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" /> Bloqué {lockout.secs}s…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {mode === 'login' ? 'Se Connecter' : 'Créer le Compte'}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </form>

                {/* Toggle login / signup */}
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErrors({}); setFailedAttempts(0); }}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {mode === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Button variant="ghost" onClick={() => navigate('/')}>
            Retour à l'accueil
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

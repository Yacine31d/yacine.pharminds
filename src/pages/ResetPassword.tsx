import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

/* ─── countdown hook ─────────────────────────────────────────────────────── */
function useCountdown(init = 0) {
  const [secs, setSecs] = useState(init);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = useCallback((seconds: number) => {
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
  return { secs, start, active: secs > 0 };
}

/* ─── password strength ──────────────────────────────────────────────────── */
function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Très faible', color: 'bg-red-500' };
  if (score === 2) return { score, label: 'Faible',     color: 'bg-orange-500' };
  if (score === 3) return { score, label: 'Moyen',      color: 'bg-yellow-400' };
  if (score === 4) return { score, label: 'Fort',       color: 'bg-green-500' };
  return { score, label: 'Très fort', color: 'bg-emerald-500' };
}

type Screen = 'loading' | 'form' | 'success' | 'invalid';

export default function ResetPassword() {
  const navigate   = useNavigate();
  const [screen, setScreen] = useState<Screen>('loading');
  const [password, setPassword]   = useState('');
  const [confirm,  setConfirm]    = useState('');
  const [showPw,   setShowPw]     = useState(false);
  const [showCf,   setShowCf]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,    setError]      = useState('');
  const redirect   = useCountdown(5);

  /* listen for PASSWORD_RECOVERY event */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setScreen('form');
      }
    });

    /* also check if we already have a session (page reload after clicking link) */
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        // If we have a valid session from the recovery link, show the form
        const urlParams = new URLSearchParams(window.location.hash.replace('#', '?'));
        const type = urlParams.get('type');
        if (type === 'recovery' || screen === 'loading') {
          setScreen('form');
        }
      } else if (screen === 'loading') {
        // No session → wait a bit then show invalid
        setTimeout(() => setScreen(s => s === 'loading' ? 'invalid' : s), 3000);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* auto-redirect after success */
  useEffect(() => {
    if (screen === 'success') {
      redirect.start(5);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  useEffect(() => {
    if (screen === 'success' && !redirect.active && redirect.secs === 0) {
      navigate('/auth');
    }
  }, [redirect.active, redirect.secs, screen, navigate]);

  const strength = passwordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (err) {
      if (err.message.toLowerCase().includes('same password')) {
        setError('Le nouveau mot de passe doit être différent de l\'ancien.');
      } else {
        setError('Erreur lors de la mise à jour. Veuillez réessayer.');
      }
      return;
    }

    await supabase.auth.signOut();
    setScreen('success');
  };

  /* ─── Loading screen ────────────────────────────────────────────────────── */
  const LoadingScreen = () => (
    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="text-center space-y-4">
      <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
      <p className="text-muted-foreground">Vérification du lien de réinitialisation…</p>
    </motion.div>
  );

  /* ─── Invalid / expired screen ──────────────────────────────────────────── */
  const InvalidScreen = () => (
    <motion.div key="invalid" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
      className="text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
        <AlertCircle className="w-8 h-8 text-red-400" />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">Lien invalide ou expiré</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Ce lien de réinitialisation est invalide ou a expiré.<br />
          Veuillez en demander un nouveau depuis la page de connexion.
        </p>
      </div>
      <Button className="w-full" onClick={() => navigate('/auth')}>
        Retour à la connexion
      </Button>
    </motion.div>
  );

  /* ─── Success screen ────────────────────────────────────────────────────── */
  const SuccessScreen = () => (
    <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      className="text-center space-y-6">
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto"
      >
        <CheckCircle className="w-10 h-10 text-emerald-400" />
      </motion.div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">Mot de passe mis à jour !</h2>
        <p className="text-muted-foreground text-sm">
          Votre mot de passe a été modifié avec succès.<br />
          Vous pouvez maintenant vous connecter avec vos nouveaux identifiants.
        </p>
      </div>

      {/* countdown progress bar */}
      <div className="space-y-2">
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-emerald-500 rounded-full"
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 5, ease: 'linear' }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Redirection vers la connexion dans {redirect.secs}s…
        </p>
      </div>

      <Button className="w-full" onClick={() => navigate('/auth')}>
        Se connecter maintenant
      </Button>
    </motion.div>
  );

  /* ─── Form screen ───────────────────────────────────────────────────────── */
  const FormScreen = () => (
    <motion.div key="form" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="text-center mb-8 space-y-1">
        <h2 className="text-2xl font-bold text-foreground">Nouveau mot de passe</h2>
        <p className="text-muted-foreground text-sm">
          Choisissez un mot de passe fort pour sécuriser votre compte.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Password */}
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">Nouveau mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimum 8 caractères"
              className="pl-10 pr-10 bg-background/50 border-white/10 focus:border-primary/50"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Strength indicator */}
          {password.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    i <= strength.score ? strength.color : 'bg-white/10'
                  }`} />
                ))}
              </div>
              <p className={`text-xs font-medium ${
                strength.score <= 1 ? 'text-red-400' :
                strength.score === 2 ? 'text-orange-400' :
                strength.score === 3 ? 'text-yellow-400' :
                'text-green-400'
              }`}>{strength.label}</p>
              <ul className="text-[11px] text-muted-foreground space-y-0.5">
                {password.length < 8 && <li>• Au moins 8 caractères</li>}
                {!/[A-Z]/.test(password) && <li>• Au moins une majuscule</li>}
                {!/[0-9]/.test(password) && <li>• Au moins un chiffre</li>}
                {!/[^A-Za-z0-9]/.test(password) && <li>• Un caractère spécial (recommandé)</li>}
              </ul>
            </motion.div>
          )}
        </div>

        {/* Confirm */}
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-sm font-medium">Confirmer le mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="confirm"
              type={showCf ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Répétez le mot de passe"
              className={`pl-10 pr-10 bg-background/50 border-white/10 focus:border-primary/50 ${
                confirm.length > 0 && confirm !== password ? 'border-red-500/50' : ''
              }`}
              required
              autoComplete="new-password"
            />
            <button type="button" onClick={() => setShowCf(!showCf)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirm.length > 0 && confirm !== password && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs text-red-400">
              Les mots de passe ne correspondent pas.
            </motion.p>
          )}
          {confirm.length > 0 && confirm === password && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Les mots de passe correspondent.
            </motion.p>
          )}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <Button type="submit" className="w-full h-11" disabled={submitting || password.length < 8 || password !== confirm}>
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Mise à jour…
            </span>
          ) : 'Mettre à jour le mot de passe'}
        </Button>
      </form>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-info/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-info flex items-center justify-center shadow-lg shadow-primary/25">
              <Pill className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="font-display font-bold text-xl text-gradient">PharMinds</h1>
              <p className="text-xs text-muted-foreground">Réinitialisation du mot de passe</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card p-8 rounded-2xl border border-white/10 shadow-2xl">
          <AnimatePresence mode="wait">
            {screen === 'loading' && <LoadingScreen />}
            {screen === 'invalid' && <InvalidScreen />}
            {screen === 'form'    && <FormScreen />}
            {screen === 'success' && <SuccessScreen />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

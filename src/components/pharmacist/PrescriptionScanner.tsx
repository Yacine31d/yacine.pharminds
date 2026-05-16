import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Camera,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Pill,
  Clock,
  X,
  FilePlus,
  Send,
  Check,
  RefreshCw,
  WifiOff,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ImagePreprocessor } from './ImagePreprocessor';
import { InteractionAlert } from './InteractionAlert';
import { supabase } from '@/integrations/supabase/client';
import {
  scanPrescriptionLocal,
  scanPrescriptionImage,
  hasVisionFallback,
  OCR_FEEDBACK_URL,
  OcrSleepingError,
  OcrUnavailableError,
} from '@/lib/ai-service';
import { DCISwitchPanel } from './DCISwitchPanel';

interface ExtractedMedication {
  name: string;
  name_ar?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
  drug_id?: string;                          // populated by server-side DrugMatcher
  match_strategy?: 'exact' | 'fuzzy' | 'phonetic' | 'atc' | 'unmatched';
}

interface ScanResult {
  success: boolean;
  doctor_name?: string;
  patient_name?: string;
  prescription_date?: string;
  medications?: ExtractedMedication[];
  confidence_score?: number;
  notes?: string;
  error?: string;
  _method?: 'trocr' | 'vision';   // which engine produced the result
  line_crops?: Array<{
    line_index: number;
    predicted_text: string;
    confidence?: number;
    image_base64: string;
  }>;
  model_version?: string;        // v2 telemetry — surfaced in footer for trust
  dataset_version?: string;
  processing_ms?: number;
}

/* ---------- method badge ---------- */
const MethodBadge = ({ method }: { method?: 'trocr' | 'vision' }) => {
  if (!method) return null;
  const isTrocr = method === 'trocr';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full border ${
      isTrocr
        ? 'bg-primary/10 text-primary border-primary/20'
        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isTrocr ? 'bg-primary' : 'bg-amber-400'}`} />
      {isTrocr ? 'TrOCR (fine-tuné)' : 'Vision AI (fallback)'}
    </span>
  );
};

type ScanStep = 'idle' | 'uploading' | 'detecting' | 'recognizing' | 'structuring' | 'done';
type ErrorKind = 'sleeping' | 'unavailable' | 'generic' | null;

const SCAN_STEPS: { key: ScanStep; label: string }[] = [
  { key: 'detecting',    label: 'Détection des lignes de texte...' },
  { key: 'recognizing',  label: 'Lecture de l\'écriture (TrOCR)...' },
  { key: 'structuring',  label: 'Structuration IA...' },
  { key: 'done',         label: 'Terminé' },
];

interface PrescriptionScannerProps {
  onMedicationsExtracted?: (medications: ExtractedMedication[]) => void;
}

/* ---------- sleeping-server countdown widget ---------- */
const SleepingServerBanner = ({
  countdown,
  onRetry,
}: {
  countdown: number;
  onRetry: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-5 flex flex-col gap-3"
  >
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
        <WifiOff className="w-4 h-4 text-amber-400" />
      </div>
      <div>
        <p className="font-semibold text-amber-300 text-sm">Serveur OCR en veille</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Le serveur HuggingFace (tier gratuit) se réveille — cela prend ~30 secondes.
        </p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div
          className="h-full bg-amber-400 rounded-full"
          initial={{ width: '100%' }}
          animate={{ width: `${(countdown / 35) * 100}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-10 shrink-0">
        {countdown > 0 ? `${countdown}s` : ''}
      </span>
      <Button size="sm" variant="outline" onClick={onRetry} className="shrink-0 h-7 text-xs gap-1.5">
        <RefreshCw className="w-3 h-3" />
        Réessayer
      </Button>
    </div>
  </motion.div>
);

const ConfidenceBadge = ({ value }: { value?: number }) => {
  if (value == null) return null;
  const pct = Math.round(value * 100);
  const cls = value >= 0.7 ? 'bg-success/20 text-success' : value >= 0.4 ? 'bg-warning/20 text-warning-foreground' : 'bg-destructive/20 text-destructive';
  return <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${cls}`}>{pct}%</span>;
};

const FeedbackRow = ({ crop }: { crop: NonNullable<ScanResult['line_crops']>[0] }) => {
  const [text, setText] = useState(crop.predicted_text);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch(OCR_FEEDBACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: crop.image_base64,
          corrected_text: text
        })
      });
      if (!response.ok) throw new Error('Failed to send feedback');
      setSubmitted(true);
      toast.success('Feedback added to dataset successfully!');
    } catch (err) {
      toast.error('Could not save feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-3 rounded-lg bg-secondary/30 border border-border">
      <div className="w-full md:w-48 shrink-0 bg-white p-1 rounded relative">
        <img src={`data:image/jpeg;base64,${crop.image_base64}`} alt="Crop" className="w-full h-auto object-contain" />
        <div className="absolute top-1 right-1"><ConfidenceBadge value={crop.confidence} /></div>
      </div>
      <div className="flex-1 flex gap-2 w-full">
        <Input 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          className="flex-1 bg-background"
          disabled={submitted}
        />
        <Button 
          variant={submitted ? "outline" : "default"} 
          size="icon" 
          onClick={handleSubmit} 
          disabled={isSubmitting || submitted}
        >
          {submitted ? <Check className="w-4 h-4 text-success" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

export const PrescriptionScanner = ({ onMedicationsExtracted }: PrescriptionScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<ScanStep>('idle');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreprocessor, setShowPreprocessor] = useState(false);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [savedOrdonnanceId, setSavedOrdonnanceId] = useState<string | null>(null);
  const [dciDismissed, setDciDismissed] = useState<Set<number>>(new Set());
  const [dciSubstitutes, setDciSubstitutes] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Store the last base64 for retry
  const lastBase64Ref = useRef<string | null>(null);

  // ── Batched DCI query: 1 round-trip for ALL medications instead of N ────────
  const medicationNames = (scanResult?.medications ?? []).map(m => m.name);
  const { data: batchAlternatives = {} } = useQuery({
    queryKey: ['dci-batch', medicationNames],
    queryFn: async (): Promise<Record<string, { id: string; name_fr: string; generic_name: string; form?: string | null; dosage?: string | null; manufacturer?: string | null; price_dz?: number | null; is_generic?: boolean | null; cnas_reimbursable?: boolean | null; inStock: boolean }[]>> => {
      if (!medicationNames.length) return {};

      // Single query covering all medication names at once
      const orFilter = medicationNames
        .map(n => `generic_name.ilike.%${n}%,name_fr.ilike.%${n}%`)
        .join(',');

      const { data: drugs } = await supabase
        .from('drugs')
        .select('id,name_fr,generic_name,form,dosage,manufacturer,price_dz,is_generic,cnas_reimbursable')
        .or(orFilter)
        .order('is_generic', { ascending: false })
        .order('price_dz', { ascending: true })
        .limit(50);

      if (!drugs?.length) return {};

      // Single inventory query for all found drugs
      const { data: { session } } = await supabase.auth.getSession();
      let stockSet = new Set<string>();
      if (session) {
        const { data: inv } = await supabase
          .from('inventory')
          .select('drug_id')
          .eq('pharmacy_id', session.user.id)
          .in('drug_id', drugs.map(d => d.id))
          .gt('current_stock', 0);
        stockSet = new Set((inv ?? []).map((i: any) => i.drug_id));
      }

      const drugsWithStock = drugs.map(d => ({ ...d, inStock: stockSet.has(d.id) }));

      // Group results by which medication name they match
      const result: typeof batchAlternatives = {};
      for (const name of medicationNames) {
        const nameLower = name.toLowerCase();
        result[name] = drugsWithStock
          .filter(d =>
            d.generic_name?.toLowerCase().includes(nameLower) ||
            d.name_fr?.toLowerCase().includes(nameLower)
          )
          .sort((a, b) => {
            if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
            if (a.is_generic !== b.is_generic) return a.is_generic ? -1 : 1;
            return (a.price_dz ?? 9999) - (b.price_dz ?? 9999);
          })
          .slice(0, 5);
      }
      return result;
    },
    enabled: medicationNames.length > 0 && !!scanResult?.success,
    staleTime: 5 * 60 * 1000, // cache for 5 minutes — same scan won't re-fetch
  });
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // scanFromBase64 stored in a ref so the countdown timer can call it without stale closure
  const scanFromBase64Ref = useRef<((b64: string) => Promise<void>) | null>(null);

  // Clean up timer on unmount
  useEffect(() => () => { if (countdownTimerRef.current) clearInterval(countdownTimerRef.current); }, []);

  const startSleepCountdown = useCallback((seconds = 35) => {
    setRetryCountdown(seconds);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setRetryCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          // Auto-retry when countdown reaches 0
          if (lastBase64Ref.current && scanFromBase64Ref.current) {
            scanFromBase64Ref.current(lastBase64Ref.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("La taille de l'image doit être inférieure à 10 Mo");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
      setShowPreprocessor(true);
    };
    reader.readAsDataURL(file);
  };

  const handlePreprocessed = async (processedBase64: string) => {
    setShowPreprocessor(false);
    await scanFromBase64(processedBase64);
  };

  const handleSkipPreprocessing = async () => {
    setShowPreprocessor(false);
    if (previewImage) {
      const base64 = previewImage.split(',')[1];
      await scanFromBase64(base64);
    }
  };

  const scanFromBase64 = async (base64: string) => {
    scanFromBase64Ref.current = scanFromBase64; // keep ref in sync
    lastBase64Ref.current = base64;
    setIsScanning(true);
    setScanStep('detecting');
    setScanResult(null);
    setErrorKind(null);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setRetryCountdown(0);

    try {
      let raw: any;
      let usedVision = false;

      // ── Primary path: TrOCR backend ────────────────────────────────────────
      try {
        raw = await scanPrescriptionLocal(base64, setScanStep);
      } catch (ocrErr) {
        const isSleeping    = ocrErr instanceof OcrSleepingError;
        const isUnavailable = ocrErr instanceof OcrUnavailableError;

        if ((isSleeping || isUnavailable) && hasVisionFallback()) {
          // ── Automatic vision fallback (OpenRouter Llama 4 Maverick) ─────────
          toast.info('Serveur TrOCR indisponible — basculement vers Vision AI...');
          setScanStep('structuring');
          raw = await scanPrescriptionImage(base64);
          usedVision = true;
        } else if (isSleeping) {
          // No vision key — show countdown UI
          setErrorKind('sleeping');
          toast.warning('Serveur OCR en veille — nouvelle tentative dans 35 secondes');
          startSleepCountdown(35);
          return;
        } else {
          throw ocrErr;
        }
      }

      if (!raw?.success) {
        throw new Error(raw?.error || 'Échec du scan');
      }

      const mappedResult: ScanResult = {
        success:          true,
        doctor_name:      raw.doctor_name      ?? null,
        patient_name:     raw.patient_name     ?? null,
        prescription_date:raw.prescription_date?? null,
        medications:      raw.medications      || [],
        confidence_score: raw.confidence_score ?? null,
        notes:            raw.notes            ?? null,
        line_crops:       raw.line_crops       || [],
        _method:          usedVision ? 'vision' : 'trocr',
        model_version:    raw.model_version    ?? undefined,
        dataset_version:  raw.dataset_version  ?? undefined,
        processing_ms:    raw.processing_ms    ?? undefined,
      };

      setScanStep('done');
      setScanResult(mappedResult);

      if (mappedResult.medications && mappedResult.medications.length > 0) {
        const methodLabel = usedVision ? ' (Vision AI)' : ' (TrOCR)';
        toast.success(`${mappedResult.medications.length} médicament(s) extrait(s)${methodLabel}`);
        onMedicationsExtracted?.(mappedResult.medications);
      } else {
        toast.warning("Aucun médicament détecté dans l'image");
      }

    } catch (error: any) {
      console.error('Scan error:', error);

      if (error?.message === 'VISION_NO_KEY') {
        setErrorKind('unavailable');
        setScanResult({
          success: false,
          error: 'Service OCR indisponible et aucune clé Vision configurée. Ajoutez VITE_OPENROUTER_API_KEY sur Vercel.',
        });
        toast.error('OCR hors ligne — configurez VITE_OPENROUTER_API_KEY pour le mode fallback');
      } else if (error instanceof OcrUnavailableError) {
        setErrorKind('unavailable');
        setScanResult({ success: false, error: 'Service OCR indisponible. Réessayez dans quelques instants.' });
        toast.error('Service OCR indisponible');
      } else {
        setErrorKind('generic');
        const msg = error instanceof Error ? error.message : 'Échec du scan';
        setScanResult({ success: false, error: msg });
        toast.error(msg);
      }
    } finally {
      setIsScanning(false);
      setScanStep('idle');
    }
  };

  const handleManualRetry = () => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setRetryCountdown(0);
    setErrorKind(null);
    if (lastBase64Ref.current) {
      scanFromBase64(lastBase64Ref.current);
    }
  };

  const clearScan = () => {
    setPreviewImage(null);
    setScanResult(null);
    setShowPreprocessor(false);
    setErrorKind(null);
    setSavedOrdonnanceId(null);
    lastBase64Ref.current = null;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setRetryCountdown(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /** Save the current scan result to the ordonnances table. */
  const handleSaveToDatabase = async () => {
    if (!scanResult?.success || isSaving || savedOrdonnanceId) return;
    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Non authentifié'); return; }

      // Insert ordonnance record
      const { data: ordonnance, error: ordErr } = await supabase
        .from('ordonnances')
        .insert({
          user_id: session.user.id,
          doctor_name: scanResult.doctor_name || 'Inconnu',
          doctor_specialty: null,
          hospital_name: null,
          prescription_date: scanResult.prescription_date
            || new Date().toISOString().split('T')[0],
          notes: scanResult.notes || null,
          status: 'active',
        })
        .select()
        .single();

      if (ordErr || !ordonnance) throw ordErr ?? new Error('Insert failed');

      // Insert medications if any
      const meds = scanResult.medications ?? [];
      if (meds.length > 0) {
        await supabase.from('ordonnance_medications').insert(
          meds.map(m => ({
            ordonnance_id: ordonnance.id,
            medication_name: m.name,
            dosage: m.dosage || null,
            frequency: m.frequency || null,
            duration: m.duration || null,
            quantity: m.quantity ? parseInt(m.quantity as any) || null : null,
            instructions: m.instructions || null,
            is_dispensed: false,
          }))
        );
      }

      setSavedOrdonnanceId(ordonnance.id);
      toast.success(`Scan sauvegardé — ${meds.length} médicament(s) enregistré(s)`);
    } catch (err) {
      console.error('Save scan error:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id="prescription-upload"
        />

        {!previewImage ? (
          <label
            htmlFor="prescription-upload"
            className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 hover:bg-primary/10 cursor-pointer transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Upload Prescription</h3>
            <p className="text-sm text-muted-foreground text-center">
              Drop an image or click to browse<br />
              Supports JPG, PNG, WEBP (max 10MB)
            </p>
          </label>
        ) : (
          <div className="relative rounded-xl overflow-hidden">
            <img 
              src={previewImage} 
              alt="Prescription preview" 
              className="w-full max-h-64 object-contain bg-secondary/20"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={clearScan}
            >
              <X className="w-4 h-4" />
            </Button>
            {isScanning && (
              <div className="absolute inset-0 bg-background/90 flex items-center justify-center rounded-xl">
                <div className="text-center px-6 w-full max-w-xs">
                  <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-4" />
                  <div className="space-y-2">
                    {SCAN_STEPS.filter(s => s.key !== 'done').map((step) => {
                      const stepIdx = SCAN_STEPS.findIndex(s => s.key === scanStep);
                      const thisIdx = SCAN_STEPS.findIndex(s => s.key === step.key);
                      const isActive = step.key === scanStep;
                      const isDone = thisIdx < stepIdx;
                      return (
                        <div key={step.key} className={`flex items-center gap-2 text-sm transition-opacity ${isActive ? 'opacity-100 font-medium text-primary' : isDone ? 'opacity-60 line-through text-muted-foreground' : 'opacity-30 text-muted-foreground'}`}>
                          {isDone
                            ? <CheckCircle className="w-3.5 h-3.5 shrink-0 text-success" />
                            : isActive
                            ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                            : <div className="w-3.5 h-3.5 shrink-0 rounded-full border border-current" />
                          }
                          {step.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Image Preprocessor */}
        {showPreprocessor && previewImage && (
          <ImagePreprocessor
            imageSrc={previewImage}
            onProcessed={handlePreprocessed}
            onSkip={handleSkipPreprocessing}
          />
        )}
      </motion.div>

      {/* Sleeping server banner */}
      <AnimatePresence>
        {errorKind === 'sleeping' && retryCountdown > 0 && (
          <motion.div
            key="sleeping-banner"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <SleepingServerBanner countdown={retryCountdown} onRetry={handleManualRetry} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan Results */}
      <AnimatePresence>
        {scanResult && !isScanning && errorKind !== 'sleeping' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {scanResult.success ? (
                <CheckCircle className="w-6 h-6 text-success shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-destructive shrink-0" />
              )}
              <h3 className="font-semibold text-lg">
                {scanResult.success ? 'Scan Terminé' : 'Scan Échoué'}
              </h3>
              <MethodBadge method={scanResult._method} />
              {scanResult.model_version && (
                <span className="text-[10px] font-mono text-muted-foreground/70 bg-muted/30 border border-border/40 px-2 py-0.5 rounded-full">
                  modèle {scanResult.model_version} · données {scanResult.dataset_version ?? '?'}
                  {scanResult.processing_ms ? ` · ${(scanResult.processing_ms / 1000).toFixed(1)}s` : ''}
                </span>
              )}
              {scanResult.confidence_score != null && (
                <span className={`ml-auto text-xs font-medium px-2 py-1 rounded-full ${
                  scanResult.confidence_score >= 0.7 ? 'bg-success/20 text-success' :
                  scanResult.confidence_score >= 0.4 ? 'bg-warning/20 text-warning-foreground' :
                  'bg-destructive/20 text-destructive'
                }`}>
                  OCR {Math.round(scanResult.confidence_score * 100)}%
                </span>
              )}
            </div>

            {scanResult.success && (
              <>
                {/* Prescription Details */}
                {(scanResult.doctor_name || scanResult.patient_name || scanResult.prescription_date) && (
                  <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-lg bg-secondary/20">
                    {scanResult.doctor_name && (
                      <div>
                        <p className="text-xs text-muted-foreground">Doctor</p>
                        <p className="font-medium">{scanResult.doctor_name}</p>
                      </div>
                    )}
                    {scanResult.patient_name && (
                      <div>
                        <p className="text-xs text-muted-foreground">Patient</p>
                        <p className="font-medium">{scanResult.patient_name}</p>
                      </div>
                    )}
                    {scanResult.prescription_date && (
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium">
                          {new Date(scanResult.prescription_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Medications List */}
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <Pill className="w-4 h-4 text-primary" />
                    Extracted Medications ({scanResult.medications?.length || 0})
                  </h4>
                  
                  {scanResult.medications?.map((med, index) => (
                    <div key={index}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg bg-primary/5 border border-primary/20"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-primary">
                              {dciSubstitutes[index] ?? med.name}
                              {dciSubstitutes[index] && (
                                <span className="ml-2 text-xs font-normal text-muted-foreground line-through">{med.name}</span>
                              )}
                            </p>
                            {/* Drug-DB match badge — green = exact, blue = fuzzy, purple = phonetic */}
                            {med.drug_id && med.match_strategy && med.match_strategy !== 'unmatched' && (
                              <span
                                className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full border ${
                                  med.match_strategy === 'exact'
                                    ? 'bg-success/10 text-success border-success/30'
                                    : med.match_strategy === 'fuzzy'
                                    ? 'bg-info/10 text-info border-info/30'
                                    : med.match_strategy === 'phonetic'
                                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                                    : 'bg-muted/30 text-muted-foreground border-border/40'
                                }`}
                                title={`Drug-DB match (${med.match_strategy}) — drug_id linked`}
                              >
                                💊 {med.match_strategy}
                              </span>
                            )}
                          </div>
                          {med.name_ar && (
                            <p className="text-sm text-muted-foreground font-arabic">{med.name_ar}</p>
                          )}
                        </div>
                        {med.dosage && (
                          <span className="px-2 py-1 rounded bg-secondary text-sm">
                            {med.dosage}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                        {med.frequency && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {med.frequency}
                          </div>
                        )}
                        {med.duration && (
                          <span>Duration: {med.duration}</span>
                        )}
                        {med.quantity && (
                          <span>Qty: {med.quantity}</span>
                        )}
                      </div>

                      {med.instructions && (
                        <p className="mt-2 text-sm italic text-muted-foreground">
                          {med.instructions}
                        </p>
                      )}
                    </motion.div>
                    {/* DCI Switch — uses batched pre-fetched data (zero extra queries) */}
                    {!dciDismissed.has(index) && !dciSubstitutes[index] && (
                      <DCISwitchPanel
                        medicationName={med.name}
                        genericName={med.name}
                        preloadedAlternatives={batchAlternatives[med.name]}
                        onSelect={(drug) => {
                          setDciSubstitutes(prev => ({ ...prev, [index]: drug.name_fr }));
                        }}
                        onDismiss={() => {
                          setDciDismissed(prev => new Set([...prev, index]));
                        }}
                      />
                    )}
                    </div>
                  ))}
                </div>

                {scanResult.notes && (
                  <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <p className="text-sm text-warning-foreground">{scanResult.notes}</p>
                  </div>
                )}

                {/* Active Learning Feedback Section */}
                {scanResult.line_crops && scanResult.line_crops.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-border">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-primary" />
                      Dataset Feedback (Active Learning)
                    </h4>
                    <p className="text-xs text-muted-foreground mb-4">
                      Review the image crops from the local TrOCR pipeline. Correct any mistakes and submit to add this real-world data directly to your training dataset.
                    </p>
                    <div className="space-y-3">
                      {scanResult.line_crops.map((crop, idx) => (
                        <FeedbackRow key={idx} crop={crop} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Save to Database */}
                <div className="mt-4 flex gap-2">
                  {savedOrdonnanceId ? (
                    <div className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-success/10 border border-success/30 text-success text-sm font-medium">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      Sauvegardé dans la base de données
                    </div>
                  ) : (
                    <Button
                      className="flex-1"
                      variant="hero"
                      onClick={handleSaveToDatabase}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Database className="w-4 h-4 mr-2" />
                      )}
                      {isSaving ? 'Sauvegarde...' : 'Sauvegarder dans la Base'}
                    </Button>
                  )}
                </div>
              </>
            )}

            {!scanResult.success && (
              <p className="text-muted-foreground">{scanResult.error}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interaction Alerts — shown after successful scan */}
      {scanResult?.success && scanResult.medications && scanResult.medications.length > 0 && errorKind == null && (
        <InteractionAlert medications={scanResult.medications} />
      )}
    </div>
  );
};

export default PrescriptionScanner;

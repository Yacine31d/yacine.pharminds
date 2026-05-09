import { useState, useRef, useCallback } from 'react';

type SpeechLanguage = 'fr-FR' | 'ar-SA' | 'ar-DZ' | 'en-US';

interface VoiceInputState {
  isListening: boolean;
  transcript: string;
  language: SpeechLanguage;
  isSupported: boolean;
  error: string | null;
}

interface UseVoiceInputReturn extends VoiceInputState {
  startListening: () => void;
  stopListening: () => void;
  setLanguage: (lang: SpeechLanguage) => void;
  clearTranscript: () => void;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState<SpeechLanguage>('fr-FR');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Accumulates only FINAL results so interim text never gets double-counted.
  const accumulatedRef = useRef('');

  // Check browser support
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const isSupported = !!SpeechRecognition;

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError('La reconnaissance vocale n\'est pas supportée par votre navigateur');
      return;
    }

    try {
      // Reset accumulator for the new session
      accumulatedRef.current = '';

      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        // Only iterate results from the last event index to avoid reprocessing
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        // Append only confirmed (final) words to the accumulator
        if (finalTranscript) {
          accumulatedRef.current += finalTranscript;
        }

        // Display = confirmed final text + current in-progress interim
        // Interim is shown in real-time but never added to the accumulator
        setTranscript(accumulatedRef.current + interimTranscript);
      };

      recognition.onerror = (event: any) => {
        const errorMap: Record<string, string> = {
          'no-speech': 'Aucune parole détectée',
          'audio-capture': 'Microphone non détecté',
          'not-allowed': 'Accès au microphone refusé',
          'network': 'Erreur réseau',
        };
        setError(errorMap[event.error] || `Erreur: ${event.error}`);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setError('Impossible de démarrer la reconnaissance vocale');
      setIsListening(false);
    }
  }, [language, SpeechRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    accumulatedRef.current = '';
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    language,
    isSupported,
    error,
    startListening,
    stopListening,
    setLanguage,
    clearTranscript,
  };
}

export const VOICE_LANGUAGES = [
  { code: 'fr-FR' as SpeechLanguage, label: 'Français', flag: '🇫🇷' },
  { code: 'ar-SA' as SpeechLanguage, label: 'العربية', flag: '🇸🇦' },
  { code: 'ar-DZ' as SpeechLanguage, label: 'دارجة', flag: '🇩🇿' },
  { code: 'en-US' as SpeechLanguage, label: 'English', flag: '🇺🇸' },
];

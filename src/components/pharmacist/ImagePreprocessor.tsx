import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  SunMedium, 
  Contrast, 
  RotateCcw, 
  RotateCw, 
  Check,
  Undo2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImagePreprocessorProps {
  imageSrc: string;
  onProcessed: (processedBase64: string) => void;
  onSkip: () => void;
}

export function ImagePreprocessor({ imageSrc, onProcessed, onSkip }: ImagePreprocessorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [grayscale, setGrayscale] = useState(false);

  const applyFilters = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Handle rotation dimensions
      const isRotated = rotation % 180 !== 0;
      canvas.width = isRotated ? img.height : img.width;
      canvas.height = isRotated ? img.width : img.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Apply rotation
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();

      // Apply CSS filters via canvas
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)${grayscale ? ' grayscale(100%)' : ''}`;
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
    };
    img.src = imageSrc;
  }, [imageSrc, brightness, contrast, rotation, grayscale]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const base64 = dataUrl.split(',')[1];
    onProcessed(base64);
  };

  const handleReset = () => {
    setBrightness(100);
    setContrast(100);
    setRotation(0);
    setGrayscale(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Contrast className="w-4 h-4 text-primary" />
          Image Enhancement
        </h4>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <Undo2 className="w-3 h-3 mr-1" /> Reset
          </Button>
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip
          </Button>
        </div>
      </div>

      {/* Preview canvas */}
      <div className="relative rounded-lg overflow-hidden bg-secondary/20 flex items-center justify-center max-h-48">
        <canvas ref={canvasRef} className="max-w-full max-h-48 object-contain" />
      </div>

      {/* Controls */}
      <div className="space-y-3">
        {/* Brightness */}
        <div className="flex items-center gap-3">
          <SunMedium className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground w-16">Luminosité</span>
          <input
            type="range"
            min="50"
            max="200"
            value={brightness}
            onChange={(e) => setBrightness(Number(e.target.value))}
            className="flex-1 accent-primary h-1"
          />
          <span className="text-xs w-8 text-right">{brightness}%</span>
        </div>

        {/* Contrast */}
        <div className="flex items-center gap-3">
          <Contrast className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs text-muted-foreground w-16">Contraste</span>
          <input
            type="range"
            min="50"
            max="300"
            value={contrast}
            onChange={(e) => setContrast(Number(e.target.value))}
            className="flex-1 accent-primary h-1"
          />
          <span className="text-xs w-8 text-right">{contrast}%</span>
        </div>

        {/* Rotation + Grayscale */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setRotation((r) => r - 90)}>
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRotation((r) => r + 90)}>
              <RotateCw className="w-3 h-3" />
            </Button>
            <span className="text-xs text-muted-foreground">{rotation}°</span>
          </div>
          <Button
            variant={grayscale ? "default" : "outline"}
            size="sm"
            onClick={() => setGrayscale(!grayscale)}
          >
            N&B
          </Button>
        </div>
      </div>

      {/* Apply */}
      <Button onClick={handleApply} className="w-full" variant="hero">
        <Check className="w-4 h-4 mr-2" />
        Appliquer et Scanner
      </Button>
    </motion.div>
  );
}

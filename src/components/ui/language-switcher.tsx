import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';

export function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'minimal' }) {
  const { language, setLanguage, t } = useLanguage();

  if (variant === 'minimal') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
        className="gap-2"
      >
        <Languages className="w-4 h-4" />
        <span className={language === 'ar' ? 'font-arabic' : ''}>
          {language === 'fr' ? 'العربية' : 'Français'}
        </span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 border-primary/30 hover:bg-primary/10">
          <Languages className="w-4 h-4" />
          <span className={language === 'ar' ? 'font-arabic' : ''}>
            {language === 'fr' ? 'FR' : 'عر'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem 
          onClick={() => setLanguage('fr')}
          className={`gap-3 ${language === 'fr' ? 'bg-primary/10 text-primary' : ''}`}
        >
          <motion.span 
            initial={false}
            animate={{ scale: language === 'fr' ? 1 : 0.8 }}
          >
            🇫🇷
          </motion.span>
          <span>Français</span>
          {language === 'fr' && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="ml-auto text-primary"
            >
              ✓
            </motion.span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setLanguage('ar')}
          className={`gap-3 font-arabic ${language === 'ar' ? 'bg-primary/10 text-primary' : ''}`}
        >
          <motion.span 
            initial={false}
            animate={{ scale: language === 'ar' ? 1 : 0.8 }}
          >
            🇩🇿
          </motion.span>
          <span>العربية</span>
          {language === 'ar' && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="ml-auto text-primary"
            >
              ✓
            </motion.span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

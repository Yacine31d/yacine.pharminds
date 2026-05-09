import { motion } from 'framer-motion';
import { Mail, Github, Linkedin, ExternalLink } from 'lucide-react';

export function Footer() {
  return (
    <footer className="py-16 border-t border-border/50">
      <div className="container px-4">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="font-display text-2xl font-bold mb-4">
              <span className="text-foreground">PHAR</span>
              <span className="text-gradient">MINDS</span>
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Plateforme Intelligente pour les Pharmacies Algériennes. 
              Projet de Fin d'Études combinant l'IA et la Santé.
            </p>
            <div className="flex items-center gap-4">
              <a 
                href="mailto:abdorenouni@gmail.com"
                className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Mail className="w-5 h-5 text-primary" />
              </a>
              <a 
                href="#"
                className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Github className="w-5 h-5 text-primary" />
              </a>
              <a 
                href="#"
                className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <Linkedin className="w-5 h-5 text-primary" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Portails</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="/pharmacist" className="hover:text-primary transition-colors">Espace Pharmacien</a></li>
              <li><a href="/patient" className="hover:text-primary transition-colors">Espace Patient</a></li>
              <li><a href="/admin" className="hover:text-primary transition-colors">Administration</a></li>
            </ul>
          </div>

          {/* Tech */}
          <div>
            <h4 className="font-semibold mb-4">Technologies</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                React & TypeScript
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-info" />
                Supabase (PostgreSQL)
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-warning" />
                Google Gemini API
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Tailwind CSS
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © 2025 PharMinds. Projet de Fin d'Études par{' '}
            <span className="text-primary font-medium">Abderrahmane Renouni</span>
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            All systems operational
          </p>
        </div>
      </div>
    </footer>
  );
}

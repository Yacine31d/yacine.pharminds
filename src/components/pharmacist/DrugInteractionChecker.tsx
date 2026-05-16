import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle,
  Pill,
  X,
  Plus,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { cn } from '@/lib/utils';

interface Drug {
  id: string;
  name_fr: string;
  name_ar: string;
  generic_name: string;
  dosage: string | null;
  form: string | null;
}

interface Interaction {
  id: string;
  severity: string;
  description_fr: string;
  description_ar: string;
  recommendation_fr: string | null;
  mechanism: string | null;
  drug_a: Drug;
  drug_b: Drug;
}

export const DrugInteractionChecker = () => {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [selectedDrugs, setSelectedDrugs] = useState<Drug[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Drug[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchDrugs();
  }, []);

  const fetchDrugs = async () => {
    const { data, error } = await supabase
      .from('drugs')
      .select('id, name_fr, name_ar, generic_name, dosage, form')
      .order('name_fr');
    
    if (data) setDrugs(data);
  };

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const filtered = drugs.filter(drug => 
        drug.name_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drug.name_ar.includes(searchQuery) ||
        drug.generic_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 5));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, drugs]);

  const addDrug = (drug: Drug) => {
    if (!selectedDrugs.find(d => d.id === drug.id)) {
      setSelectedDrugs([...selectedDrugs, drug]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeDrug = (drugId: string) => {
    setSelectedDrugs(selectedDrugs.filter(d => d.id !== drugId));
    setInteractions([]);
  };

  const checkInteractions = async () => {
    if (selectedDrugs.length < 2) return;
    
    setChecking(true);
    setInteractions([]);

    try {
      const drugIds = selectedDrugs.map(d => d.id);
      
      const { data, error } = await supabase
        .from('drug_interactions')
        .select(`
          id,
          severity,
          description_fr,
          description_ar,
          recommendation_fr,
          mechanism,
          drug_a:drugs!drug_interactions_drug_a_id_fkey(id, name_fr, name_ar, generic_name, dosage, form),
          drug_b:drugs!drug_interactions_drug_b_id_fkey(id, name_fr, name_ar, generic_name, dosage, form)
        `)
        .or(`drug_a_id.in.(${drugIds.join(',')}),drug_b_id.in.(${drugIds.join(',')})`)
        .or(`drug_b_id.in.(${drugIds.join(',')}),drug_a_id.in.(${drugIds.join(',')})`);

      if (data) {
        // Filter to only show interactions between selected drugs
        const relevantInteractions = data.filter(interaction => {
          const drugAId = (interaction.drug_a as any)?.id;
          const drugBId = (interaction.drug_b as any)?.id;
          return drugIds.includes(drugAId) && drugIds.includes(drugBId);
        });
        setInteractions(relevantInteractions as any);
      }
    } catch (error) {
      console.error('Error checking interactions:', error);
    } finally {
      setChecking(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
      case 'majeure':
        return 'destructive';
      case 'warning':
      case 'modérée':
        return 'warning';
      default:
        return 'success';
    }
  };

  return (
    <div className="glass-card-elevated p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-info flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Vérificateur d'Interactions</h2>
          <p className="text-sm text-muted-foreground">Analysez les interactions médicamenteuses en temps réel</p>
        </div>
      </div>

      {/* Drug Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un médicament..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-secondary/30 border-border/50"
        />
        
        {/* Search Results Dropdown */}
        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl overflow-hidden z-20 shadow-lg"
            >
              {searchResults.map((drug) => (
                <button
                  key={drug.id}
                  onClick={() => addDrug(drug)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors text-left"
                >
                  <Pill className="w-4 h-4 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{drug.name_fr}</p>
                    <p className="text-xs text-muted-foreground">{drug.generic_name} • {drug.dosage}</p>
                  </div>
                  <Plus className="w-4 h-4 ml-auto text-muted-foreground" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Selected Drugs */}
      <div className="flex flex-wrap gap-2 mb-6 min-h-[40px]">
        <AnimatePresence>
          {selectedDrugs.map((drug) => (
            <motion.div
              key={drug.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Badge variant="secondary" className="gap-2 py-1.5 px-3">
                <Pill className="w-3 h-3" />
                {drug.name_fr}
                <button onClick={() => removeDrug(drug.id)} className="ml-1 hover:text-destructive">
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
        {selectedDrugs.length === 0 && (
          <p className="text-sm text-muted-foreground">Ajoutez au moins 2 médicaments pour vérifier les interactions</p>
        )}
      </div>

      {/* Check Button */}
      <Button
        onClick={checkInteractions}
        disabled={selectedDrugs.length < 2 || checking}
        className="w-full mb-6"
      >
        {checking ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
            Analyse en cours...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Vérifier les interactions ({selectedDrugs.length} médicaments)
          </>
        )}
      </Button>

      {/* Results */}
      <AnimatePresence>
        {interactions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <h3 className="font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              {interactions.length} interaction(s) détectée(s)
            </h3>
            
            {interactions.map((interaction) => (
              <motion.div
                key={interaction.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "p-4 rounded-xl border",
                  interaction.severity === 'majeure' || interaction.severity === 'critical'
                    ? "border-destructive/50 bg-destructive/5"
                    : interaction.severity === 'modérée' || interaction.severity === 'warning'
                    ? "border-warning/50 bg-warning/5"
                    : "border-success/50 bg-success/5"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <SeverityBadge 
                      severity={
                        interaction.severity === 'majeure' || interaction.severity === 'critical' 
                          ? 'critical' 
                          : interaction.severity === 'modérée' 
                          ? 'warning' 
                          : 'safe'
                      } 
                      pulse={interaction.severity === 'majeure' || interaction.severity === 'critical'}
                    />
                    <span className="text-sm font-medium">
                      {(interaction.drug_a as any)?.name_fr} + {(interaction.drug_b as any)?.name_fr}
                    </span>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {interaction.description_fr}
                </p>
                
                {interaction.recommendation_fr && (
                  <div className="pt-3 border-t border-border/50">
                    <p className="text-xs text-primary flex items-center gap-1">
                      💡 <span className="font-medium">Recommandation:</span> {interaction.recommendation_fr}
                    </p>
                  </div>
                )}

                {interaction.mechanism && (
                  <p className="text-xs text-muted-foreground mt-2">
                    <span className="font-medium">Mécanisme:</span> {interaction.mechanism}
                  </p>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}

        {selectedDrugs.length >= 2 && interactions.length === 0 && !checking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6"
          >
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
            <p className="font-semibold text-success">Aucune interaction détectée</p>
            <p className="text-sm text-muted-foreground">Ces médicaments peuvent être utilisés ensemble</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DrugInteractionChecker;

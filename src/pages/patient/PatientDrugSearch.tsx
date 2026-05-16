/**
 * PatientDrugSearch — Radar Stock  (UI v2)
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Search, MapPin, Phone, Package, Store, ChevronDown,
  Pill, AlertCircle, Loader2, Navigation, Wifi,
  CheckCircle, X, Map, List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlowCard } from '@/components/ui/glow-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { PharmacyMap } from '@/components/patient/PharmacyMap';
import { PatientSidebar } from '@/components/patient/PatientSidebar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar',
  'Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger',
  'Djelfa','Jijel','Sétif','Saïda','Skikda','Sidi Bel Abbès','Annaba','Guelma',
  'Constantine','Médéa','Mostaganem','MSila','Mascara','Ouargla','Oran','El Bayadh',
  'Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf','Tissemsilt',
  'El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma',
  'Aïn Témouchent','Ghardaïa','Relizane',
];

interface Drug {
  id: string;
  name_fr: string;
  generic_name: string;
  form?: string | null;
  dosage?: string | null;
}

interface PharmacyResult {
  pharmacy_id:   string;
  pharmacy_name: string;
  wilaya:        string;
  phone?:        string | null;
  current_stock: number;
  latitude?:     number | null;
  longitude?:    number | null;
}

export default function PatientDrugSearch() {
  const { profile } = useAuth();
  const [search, setSearch]             = useState('');
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [wilaya, setWilaya]             = useState('Alger');
  const [showDropdown, setShowDropdown] = useState(false);
  const [viewMode, setViewMode]         = useState<'list' | 'map'>('list');
  const dropdownRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => { if (profile?.wilaya) setWilaya(profile.wilaya); }, [profile?.wilaya]);

  /* close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: suggestions = [], isFetching: searching } = useQuery({
    queryKey: ['drug-search', search],
    queryFn: async (): Promise<Drug[]> => {
      if (search.trim().length < 2) return [];
      const { data } = await supabase
        .from('drugs')
        .select('id,name_fr,generic_name,form,dosage')
        .or(`name_fr.ilike.%${search}%,generic_name.ilike.%${search}%,brand_name.ilike.%${search}%`)
        .limit(8);
      return (data ?? []) as Drug[];
    },
    enabled: search.trim().length >= 2,
  });

  const { data: pharmacies = [], isLoading: loadingPharmacies } = useQuery({
    queryKey: ['radar-stock', selectedDrug?.id, wilaya],
    queryFn: async (): Promise<PharmacyResult[]> => {
      if (!selectedDrug) return [];
      const { data } = await supabase
        .from('inventory')
        .select('current_stock,pharmacy_id,profiles!inventory_pharmacy_id_fkey(full_name,wilaya,phone,role,latitude,longitude)')
        .eq('drug_id', selectedDrug.id)
        .gt('current_stock', 0)
        .eq('profiles.role', 'pharmacist')
        .eq('profiles.wilaya', wilaya);
      return (data ?? []).map((r: any) => ({
        pharmacy_id:   r.pharmacy_id,
        pharmacy_name: r.profiles?.full_name ?? 'Pharmacie',
        wilaya:        r.profiles?.wilaya ?? wilaya,
        phone:         r.profiles?.phone ?? null,
        current_stock: r.current_stock,
        latitude:      r.profiles?.latitude  ?? null,
        longitude:     r.profiles?.longitude ?? null,
      }));
    },
    enabled: !!selectedDrug,
  });

  const handleSelect = (drug: Drug) => {
    setSelectedDrug(drug);
    setSearch(drug.name_fr);
    setShowDropdown(false);
  };

  const clearSearch = () => { setSelectedDrug(null); setSearch(''); };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <PatientSidebar />

      <main className="flex-1 overflow-auto">

        {/* ── Hero ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-cyan-500/10 via-background to-primary/5 border-b border-border/40">
          <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 left-1/3 w-56 h-56 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative p-6 md:p-10 max-w-3xl">
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 text-xs font-semibold mb-4">
                <Navigation className="w-3.5 h-3.5" />
                Radar Stock — Réseau Algérien
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                Trouver un{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-primary bg-clip-text text-transparent">
                  Médicament
                </span>
              </h1>
              <p className="text-muted-foreground text-sm md:text-base max-w-xl">
                Recherchez un médicament et découvrez en temps réel quelles pharmacies de votre wilaya ont du stock disponible.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="p-4 md:p-8 space-y-6 max-w-4xl">

          {/* ── Stats strip ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-3 gap-3"
          >
            {[
              { label: 'Médicament',      value: selectedDrug ? 1 : 0,    icon: Pill,      color: 'primary', text: selectedDrug?.commercial_name },
              { label: 'Pharmacies',      value: pharmacies.length,        icon: Store,     color: 'success' },
              { label: 'Wilaya ciblée',   value: 1,                        icon: MapPin,    color: 'info',   text: wilaya },
            ].map((s, i) => (
              <GlowCard key={s.label} delay={i * 0.05} glowColor={s.color as any}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                    <p className="font-bold text-xl md:text-2xl font-display truncate">
                      {s.text
                        ? <span className="text-sm md:text-base leading-tight">{s.text}</span>
                        : <AnimatedCounter value={s.value} />}
                    </p>
                  </div>
                  <div className={`w-9 h-9 rounded-xl bg-${s.color}/10 flex items-center justify-center shrink-0`}>
                    <s.icon className={`w-4.5 h-4.5 text-${s.color}`} style={{ width: '1.1rem', height: '1.1rem' }} />
                  </div>
                </div>
              </GlowCard>
            ))}
          </motion.div>

          {/* ── Search card ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass-card p-5 md:p-6 space-y-4"
          >
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recherche</p>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Drug search input */}
              <div className="relative flex-1" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={search}
                    onChange={e => { setSearch(e.target.value); setSelectedDrug(null); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Ex : Paracetamol, Amoxicilline, Metformin…"
                    className="pl-10 pr-10 h-11 bg-secondary/40"
                  />
                  {search && (
                    <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {showDropdown && search.length >= 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
                    >
                      {searching ? (
                        <div className="p-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" /> Recherche en cours…
                        </div>
                      ) : suggestions.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">Aucun médicament trouvé pour « {search} »</div>
                      ) : (
                        suggestions.map(drug => (
                          <button
                            key={drug.id}
                            onClick={() => handleSelect(drug)}
                            className="w-full text-left px-4 py-3 hover:bg-primary/5 flex items-center gap-3 border-b border-border/30 last:border-b-0 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <Pill className="w-4 h-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{drug.name_fr}</p>
                              <p className="text-xs text-muted-foreground">
                                {drug.generic_name}{drug.dosage ? ` · ${drug.dosage}` : ''}
                                {drug.form ? ` · ${drug.form}` : ''}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Wilaya selector */}
              <div className="relative sm:w-52">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <select
                  value={wilaya}
                  onChange={e => setWilaya(e.target.value)}
                  className="w-full h-11 pl-10 pr-8 text-sm bg-secondary/40 border border-input rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            {selectedDrug && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/15"
              >
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-primary">{selectedDrug.commercial_name}</span>
                <span className="text-xs text-muted-foreground">({selectedDrug.generic_name})</span>
                <button onClick={clearSearch} className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <X className="w-3 h-3" /> Effacer
                </button>
              </motion.div>
            )}
          </motion.div>

          {/* ── Results ── */}
          <AnimatePresence mode="wait">
            {!selectedDrug ? (
              /* Empty prompt */
              <motion.div
                key="prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-10 md:p-16 text-center"
              >
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-primary/10 flex items-center justify-center">
                    <Navigation className="w-9 h-9 text-cyan-500" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Wifi className="w-2.5 h-2.5 text-primary-foreground" />
                  </span>
                </div>
                <h3 className="font-bold text-lg mb-2">Radar en attente</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Tapez le nom d'un médicament pour scanner les pharmacies disponibles dans votre wilaya
                </p>
              </motion.div>
            ) : loadingPharmacies ? (
              /* Skeleton */
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="h-24 rounded-2xl bg-secondary/30 animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
                ))}
              </motion.div>
            ) : pharmacies.length === 0 ? (
              /* No results */
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass-card p-10 text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-warning" />
                </div>
                <h3 className="font-bold text-base mb-1">Aucune pharmacie trouvée</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Aucune pharmacie à <strong>{wilaya}</strong> n'a{' '}
                  <strong>{selectedDrug.commercial_name}</strong> en stock actuellement.
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Essayez une wilaya voisine ou contactez directement vos pharmacies locales.
                </p>
              </motion.div>
            ) : (
              /* Results */
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                {/* Results header + view toggle */}
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <p className="text-sm font-medium">
                      <span className="text-success font-bold">{pharmacies.length}</span> pharmacie(s) avec stock — {wilaya}
                    </p>
                  </div>
                  {/* List / Map toggle */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary/40 border border-border/40">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        viewMode === 'list'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <List className="w-3.5 h-3.5" /> Liste
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        viewMode === 'map'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Map className="w-3.5 h-3.5" /> Carte
                    </button>
                  </div>
                </div>

                {/* MAP VIEW */}
                {viewMode === 'map' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <PharmacyMap
                      pharmacies={pharmacies}
                      targetWilaya={wilaya}
                      drugName={selectedDrug?.name_fr ?? ''}
                    />
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      🟢 Cliquez sur un marqueur pour voir les détails et obtenir l'itinéraire
                    </p>
                  </motion.div>
                )}

                {/* LIST VIEW */}
                {viewMode === 'list' && (
                  <div className="space-y-3">
                    {pharmacies.map((p, idx) => (
                      <motion.div
                        key={p.pharmacy_id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        className="glass-card p-4 md:p-5 flex items-center gap-4 group hover:border-success/30 hover:shadow-md transition-all duration-300"
                      >
                        {/* Rank badge */}
                        <div className="w-8 h-8 rounded-full bg-secondary/60 border border-border/50 flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                          {idx + 1}
                        </div>

                        {/* Icon */}
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-success/20 to-emerald-400/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <Store className="w-6 h-6 text-success" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="font-semibold text-sm">{p.pharmacy_name}</p>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-success/40 text-success gap-1">
                              <CheckCircle className="w-2.5 h-2.5" /> En stock
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {p.wilaya}
                            </span>
                            {p.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {p.phone}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stock + CTAs */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Stock</p>
                            <p className="font-bold text-success text-lg leading-tight">{p.current_stock}</p>
                          </div>
                          {/* Directions button */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-9 gap-1.5 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors"
                            onClick={() => {
                              const query = encodeURIComponent(`${p.pharmacy_name} ${p.wilaya} Algérie`);
                              window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}&travelmode=driving`, '_blank');
                            }}
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Itinéraire</span>
                          </Button>
                          {p.phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 gap-1.5 hover:bg-success/10 hover:border-success/40 hover:text-success transition-colors"
                              onClick={() => window.open(`tel:${p.phone}`)}
                            >
                              <Phone className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Appeler</span>
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </main>
    </div>
  );
}

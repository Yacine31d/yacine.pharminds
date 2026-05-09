import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  Search, 
  Plus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Pill,
  RefreshCw,
  Edit,
  Save,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GlowCard } from '@/components/ui/glow-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { PharmacistSidebar } from '@/components/pharmacist/Sidebar';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface Drug {
  id: string;
  name_fr: string;
  name_ar: string;
  generic_name: string;
  brand_name: string | null;
  dosage: string | null;
  form: string | null;
  manufacturer: string | null;
  price_dz: number | null;
  cnas_reimbursable: boolean | null;
  is_generic: boolean | null;
  atc_code: string | null;
}

interface InventoryItem {
  id: string;
  drug_id: string;
  current_stock: number;
  min_stock_threshold: number;
  max_stock: number | null;
  batch_number: string | null;
  expiry_date: string | null;
  unit: string | null;
  drug?: Drug;
}

export default function PharmacistInventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'name' | 'stock' | 'price'>('name');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState<number>(0);
  const [addMode, setAddMode] = useState<'existing' | 'new'>('existing');
  const [newProduct, setNewProduct] = useState({
    drug_id: '',
    current_stock: 0,
    min_stock_threshold: 20,
    max_stock: 200,
    batch_number: '',
    expiry_date: '',
    unit: 'unités'
  });
  const [newDrug, setNewDrug] = useState({
    name_fr: '',
    name_ar: '',
    generic_name: '',
    dosage: '',
    form: 'Comprimé',
    price_dz: 0,
    cnas_reimbursable: true,
    is_generic: true
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch drugs
      const { data: drugsData, error: drugsError } = await supabase
        .from('drugs')
        .select('*')
        .order('name_fr');

      if (drugsError) throw drugsError;
      setDrugs(drugsData || []);

      // Fetch inventory with drug details
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select(`
          *,
          drug:drugs(*)
        `)
        .order('current_stock', { ascending: true });

      if (inventoryError) throw inventoryError;
      setInventory(inventoryData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // ── Bug 5 fix: static Tailwind class map (dynamic `bg-${color}/10` gets purged) ──
  const COLOR_CLASSES: Record<string, { bg: string; text: string }> = {
    primary:     { bg: 'bg-primary/10',     text: 'text-primary' },
    destructive: { bg: 'bg-destructive/10', text: 'text-destructive' },
    success:     { bg: 'bg-success/10',     text: 'text-success' },
    info:        { bg: 'bg-info/10',        text: 'text-info' },
  };

  // Create a map of drug_id to inventory for quick lookup
  const inventoryMap = new Map(inventory.map(inv => [inv.drug_id, inv]));

  // ── Bug 4 fix: never return fake stock numbers ────────────────────────────
  const getInventoryStatus = (drugId: string) => {
    const inv = inventoryMap.get(drugId);
    if (inv) {
      const { current_stock, min_stock_threshold } = inv;
      return {
        stock: current_stock as number,
        minStock: min_stock_threshold,
        status: (current_stock < min_stock_threshold ? 'low'
                : current_stock < min_stock_threshold * 2 ? 'medium'
                : 'good') as 'low' | 'medium' | 'good' | 'untracked',
        inventoryId: inv.id,
        hasInventory: true,
      };
    }
    // No real inventory record — show "Non suivi" instead of fake numbers
    return {
      stock: null as number | null,
      minStock: null as number | null,
      status: 'untracked' as 'low' | 'medium' | 'good' | 'untracked',
      inventoryId: null,
      hasInventory: false,
    };
  };

  const filteredDrugs = drugs
    .filter(drug => {
      const matchesSearch = 
        drug.name_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drug.name_ar.includes(searchQuery) ||
        drug.generic_name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (filterLowStock) {
        const inv = getInventoryStatus(drug.id);
        return matchesSearch && inv.status === 'low';
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name_fr.localeCompare(b.name_fr);
      if (sortBy === 'price') return (b.price_dz || 0) - (a.price_dz || 0);
      const invA = getInventoryStatus(a.id);
      const invB = getInventoryStatus(b.id);
      // Untracked items (null stock) sort to the bottom
      if (invA.stock === null && invB.stock === null) return 0;
      if (invA.stock === null) return 1;
      if (invB.stock === null) return -1;
      return invA.stock - invB.stock;
    });

  // Only count/value items that have a real inventory record
  const lowStockCount = inventory.filter(inv => inv.current_stock < inv.min_stock_threshold).length;
  const totalValue = inventory.reduce((sum, inv) => {
    const drug = drugs.find(d => d.id === inv.drug_id);
    return sum + (drug?.price_dz || 0) * inv.current_stock;
  }, 0);

  const stats = [
    { label: 'Total Produits', value: drugs.length, icon: Package, color: 'primary' },
    { label: 'Stock Faible', value: lowStockCount, icon: AlertTriangle, color: 'destructive' },
    { label: 'Valeur Stock', value: Math.round(totalValue / 1000), suffix: 'K DA', icon: TrendingUp, color: 'success' },
    { label: 'Remboursables CNAS', value: drugs.filter(d => d.cnas_reimbursable).length, icon: Pill, color: 'info' },
  ];

  const handleAddNewDrug = async () => {
    if (!newDrug.name_fr || !newDrug.generic_name) {
      toast.error('Veuillez remplir le nom et le DCI du médicament');
      return;
    }

    setIsSubmitting(true);

    try {
      // First create the new drug
      const { data: drugData, error: drugError } = await supabase
        .from('drugs')
        .insert({
          name_fr: newDrug.name_fr,
          name_ar: newDrug.name_ar || newDrug.name_fr,
          generic_name: newDrug.generic_name,
          dosage: newDrug.dosage || null,
          form: newDrug.form,
          price_dz: newDrug.price_dz || null,
          cnas_reimbursable: newDrug.cnas_reimbursable,
          is_generic: newDrug.is_generic
        })
        .select()
        .single();

      if (drugError) throw drugError;

      // Then add to inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .insert({
          drug_id: drugData.id,
          current_stock: newProduct.current_stock,
          min_stock_threshold: newProduct.min_stock_threshold,
          max_stock: newProduct.max_stock,
          batch_number: newProduct.batch_number || null,
          expiry_date: newProduct.expiry_date || null,
          unit: newProduct.unit
        })
        .select(`*, drug:drugs(*)`)
        .single();

      if (inventoryError) throw inventoryError;

      setDrugs(prev => [...prev, drugData]);
      setInventory(prev => [...prev, inventoryData]);
      resetForms();
      setIsAddDialogOpen(false);
      toast.success('Nouveau médicament créé et ajouté à l\'inventaire');
    } catch (error) {
      console.error('Error creating drug:', error);
      toast.error('Erreur lors de la création du médicament');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddProduct = async () => {
    if (addMode === 'new') {
      return handleAddNewDrug();
    }

    if (!newProduct.drug_id) {
      toast.error('Veuillez sélectionner un médicament');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('inventory')
        .insert({
          drug_id: newProduct.drug_id,
          current_stock: newProduct.current_stock,
          min_stock_threshold: newProduct.min_stock_threshold,
          max_stock: newProduct.max_stock,
          batch_number: newProduct.batch_number || null,
          expiry_date: newProduct.expiry_date || null,
          unit: newProduct.unit
        })
        .select(`*, drug:drugs(*)`)
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Ce médicament est déjà dans l\'inventaire');
        } else {
          throw error;
        }
        return;
      }

      setInventory(prev => [...prev, data]);
      resetForms();
      setIsAddDialogOpen(false);
      toast.success('Produit ajouté à l\'inventaire');
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Erreur lors de l\'ajout du produit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForms = () => {
    setNewProduct({
      drug_id: '',
      current_stock: 0,
      min_stock_threshold: 20,
      max_stock: 200,
      batch_number: '',
      expiry_date: '',
      unit: 'unités'
    });
    setNewDrug({
      name_fr: '',
      name_ar: '',
      generic_name: '',
      dosage: '',
      form: 'Comprimé',
      price_dz: 0,
      cnas_reimbursable: true,
      is_generic: true
    });
    setAddMode('existing');
  };

  const handleUpdateStock = async (drugId: string) => {
    const inv = inventoryMap.get(drugId);
    if (!inv) {
      toast.error('Produit non trouvé dans l\'inventaire');
      return;
    }

    try {
      const { error } = await supabase
        .from('inventory')
        .update({ current_stock: editStockValue })
        .eq('id', inv.id);

      if (error) throw error;

      setInventory(prev => prev.map(item => 
        item.id === inv.id ? { ...item, current_stock: editStockValue } : item
      ));
      setEditingStock(null);
      toast.success('Stock mis à jour');
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const startEditingStock = (drugId: string) => {
    const inv = getInventoryStatus(drugId);
    setEditingStock(drugId);
    setEditStockValue(inv.stock);
  };

  // Get drugs not yet in inventory for the add dialog
  const availableDrugs = drugs.filter(d => !inventoryMap.has(d.id));
  const hasAvailableDrugs = availableDrugs.length > 0;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <PharmacistSidebar />
      
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-2xl md:text-3xl font-bold mb-1 md:mb-2"
            >
              Gestion du <span className="text-gradient">Stock</span>
            </motion.h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Suivi et optimisation de l'inventaire pharmaceutique
            </p>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="outline" onClick={fetchData} className="gap-2" size="sm">
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Actualiser</span>
            </Button>
            <Button className="gap-2" size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter Produit</span>
              <span className="sm:hidden">Ajouter</span>
            </Button>
          </div>
        </div>

        {/* Add Product Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForms(); }}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Ajouter un Produit à l'Inventaire
              </DialogTitle>
            </DialogHeader>
            
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-secondary/30 rounded-lg">
              <Button
                variant={addMode === 'existing' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setAddMode('existing')}
              >
                Médicament existant
              </Button>
              <Button
                variant={addMode === 'new' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1"
                onClick={() => setAddMode('new')}
              >
                Nouveau médicament
              </Button>
            </div>

            <div className="space-y-4 py-4">
              {addMode === 'existing' ? (
                /* Existing Drug Selection */
                <div className="space-y-2">
                  <Label htmlFor="drug_select">Médicament *</Label>
                  {hasAvailableDrugs ? (
                    <Select 
                      value={newProduct.drug_id} 
                      onValueChange={(v) => setNewProduct(prev => ({ ...prev, drug_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un médicament" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {availableDrugs.map(drug => (
                          <SelectItem key={drug.id} value={drug.id}>
                            {drug.name_fr} - {drug.dosage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3 text-center text-muted-foreground bg-secondary/30 rounded-md border border-border">
                      <p className="text-sm">Tous les médicaments sont déjà dans l'inventaire.</p>
                      <p className="text-xs mt-1">Créez un nouveau médicament avec l'onglet ci-dessus.</p>
                    </div>
                  )}
                </div>
              ) : (
                /* New Drug Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Nom du médicament (FR) *</Label>
                      <Input
                        placeholder="Ex: Doliprane 500mg"
                        value={newDrug.name_fr}
                        onChange={(e) => setNewDrug(prev => ({ ...prev, name_fr: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Nom du médicament (AR)</Label>
                      <Input
                        placeholder="الاسم بالعربية"
                        value={newDrug.name_ar}
                        onChange={(e) => setNewDrug(prev => ({ ...prev, name_ar: e.target.value }))}
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>DCI / Nom générique *</Label>
                      <Input
                        placeholder="Ex: Paracetamol"
                        value={newDrug.generic_name}
                        onChange={(e) => setNewDrug(prev => ({ ...prev, generic_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dosage</Label>
                      <Input
                        placeholder="Ex: 500mg"
                        value={newDrug.dosage}
                        onChange={(e) => setNewDrug(prev => ({ ...prev, dosage: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Forme</Label>
                      <Select 
                        value={newDrug.form} 
                        onValueChange={(v) => setNewDrug(prev => ({ ...prev, form: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Comprimé">Comprimé</SelectItem>
                          <SelectItem value="Gélule">Gélule</SelectItem>
                          <SelectItem value="Sirop">Sirop</SelectItem>
                          <SelectItem value="Suspension">Suspension</SelectItem>
                          <SelectItem value="Inhalateur">Inhalateur</SelectItem>
                          <SelectItem value="Injection">Injection</SelectItem>
                          <SelectItem value="Crème">Crème</SelectItem>
                          <SelectItem value="Pommade">Pommade</SelectItem>
                          <SelectItem value="Spray nasal">Spray nasal</SelectItem>
                          <SelectItem value="Gouttes">Gouttes</SelectItem>
                          <SelectItem value="Sachet">Sachet</SelectItem>
                          <SelectItem value="Pastille">Pastille</SelectItem>
                          <SelectItem value="Suppositoire">Suppositoire</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prix (DA)</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={newDrug.price_dz || ''}
                        onChange={(e) => setNewDrug(prev => ({ ...prev, price_dz: parseFloat(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="flex items-center gap-4 col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newDrug.cnas_reimbursable}
                          onChange={(e) => setNewDrug(prev => ({ ...prev, cnas_reimbursable: e.target.checked }))}
                          className="w-4 h-4 rounded border-border"
                        />
                        <span className="text-sm">Remboursable CNAS</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newDrug.is_generic}
                          onChange={(e) => setNewDrug(prev => ({ ...prev, is_generic: e.target.checked }))}
                          className="w-4 h-4 rounded border-border"
                        />
                        <span className="text-sm">Générique</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Stock Information - Common for both modes */}
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium mb-3">Informations de stock</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_stock">Stock actuel *</Label>
                    <Input
                      id="current_stock"
                      type="number"
                      min={0}
                      value={newProduct.current_stock}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, current_stock: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min_stock">Seuil minimum</Label>
                    <Input
                      id="min_stock"
                      type="number"
                      min={0}
                      value={newProduct.min_stock_threshold}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, min_stock_threshold: parseInt(e.target.value) || 20 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit">Unité</Label>
                    <Select 
                      value={newProduct.unit} 
                      onValueChange={(v) => setNewProduct(prev => ({ ...prev, unit: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unités">Unités</SelectItem>
                        <SelectItem value="boîtes">Boîtes</SelectItem>
                        <SelectItem value="flacons">Flacons</SelectItem>
                        <SelectItem value="tubes">Tubes</SelectItem>
                        <SelectItem value="sachets">Sachets</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batch_number">N° Lot</Label>
                    <Input
                      id="batch_number"
                      placeholder="Ex: LOT2024A123"
                      value={newProduct.batch_number}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, batch_number: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="expiry_date">Date d'expiration</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={newProduct.expiry_date}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, expiry_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForms(); }}>
                Annuler
              </Button>
              <Button 
                onClick={handleAddProduct} 
                disabled={isSubmitting || (addMode === 'existing' && !hasAvailableDrugs)}
              >
                {isSubmitting ? 'Ajout...' : addMode === 'new' ? 'Créer et Ajouter' : 'Ajouter au Stock'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          {stats.map((stat, index) => (
            <GlowCard key={stat.label} delay={index * 0.05} glowColor={stat.color as any}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-display font-bold">
                    {loading ? '...' : <AnimatedCounter value={stat.value} />}
                    {stat.suffix && <span className="text-lg ml-1">{stat.suffix}</span>}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${COLOR_CLASSES[stat.color]?.bg ?? 'bg-primary/10'}`}>
                  <stat.icon className={`w-5 h-5 ${COLOR_CLASSES[stat.color]?.text ?? 'text-primary'}`} />
                </div>
              </div>
            </GlowCard>
          ))}
        </motion.div>

        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 mb-6"
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher par nom, DCI, ou code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/30 border-border/50"
              />
            </div>
            
            <Button 
              variant={filterLowStock ? "default" : "outline"} 
              onClick={() => setFilterLowStock(!filterLowStock)}
              className="gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Stock Faible ({lowStockCount})
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Trier:</span>
              <Button 
                variant={sortBy === 'name' ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setSortBy('name')}
              >
                Nom
              </Button>
              <Button 
                variant={sortBy === 'stock' ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setSortBy('stock')}
              >
                Stock
              </Button>
              <Button 
                variant={sortBy === 'price' ? "secondary" : "ghost"} 
                size="sm"
                onClick={() => setSortBy('price')}
              >
                Prix
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Inventory Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Médicament</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Forme / Dosage</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Stock</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Prix</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Statut</th>
                  <th className="text-left p-4 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Chargement...
                    </td>
                  </tr>
                ) : filteredDrugs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Aucun médicament trouvé
                    </td>
                  </tr>
                ) : (
                  filteredDrugs.slice(0, 20).map((drug, index) => {
                    const inv = getInventoryStatus(drug.id);
                    const isEditing = editingStock === drug.id;
                    
                    return (
                      <motion.tr 
                        key={drug.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="border-b border-border/30 hover:bg-secondary/20 transition-colors"
                      >
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{drug.name_fr}</p>
                            <p className="text-xs text-muted-foreground">{drug.generic_name}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{drug.form} • {drug.dosage}</span>
                        </td>
                        <td className="p-4">
                          {isEditing && inv.hasInventory ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={0}
                                value={editStockValue}
                                onChange={(e) => setEditStockValue(parseInt(e.target.value) || 0)}
                                className="w-20 h-8"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => handleUpdateStock(drug.id)}
                              >
                                <Save className="w-4 h-4 text-success" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => setEditingStock(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : inv.hasInventory ? (
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${inv.status === 'low' ? 'text-destructive' : ''}`}>
                                {inv.stock}
                              </span>
                              {inv.status === 'low' && (
                                <TrendingDown className="w-4 h-4 text-destructive" />
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={() => startEditingStock(drug.id)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            /* Bug 4 fix: no fake numbers — show clear "not tracked" badge */
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50">
                              Non suivi
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {drug.price_dz ? (
                            <span className="font-medium">{drug.price_dz} DA</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                inv.status === 'low'       ? 'destructive'
                                : inv.status === 'medium'  ? 'secondary'
                                : inv.status === 'untracked' ? 'outline'
                                : 'default'
                              }
                            >
                              {inv.status === 'low'       ? 'Faible'
                               : inv.status === 'medium'  ? 'Moyen'
                               : inv.status === 'untracked' ? '—'
                               : 'OK'}
                            </Badge>
                            {drug.cnas_reimbursable && (
                              <Badge variant="outline" className="text-xs">CNAS</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {inv.hasInventory ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => startEditingStock(drug.id)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Modifier
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setNewProduct(prev => ({ ...prev, drug_id: drug.id }));
                                  setIsAddDialogOpen(true);
                                }}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Ajouter
                              </Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {filteredDrugs.length > 20 && (
            <div className="p-4 border-t border-border/50 text-center">
              <p className="text-sm text-muted-foreground">
                Affichage de 20 sur {filteredDrugs.length} produits
              </p>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Plus, 
  Pill, 
  Edit2, 
  Trash2, 
  Save,
  X,
  Filter,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { AIChatWidget } from '@/components/chat/AIChatWidget';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  created_at: string;
}

const AdminDrugManagement = () => {
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [filteredDrugs, setFilteredDrugs] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGeneric, setFilterGeneric] = useState<boolean | null>(null);
  const [filterCnas, setFilterCnas] = useState<boolean | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [formData, setFormData] = useState({
    name_fr: '',
    name_ar: '',
    generic_name: '',
    brand_name: '',
    dosage: '',
    form: '',
    manufacturer: '',
    price_dz: '',
    cnas_reimbursable: false,
    is_generic: false,
    atc_code: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchDrugs();
  }, []);

  useEffect(() => {
    filterDrugs();
  }, [drugs, searchQuery, filterGeneric, filterCnas]);

  const fetchDrugs = async () => {
    try {
      const { data, error } = await supabase
        .from('drugs')
        .select('*')
        .order('name_fr', { ascending: true });

      if (error) throw error;
      setDrugs(data || []);
    } catch (error) {
      console.error('Error fetching drugs:', error);
      toast.error('Failed to load drugs');
    } finally {
      setLoading(false);
    }
  };

  const filterDrugs = () => {
    let filtered = [...drugs];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(drug => 
        drug.name_fr.toLowerCase().includes(query) ||
        drug.name_ar.includes(query) ||
        drug.generic_name.toLowerCase().includes(query) ||
        drug.brand_name?.toLowerCase().includes(query)
      );
    }

    if (filterGeneric !== null) {
      filtered = filtered.filter(drug => drug.is_generic === filterGeneric);
    }

    if (filterCnas !== null) {
      filtered = filtered.filter(drug => drug.cnas_reimbursable === filterCnas);
    }

    setFilteredDrugs(filtered);
  };

  const resetForm = () => {
    setFormData({
      name_fr: '',
      name_ar: '',
      generic_name: '',
      brand_name: '',
      dosage: '',
      form: '',
      manufacturer: '',
      price_dz: '',
      cnas_reimbursable: false,
      is_generic: false,
      atc_code: ''
    });
    setEditingDrug(null);
  };

  const openEditDialog = (drug: Drug) => {
    setEditingDrug(drug);
    setFormData({
      name_fr: drug.name_fr,
      name_ar: drug.name_ar,
      generic_name: drug.generic_name,
      brand_name: drug.brand_name || '',
      dosage: drug.dosage || '',
      form: drug.form || '',
      manufacturer: drug.manufacturer || '',
      price_dz: drug.price_dz?.toString() || '',
      cnas_reimbursable: drug.cnas_reimbursable || false,
      is_generic: drug.is_generic || false,
      atc_code: drug.atc_code || ''
    });
    setIsAddDialogOpen(true);
  };

  const saveDrug = async () => {
    if (!formData.name_fr || !formData.name_ar || !formData.generic_name) {
      toast.error('Please fill in required fields');
      return;
    }

    setSaving(true);
    try {
      const drugData = {
        name_fr: formData.name_fr,
        name_ar: formData.name_ar,
        generic_name: formData.generic_name,
        brand_name: formData.brand_name || null,
        dosage: formData.dosage || null,
        form: formData.form || null,
        manufacturer: formData.manufacturer || null,
        price_dz: formData.price_dz ? parseFloat(formData.price_dz) : null,
        cnas_reimbursable: formData.cnas_reimbursable,
        is_generic: formData.is_generic,
        atc_code: formData.atc_code || null
      };

      if (editingDrug) {
        const { error } = await supabase
          .from('drugs')
          .update(drugData)
          .eq('id', editingDrug.id);
        
        if (error) throw error;
        toast.success('Drug updated successfully');
      } else {
        const { error } = await supabase
          .from('drugs')
          .insert(drugData);
        
        if (error) throw error;
        toast.success('Drug added successfully');
      }

      setIsAddDialogOpen(false);
      resetForm();
      fetchDrugs();
    } catch (error) {
      console.error('Error saving drug:', error);
      toast.error('Failed to save drug');
    } finally {
      setSaving(false);
    }
  };

  const deleteDrug = async (id: string) => {
    if (!confirm('Are you sure you want to delete this drug?')) return;

    try {
      const { error } = await supabase
        .from('drugs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Drug deleted');
      fetchDrugs();
    } catch (error) {
      console.error('Error deleting drug:', error);
      toast.error('Failed to delete drug');
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-bold mb-2"
        >
          Drug <span className="text-gradient">Management</span>
        </motion.h1>
        <p className="text-muted-foreground">
          Manage the Algerian drug database
        </p>
      </div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-4 mb-6"
      >
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search drugs by name (FR/AR), generic name, or brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Generic</span>
            <Button
              variant={filterGeneric === true ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterGeneric(filterGeneric === true ? null : true)}
            >
              Yes
            </Button>
            <Button
              variant={filterGeneric === false ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterGeneric(filterGeneric === false ? null : false)}
            >
              No
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">CNAS</span>
            <Button
              variant={filterCnas === true ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCnas(filterCnas === true ? null : true)}
            >
              Yes
            </Button>
            <Button
              variant={filterCnas === false ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCnas(filterCnas === false ? null : false)}
            >
              No
            </Button>
          </div>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Drug
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingDrug ? 'Edit Drug' : 'Add New Drug'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name (French) *</label>
                <Input
                  value={formData.name_fr}
                  onChange={(e) => setFormData({ ...formData, name_fr: e.target.value })}
                  placeholder="Paracétamol"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Name (Arabic) *</label>
                <Input
                  value={formData.name_ar}
                  onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                  placeholder="باراسيتامول"
                  className="text-right"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Generic Name *</label>
                <Input
                  value={formData.generic_name}
                  onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                  placeholder="Paracetamol"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Brand Name</label>
                <Input
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                  placeholder="Doliprane"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Dosage</label>
                <Input
                  value={formData.dosage}
                  onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                  placeholder="500mg"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Form</label>
                <Input
                  value={formData.form}
                  onChange={(e) => setFormData({ ...formData, form: e.target.value })}
                  placeholder="Tablet, Syrup, etc."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Manufacturer</label>
                <Input
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="Saidal, Biopharm, etc."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Price (DZD)</label>
                <Input
                  type="number"
                  value={formData.price_dz}
                  onChange={(e) => setFormData({ ...formData, price_dz: e.target.value })}
                  placeholder="250"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">ATC Code</label>
                <Input
                  value={formData.atc_code}
                  onChange={(e) => setFormData({ ...formData, atc_code: e.target.value })}
                  placeholder="N02BE01"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_generic}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_generic: checked })}
                  />
                  <label className="text-sm">Generic</label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.cnas_reimbursable}
                    onCheckedChange={(checked) => setFormData({ ...formData, cnas_reimbursable: checked })}
                  />
                  <label className="text-sm">CNAS Reimbursable</label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={saveDrug} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Drug
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{drugs.length}</p>
          <p className="text-sm text-muted-foreground">Total Drugs</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-info">{drugs.filter(d => d.is_generic).length}</p>
          <p className="text-sm text-muted-foreground">Generic</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-success">{drugs.filter(d => d.cnas_reimbursable).length}</p>
          <p className="text-sm text-muted-foreground">CNAS Covered</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-warning">{filteredDrugs.length}</p>
          <p className="text-sm text-muted-foreground">Filtered Results</p>
        </div>
      </div>

      {/* Drugs Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card-elevated overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/20">
                <th className="text-left py-3 px-4 text-sm font-medium">Drug Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Generic Name</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Dosage</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Form</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Price</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filteredDrugs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No drugs found
                  </td>
                </tr>
              ) : (
                filteredDrugs.map((drug, index) => (
                  <motion.tr
                    key={drug.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-border/30 hover:bg-secondary/10"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{drug.name_fr}</p>
                        <p className="text-sm text-muted-foreground font-arabic">{drug.name_ar}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm">{drug.generic_name}</p>
                      {drug.brand_name && (
                        <p className="text-xs text-muted-foreground">{drug.brand_name}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">{drug.dosage || '-'}</td>
                    <td className="py-3 px-4 text-sm">{drug.form || '-'}</td>
                    <td className="py-3 px-4 text-sm">
                      {drug.price_dz ? `${drug.price_dz} DA` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {drug.is_generic && (
                          <Badge variant="outline" className="text-xs bg-info/10 text-info border-info/30">
                            Generic
                          </Badge>
                        )}
                        {drug.cnas_reimbursable && (
                          <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                            CNAS
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(drug)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteDrug(drug.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      <AIChatWidget userRole="admin" />
    </AdminLayout>
  );
};

export default AdminDrugManagement;

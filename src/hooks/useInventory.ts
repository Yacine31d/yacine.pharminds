import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesUpdate } from '@/integrations/supabase/types';

type Inventory = Tables<'inventory'>;

interface InventoryWithDrug extends Inventory {
  drugs: Tables<'drugs'> | null;
}

export function useInventory() {
  return useQuery<InventoryWithDrug[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(`*, drugs(*)`)
        .order('current_stock', { ascending: true });
      if (error) throw error;
      return (data as InventoryWithDrug[]) || [];
    },
  });
}

export function useLowStockItems() {
  return useQuery<InventoryWithDrug[]>({
    queryKey: ['inventory', 'low-stock'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select(`*, drugs(*)`)
        .lt('current_stock', 20)
        .order('current_stock', { ascending: true });
      if (error) throw error;
      return (data as InventoryWithDrug[]) || [];
    },
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: TablesUpdate<'inventory'>;
    }) => {
      const { data, error } = await supabase
        .from('inventory')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
  });
}

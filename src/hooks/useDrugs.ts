import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Drug = Tables<'drugs'>;
type DrugInteraction = Tables<'drug_interactions'>;

export function useDrugs(search?: string) {
  return useQuery<Drug[]>({
    queryKey: ['drugs', search],
    queryFn: async () => {
      let query = supabase
        .from('drugs')
        .select('*')
        .order('name_fr');

      if (search?.trim()) {
        query = query.or(
          `name_fr.ilike.%${search}%,name_ar.ilike.%${search}%,generic_name.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useDrugInteractions(drugId?: string) {
  return useQuery<DrugInteraction[]>({
    queryKey: ['drug_interactions', drugId],
    queryFn: async () => {
      let query = supabase
        .from('drug_interactions')
        .select(`
          *,
          drug_a:drugs!drug_interactions_drug_a_id_fkey(*),
          drug_b:drugs!drug_interactions_drug_b_id_fkey(*)
        `)
        .order('created_at', { ascending: false });

      if (drugId) {
        query = query.or(`drug_a_id.eq.${drugId},drug_b_id.eq.${drugId}`);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
  });
}

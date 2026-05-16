import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';

type PatientMedication = Tables<'patient_medications'>;
type Ordonnance = Tables<'ordonnances'>;
type CarteChifa = Tables<'carte_chifa'>;

export function useMedications() {
  const { user } = useAuth();

  return useQuery<PatientMedication[]>({
    queryKey: ['patient_medications', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('patient_medications')
        .select('*, drugs(*)')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useOrdonnances() {
  const { user } = useAuth();

  return useQuery<Ordonnance[]>({
    queryKey: ['ordonnances', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('ordonnances')
        .select('*, ordonnance_medications(*)')
        .eq('user_id', user.id)
        .order('prescription_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useCarteChifa() {
  const { user } = useAuth();

  return useQuery<CarteChifa | null>({
    queryKey: ['carte_chifa', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('carte_chifa')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function usePatientStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['patient_stats', user?.id],
    queryFn: async () => {
      if (!user) return { medications: 0, ordonnances: 0, carteChifa: false };

      const [medsResult, ordoResult, chifaResult] = await Promise.all([
        supabase.from('patient_medications').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('ordonnances').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('carte_chifa').select('id').eq('user_id', user.id).maybeSingle()
      ]);

      return {
        medications: medsResult.count || 0,
        ordonnances: ordoResult.count || 0,
        carteChifa: !!chifaResult.data,
      };
    },
    enabled: !!user,
  });
}

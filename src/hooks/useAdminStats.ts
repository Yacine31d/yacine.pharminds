import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  pharmacists: number;
  patients: number;
  drugs: number;
  interactions: number;
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ['admin_stats'],
    queryFn: async () => {
      const [pharmacists, patients, drugs, interactions] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'pharmacist'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'patient'),
        supabase.from('drugs').select('id', { count: 'exact' }),
        supabase.from('drug_interactions').select('id', { count: 'exact' }),
      ]);

      return {
        pharmacists: pharmacists.count || 0,
        patients: patients.count || 0,
        drugs: drugs.count || 0,
        interactions: interactions.count || 0,
      };
    },
    staleTime: 30_000, // Cache for 30 seconds
  });
}

export function useRecentUsers(limit = 5) {
  return useQuery({
    queryKey: ['recent_users', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });
}

export function useWilayaDistribution() {
  return useQuery({
    queryKey: ['wilaya_distribution'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('wilaya');
      if (error) throw error;

      // Group and count by wilaya
      const counts: Record<string, number> = {};
      (data || []).forEach((profile) => {
        const wilaya = profile.wilaya || 'Non défini';
        counts[wilaya] = (counts[wilaya] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    },
    staleTime: 60_000, // Cache for 1 minute
  });
}

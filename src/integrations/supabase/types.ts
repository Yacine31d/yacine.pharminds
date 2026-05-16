export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      carte_chifa: {
        Row: {
          birth_date: string | null
          card_number: string
          coverage_type: string | null
          created_at: string
          expiry_date: string | null
          holder_name: string
          id: string
          is_active: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          card_number: string
          coverage_type?: string | null
          created_at?: string
          expiry_date?: string | null
          holder_name: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          card_number?: string
          coverage_type?: string | null
          created_at?: string
          expiry_date?: string | null
          holder_name?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          language: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          language?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      drug_interactions: {
        Row: {
          created_at: string
          description_ar: string
          description_fr: string
          drug_a_id: string
          drug_b_id: string
          id: string
          mechanism: string | null
          recommendation_ar: string | null
          recommendation_fr: string | null
          severity: string
          source: string | null
        }
        Insert: {
          created_at?: string
          description_ar: string
          description_fr: string
          drug_a_id: string
          drug_b_id: string
          id?: string
          mechanism?: string | null
          recommendation_ar?: string | null
          recommendation_fr?: string | null
          severity: string
          source?: string | null
        }
        Update: {
          created_at?: string
          description_ar?: string
          description_fr?: string
          drug_a_id?: string
          drug_b_id?: string
          id?: string
          mechanism?: string | null
          recommendation_ar?: string | null
          recommendation_fr?: string | null
          severity?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drug_interactions_drug_a_id_fkey"
            columns: ["drug_a_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_interactions_drug_b_id_fkey"
            columns: ["drug_b_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
        ]
      }
      drugs: {
        Row: {
          atc_code: string | null
          brand_name: string | null
          cnas_reimbursable: boolean | null
          created_at: string
          dosage: string | null
          form: string | null
          generic_name: string
          id: string
          is_generic: boolean | null
          manufacturer: string | null
          name_ar: string
          name_fr: string
          price_dz: number | null
        }
        Insert: {
          atc_code?: string | null
          brand_name?: string | null
          cnas_reimbursable?: boolean | null
          created_at?: string
          dosage?: string | null
          form?: string | null
          generic_name: string
          id?: string
          is_generic?: boolean | null
          manufacturer?: string | null
          name_ar: string
          name_fr: string
          price_dz?: number | null
        }
        Update: {
          atc_code?: string | null
          brand_name?: string | null
          cnas_reimbursable?: boolean | null
          created_at?: string
          dosage?: string | null
          form?: string | null
          generic_name?: string
          id?: string
          is_generic?: boolean | null
          manufacturer?: string | null
          name_ar?: string
          name_fr?: string
          price_dz?: number | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          batch_number: string | null
          created_at: string
          current_stock: number
          drug_id: string
          expiry_date: string | null
          id: string
          last_restocked_at: string | null
          last_stock_check_at: string | null
          max_stock: number | null
          min_stock_threshold: number
          pharmacy_id: string | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string
          current_stock?: number
          drug_id: string
          expiry_date?: string | null
          id?: string
          last_restocked_at?: string | null
          last_stock_check_at?: string | null
          max_stock?: number | null
          min_stock_threshold?: number
          pharmacy_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string
          current_stock?: number
          drug_id?: string
          expiry_date?: string | null
          id?: string
          last_restocked_at?: string | null
          last_stock_check_at?: string | null
          max_stock?: number | null
          min_stock_threshold?: number
          pharmacy_id?: string | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
        ]
      }
      low_stock_alerts: {
        Row: {
          drug_id: string
          email_sent_to: string | null
          id: string
          inventory_id: string
          is_resolved: boolean | null
          notified_at: string
          resolved_at: string | null
          stock_level: number
          threshold: number
        }
        Insert: {
          drug_id: string
          email_sent_to?: string | null
          id?: string
          inventory_id: string
          is_resolved?: boolean | null
          notified_at?: string
          resolved_at?: string | null
          stock_level: number
          threshold: number
        }
        Update: {
          drug_id?: string
          email_sent_to?: string | null
          id?: string
          inventory_id?: string
          is_resolved?: boolean | null
          notified_at?: string
          resolved_at?: string | null
          stock_level?: number
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "low_stock_alerts_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "low_stock_alerts_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          severity: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          severity?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          severity?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      ordonnance_medications: {
        Row: {
          created_at: string
          dosage: string | null
          drug_id: string | null
          duration: string | null
          frequency: string | null
          id: string
          instructions: string | null
          is_dispensed: boolean | null
          medication_name: string
          ordonnance_id: string
          quantity: number | null
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          drug_id?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          is_dispensed?: boolean | null
          medication_name: string
          ordonnance_id: string
          quantity?: number | null
        }
        Update: {
          created_at?: string
          dosage?: string | null
          drug_id?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          instructions?: string | null
          is_dispensed?: boolean | null
          medication_name?: string
          ordonnance_id?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordonnance_medications_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordonnance_medications_ordonnance_id_fkey"
            columns: ["ordonnance_id"]
            isOneToOne: false
            referencedRelation: "ordonnances"
            referencedColumns: ["id"]
          },
        ]
      }
      ordonnances: {
        Row: {
          created_at: string
          doctor_name: string
          doctor_specialty: string | null
          hospital_name: string | null
          id: string
          notes: string | null
          prescription_date: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doctor_name: string
          doctor_specialty?: string | null
          hospital_name?: string | null
          id?: string
          notes?: string | null
          prescription_date?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doctor_name?: string
          doctor_specialty?: string | null
          hospital_name?: string | null
          id?: string
          notes?: string | null
          prescription_date?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_medications: {
        Row: {
          created_at: string
          dosage: string | null
          drug_id: string
          end_date: string | null
          frequency: string | null
          id: string
          notes: string | null
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dosage?: string | null
          drug_id: string
          end_date?: string | null
          frequency?: string | null
          id?: string
          notes?: string | null
          start_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dosage?: string | null
          drug_id?: string
          end_date?: string | null
          frequency?: string | null
          id?: string
          notes?: string | null
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_medications_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "drugs"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_patients: {
        Row: {
          address: string | null
          allergies: string[] | null
          birth_date: string | null
          blood_type: string | null
          carte_chifa_number: string | null
          chronic_conditions: string[] | null
          created_at: string
          email: string | null
          full_name: string
          has_alerts: boolean | null
          id: string
          last_visit_at: string | null
          notes: string | null
          pharmacist_id: string
          phone: string | null
          updated_at: string
          wilaya: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string[] | null
          birth_date?: string | null
          blood_type?: string | null
          carte_chifa_number?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          email?: string | null
          full_name: string
          has_alerts?: boolean | null
          id?: string
          last_visit_at?: string | null
          notes?: string | null
          pharmacist_id: string
          phone?: string | null
          updated_at?: string
          wilaya?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string[] | null
          birth_date?: string | null
          blood_type?: string | null
          carte_chifa_number?: string | null
          chronic_conditions?: string[] | null
          created_at?: string
          email?: string | null
          full_name?: string
          has_alerts?: boolean | null
          id?: string
          last_visit_at?: string | null
          notes?: string | null
          pharmacist_id?: string
          phone?: string | null
          updated_at?: string
          wilaya?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          pharmacy_name: string | null
          phone: string | null
          preferred_language: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
          wilaya: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          pharmacy_name?: string | null
          phone?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
          wilaya?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          pharmacy_name?: string | null
          phone?: string | null
          preferred_language?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
          wilaya?: string | null
        }
        Relationships: []
      }
      scanned_prescriptions: {
        Row: {
          confidence_score: number | null
          created_at: string
          doctor_name: string | null
          extracted_medications: Json | null
          id: string
          image_url: string
          patient_name: string | null
          prescription_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          doctor_name?: string | null
          extracted_medications?: Json | null
          id?: string
          image_url: string
          patient_name?: string | null
          prescription_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          doctor_name?: string | null
          extracted_medications?: Json | null
          id?: string
          image_url?: string
          patient_name?: string | null
          prescription_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "pharmacist" | "patient"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "pharmacist", "patient"],
    },
  },
} as const

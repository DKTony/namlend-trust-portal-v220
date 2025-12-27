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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      approval_notifications: {
        Row: {
          approval_request_id: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          notification_type: string
          read_at: string | null
          recipient_id: string
          sent_at: string | null
          title: string
        }
        Insert: {
          approval_request_id?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          notification_type: string
          read_at?: string | null
          recipient_id: string
          sent_at?: string | null
          title: string
        }
        Update: {
          approval_request_id?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          notification_type?: string
          read_at?: string | null
          recipient_id?: string
          sent_at?: string | null
          title?: string
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          assigned_to: string | null
          auto_approve_eligible: boolean | null
          compliance_flags: Json | null
          created_at: string | null
          id: string
          metadata: Json | null
          priority: string | null
          reference_id: string | null
          reference_table: string | null
          request_data: Json
          request_type: string
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          risk_score: number | null
          status: string | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          assigned_to?: string | null
          auto_approve_eligible?: boolean | null
          compliance_flags?: Json | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          reference_id?: string | null
          reference_table?: string | null
          request_data: Json
          request_type: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          risk_score?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          assigned_to?: string | null
          auto_approve_eligible?: boolean | null
          compliance_flags?: Json | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          priority?: string | null
          reference_id?: string | null
          reference_table?: string | null
          request_data?: Json
          request_type?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          risk_score?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      disbursements: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          loan_id: string
          metadata: Json | null
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          status: string
          updated_at: string
          version: number | null
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          loan_id: string
          metadata?: Json | null
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string
          version?: number | null
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          loan_id?: string
          metadata?: Json | null
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string
          version?: number | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          document_type: string
          file_path: string
          id: string
          loan_id: string | null
          metadata: Json | null
          status: string | null
          updated_at: string
          user_id: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_path: string
          id?: string
          loan_id?: string | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string
          user_id: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_path?: string
          id?: string
          loan_id?: string | null
          metadata?: Json | null
          status?: string | null
          updated_at?: string
          user_id?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      loans: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          interest_rate: number
          metadata: Json | null
          purpose: string | null
          repayment_period: number
          status: string
          updated_at: string
          user_id: string
          version: number | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          interest_rate: number
          metadata?: Json | null
          purpose?: string | null
          repayment_period: number
          status?: string
          updated_at?: string
          user_id: string
          version?: number | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          interest_rate?: number
          metadata?: Json | null
          purpose?: string | null
          repayment_period?: number
          status?: string
          updated_at?: string
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
      payment_schedules: {
        Row: {
          amount_due: number
          amount_paid: number | null
          created_at: string
          due_date: string
          id: string
          installment_number: number
          interest_amount: number | null
          loan_id: string
          paid_at: string | null
          principal_amount: number | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_due: number
          amount_paid?: number | null
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          interest_amount?: number | null
          loan_id: string
          paid_at?: string | null
          principal_amount?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number | null
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          interest_amount?: number | null
          loan_id?: string
          paid_at?: string | null
          principal_amount?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          loan_id: string
          metadata: Json | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          loan_id: string
          metadata?: Json | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          loan_id?: string
          metadata?: Json | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_verified: boolean | null
          created_at: string
          credit_score: number | null
          default_vpa: string | null
          email: string | null
          employment_duration: number | null
          employment_status: string | null
          employment_verified: boolean | null
          existing_debt: number | null
          first_name: string | null
          id: string
          id_number: string | null
          last_login: string | null
          last_name: string | null
          monthly_debt_payments: number | null
          monthly_income: number | null
          phone: string | null
          phone_number: string | null
          risk_category: string | null
          updated_at: string
          user_id: string
          verified: boolean | null
          version: number | null
        }
        Insert: {
          address_verified?: boolean | null
          created_at?: string
          credit_score?: number | null
          default_vpa?: string | null
          email?: string | null
          employment_duration?: number | null
          employment_status?: string | null
          employment_verified?: boolean | null
          existing_debt?: number | null
          first_name?: string | null
          id?: string
          id_number?: string | null
          last_login?: string | null
          last_name?: string | null
          monthly_debt_payments?: number | null
          monthly_income?: number | null
          phone?: string | null
          phone_number?: string | null
          risk_category?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          version?: number | null
        }
        Update: {
          address_verified?: boolean | null
          created_at?: string
          credit_score?: number | null
          default_vpa?: string | null
          email?: string | null
          employment_duration?: number | null
          employment_status?: string | null
          employment_verified?: boolean | null
          existing_debt?: number | null
          first_name?: string | null
          id?: string
          id_number?: string | null
          last_login?: string | null
          last_name?: string | null
          monthly_debt_payments?: number | null
          monthly_income?: number | null
          phone?: string | null
          phone_number?: string | null
          risk_category?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          version?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          version: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          version?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          version?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      profiles_with_roles: {
        Row: {
          account_status: string | null
          created_at: string | null
          email: string | null
          employment_status: string | null
          first_name: string | null
          id: string | null
          is_admin: boolean | null
          is_client: boolean | null
          is_loan_officer: boolean | null
          last_login: string | null
          last_name: string | null
          monthly_income: number | null
          phone_number: string | null
          primary_role: Database["public"]["Enums"]["app_role"] | null
          roles: Database["public"]["Enums"]["app_role"][] | null
          updated_at: string | null
          user_id: string | null
          verified: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_user_role: {
        Args: {
          target_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      assign_user_role_with_validation: {
        Args: {
          target_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      get_profiles_with_roles_admin: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_role_filter?: Database["public"]["Enums"]["app_role"]
          p_search_term?: string
        }
        Returns: {
          account_status: string
          created_at: string
          email: string
          employment_status: string
          first_name: string
          is_admin: boolean
          is_client: boolean
          is_loan_officer: boolean
          last_name: string
          monthly_income: number
          phone_number: string
          primary_role: Database["public"]["Enums"]["app_role"]
          roles: Database["public"]["Enums"]["app_role"][]
          updated_at: string
          user_id: string
        }[]
      }
      get_user_roles: {
        Args: {
          target_user_id: string
        }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_admin_role: {
        Args: {
          check_user_id: string
        }
        Returns: boolean
      }
      has_staff_role: {
        Args: {
          check_user_id: string
        }
        Returns: boolean
      }
      remove_user_role: {
        Args: {
          target_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      set_user_roles: {
        Args: {
          target_roles: Database["public"]["Enums"]["app_role"][]
          target_user_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "client" | "loan_officer" | "admin"
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
      app_role: ["client", "loan_officer", "admin"],
    },
  },
} as const

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          created_at: string
          document_type: string
          file_path: string
          id: string
          status: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_path: string
          id?: string
          status?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_path?: string
          id?: string
          status?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      loan_reviews: {
        Row: {
          auto_approved: boolean | null
          created_at: string
          id: string
          loan_id: string
          new_status: string
          previous_status: string | null
          review_notes: string | null
          reviewer_id: string | null
        }
        Insert: {
          auto_approved?: boolean | null
          created_at?: string
          id?: string
          loan_id: string
          new_status: string
          previous_status?: string | null
          review_notes?: string | null
          reviewer_id?: string | null
        }
        Update: {
          auto_approved?: boolean | null
          created_at?: string
          id?: string
          loan_id?: string
          new_status?: string
          previous_status?: string | null
          review_notes?: string | null
          reviewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loan_reviews_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount: number
          created_at: string
          disbursed_at: string | null
          id: string
          interest_rate: number
          monthly_payment: number
          purpose: string | null
          status: string | null
          term_months: number
          total_repayment: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          disbursed_at?: string | null
          id?: string
          interest_rate: number
          monthly_payment: number
          purpose?: string | null
          status?: string | null
          term_months: number
          total_repayment: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          disbursed_at?: string | null
          id?: string
          interest_rate?: number
          monthly_payment?: number
          purpose?: string | null
          status?: string | null
          term_months?: number
          total_repayment?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          days_overdue: number | null
          id: string
          is_overdue: boolean | null
          loan_id: string
          paid_at: string | null
          payment_method: string
          payment_notes: string | null
          reference_number: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          days_overdue?: number | null
          id?: string
          is_overdue?: boolean | null
          loan_id: string
          paid_at?: string | null
          payment_method: string
          payment_notes?: string | null
          reference_number?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          days_overdue?: number | null
          id?: string
          is_overdue?: boolean | null
          loan_id?: string
          paid_at?: string | null
          payment_method?: string
          payment_notes?: string | null
          reference_number?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          credit_score: number | null
          employment_status: string | null
          first_name: string | null
          id: string
          id_number: string | null
          last_login: string | null
          last_name: string | null
          monthly_income: number | null
          phone_number: string | null
          risk_category: string | null
          updated_at: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          credit_score?: number | null
          employment_status?: string | null
          first_name?: string | null
          id?: string
          id_number?: string | null
          last_login?: string | null
          last_name?: string | null
          monthly_income?: number | null
          phone_number?: string | null
          risk_category?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          credit_score?: number | null
          employment_status?: string | null
          first_name?: string | null
          id?: string
          id_number?: string | null
          last_login?: string | null
          last_name?: string | null
          monthly_income?: number | null
          phone_number?: string | null
          risk_category?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
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
          role?: Database["public"]["Enums"]["app_role"]
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
      client_portfolio: {
        Row: {
          credit_score: number | null
          first_name: string | null
          last_loan_date: string | null
          last_name: string | null
          monthly_income: number | null
          outstanding_balance: number | null
          overdue_payments: number | null
          phone_number: string | null
          risk_category: string | null
          total_borrowed: number | null
          total_loans: number | null
          total_repaid: number | null
          user_id: string | null
          verified: boolean | null
        }
        Relationships: []
      }
      financial_summary: {
        Row: {
          overdue_payments: number | null
          pending_amount: number | null
          rejected_amount: number | null
          total_clients: number | null
          total_disbursed: number | null
          total_loans: number | null
          total_repayments: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
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

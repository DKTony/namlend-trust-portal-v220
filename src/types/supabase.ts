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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
        Relationships: [
          {
            foreignKeyName: "approval_notifications_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_notifications_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_expanded"
            referencedColumns: ["id"]
          },
        ]
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
      approval_workflow_history: {
        Row: {
          additional_data: Json | null
          approval_request_id: string
          change_reason: string | null
          changed_at: string | null
          changed_by: string
          id: string
          new_status: string
          previous_status: string | null
        }
        Insert: {
          additional_data?: Json | null
          approval_request_id: string
          change_reason?: string | null
          changed_at?: string | null
          changed_by: string
          id?: string
          new_status: string
          previous_status?: string | null
        }
        Update: {
          additional_data?: Json | null
          approval_request_id?: string
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string
          id?: string
          new_status?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_workflow_history_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_workflow_history_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_expanded"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_workflow_rules: {
        Row: {
          action: string
          action_data: Json | null
          conditions: Json
          created_at: string | null
          created_by: string
          id: string
          is_active: boolean | null
          request_type: string
          rule_name: string
          updated_at: string | null
        }
        Insert: {
          action: string
          action_data?: Json | null
          conditions: Json
          created_at?: string | null
          created_by: string
          id?: string
          is_active?: boolean | null
          request_type: string
          rule_name: string
          updated_at?: string | null
        }
        Update: {
          action?: string
          action_data?: Json | null
          conditions?: Json
          created_at?: string | null
          created_by?: string
          id?: string
          is_active?: boolean | null
          request_type?: string
          rule_name?: string
          updated_at?: string | null
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
      bank_transactions: {
        Row: {
          account_number: string | null
          bank_name: string | null
          created_at: string
          description: string | null
          id: string
          imported_at: string
          imported_by: string | null
          is_reconciled: boolean | null
          metadata: Json | null
          reconciliation_id: string | null
          transaction_amount: number
          transaction_date: string
          transaction_reference: string
          transaction_type: string
        }
        Insert: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          is_reconciled?: boolean | null
          metadata?: Json | null
          reconciliation_id?: string | null
          transaction_amount: number
          transaction_date: string
          transaction_reference: string
          transaction_type: string
        }
        Update: {
          account_number?: string | null
          bank_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          is_reconciled?: boolean | null
          metadata?: Json | null
          reconciliation_id?: string | null
          transaction_amount?: number
          transaction_date?: string
          transaction_reference?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "payment_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      collections_activities: {
        Row: {
          activity_status: string
          activity_type: string
          assigned_to: string | null
          contact_method: string | null
          created_at: string
          created_by: string
          id: string
          loan_id: string
          metadata: Json | null
          next_action_date: string | null
          next_action_type: string | null
          notes: string | null
          outcome: string | null
          promise_amount: number | null
          promise_date: string | null
          promise_fulfilled: boolean | null
          updated_at: string
        }
        Insert: {
          activity_status?: string
          activity_type: string
          assigned_to?: string | null
          contact_method?: string | null
          created_at?: string
          created_by: string
          id?: string
          loan_id: string
          metadata?: Json | null
          next_action_date?: string | null
          next_action_type?: string | null
          notes?: string | null
          outcome?: string | null
          promise_amount?: number | null
          promise_date?: string | null
          promise_fulfilled?: boolean | null
          updated_at?: string
        }
        Update: {
          activity_status?: string
          activity_type?: string
          assigned_to?: string | null
          contact_method?: string | null
          created_at?: string
          created_by?: string
          id?: string
          loan_id?: string
          metadata?: Json | null
          next_action_date?: string | null
          next_action_type?: string | null
          notes?: string | null
          outcome?: string | null
          promise_amount?: number | null
          promise_date?: string | null
          promise_fulfilled?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_activities_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "collections_queue"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "collections_activities_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_balance_summary"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "collections_activities_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      collections_interactions: {
        Row: {
          call_duration: number | null
          created_at: string | null
          created_by: string | null
          id: string
          interaction_type: string
          loan_id: string
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          outcome: string | null
        }
        Insert: {
          call_duration?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          interaction_type: string
          loan_id: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          outcome?: string | null
        }
        Update: {
          call_duration?: number | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          interaction_type?: string
          loan_id?: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_interactions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "collections_queue"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "collections_interactions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_balance_summary"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "collections_interactions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          channel: string
          content: string
          cost: number | null
          cost_currency: string | null
          created_at: string | null
          delivered_at: string | null
          direction: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          loan_id: string | null
          metadata: Json | null
          provider: string | null
          provider_message_id: string | null
          provider_status: string | null
          read_at: string | null
          recipient: string
          segments: number | null
          sender: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          template_code: string | null
          template_variables: Json | null
          user_id: string | null
        }
        Insert: {
          channel: string
          content: string
          cost?: number | null
          cost_currency?: string | null
          created_at?: string | null
          delivered_at?: string | null
          direction?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          loan_id?: string | null
          metadata?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          provider_status?: string | null
          read_at?: string | null
          recipient: string
          segments?: number | null
          sender?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_code?: string | null
          template_variables?: Json | null
          user_id?: string | null
        }
        Update: {
          channel?: string
          content?: string
          cost?: number | null
          cost_currency?: string | null
          created_at?: string | null
          delivered_at?: string | null
          direction?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          loan_id?: string | null
          metadata?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          provider_status?: string | null
          read_at?: string | null
          recipient?: string
          segments?: number | null
          sender?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_code?: string | null
          template_variables?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "collections_queue"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "communication_logs_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_balance_summary"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "communication_logs_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_reports: {
        Row: {
          file_url: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          period_end: string
          period_start: string
          report_data: Json
          report_type: string
          status: string | null
        }
        Insert: {
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          period_end: string
          period_start: string
          report_data: Json
          report_type: string
          status?: string | null
        }
        Update: {
          file_url?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          period_end?: string
          period_start?: string
          report_data?: Json
          report_type?: string
          status?: string | null
        }
        Relationships: []
      }
      credit_score_factors: {
        Row: {
          category: string
          created_at: string | null
          credit_score_id: string
          description: string | null
          factor: string
          id: string
          impact: string
          weight: number
        }
        Insert: {
          category: string
          created_at?: string | null
          credit_score_id: string
          description?: string | null
          factor: string
          id?: string
          impact: string
          weight: number
        }
        Update: {
          category?: string
          created_at?: string | null
          credit_score_id?: string
          description?: string | null
          factor?: string
          id?: string
          impact?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_score_factors_credit_score_id_fkey"
            columns: ["credit_score_id"]
            isOneToOne: false
            referencedRelation: "credit_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_scores: {
        Row: {
          affordability_score: number | null
          calculated_by: string | null
          created_at: string | null
          debt_to_income_ratio: number | null
          factors: Json | null
          id: string
          input_data: Json | null
          is_current: boolean | null
          loan_id: string | null
          max_approved_amount: number | null
          recommendations: string[] | null
          risk_level: string
          score: number
          score_range: string
          suggested_interest_rate: number | null
          user_id: string
        }
        Insert: {
          affordability_score?: number | null
          calculated_by?: string | null
          created_at?: string | null
          debt_to_income_ratio?: number | null
          factors?: Json | null
          id?: string
          input_data?: Json | null
          is_current?: boolean | null
          loan_id?: string | null
          max_approved_amount?: number | null
          recommendations?: string[] | null
          risk_level: string
          score: number
          score_range: string
          suggested_interest_rate?: number | null
          user_id: string
        }
        Update: {
          affordability_score?: number | null
          calculated_by?: string | null
          created_at?: string | null
          debt_to_income_ratio?: number | null
          factors?: Json | null
          id?: string
          input_data?: Json | null
          is_current?: boolean | null
          loan_id?: string | null
          max_approved_amount?: number | null
          recommendations?: string[] | null
          risk_level?: string
          score?: number
          score_range?: string
          suggested_interest_rate?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_scores_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "collections_queue"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "credit_scores_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_balance_summary"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "credit_scores_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      disbursements: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          ips_transaction_id: string | null
          loan_id: string
          method: string | null
          payee_vpa: string | null
          payment_reference: string | null
          processed_at: string | null
          processing_notes: string | null
          reference: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          ips_transaction_id?: string | null
          loan_id: string
          method?: string | null
          payee_vpa?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          processing_notes?: string | null
          reference?: string | null
          scheduled_at?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          ips_transaction_id?: string | null
          loan_id?: string
          method?: string | null
          payee_vpa?: string | null
          payment_reference?: string | null
          processed_at?: string | null
          processing_notes?: string | null
          reference?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disbursements_ips_transaction_id_fkey"
            columns: ["ips_transaction_id"]
            isOneToOne: false
            referencedRelation: "ips_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "collections_queue"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "disbursements_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_balance_summary"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "disbursements_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      document_verification_requirements: {
        Row: {
          created_at: string | null
          document_type: string
          file_path: string | null
          id: string
          is_required: boolean | null
          is_submitted: boolean | null
          is_verified: boolean | null
          rejection_reason: string | null
          submission_date: string | null
          updated_at: string | null
          user_id: string
          verification_date: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          file_path?: string | null
          id?: string
          is_required?: boolean | null
          is_submitted?: boolean | null
          is_verified?: boolean | null
          rejection_reason?: string | null
          submission_date?: string | null
          updated_at?: string | null
          user_id: string
          verification_date?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          file_path?: string | null
          id?: string
          is_required?: boolean | null
          is_submitted?: boolean | null
          is_verified?: boolean | null
          rejection_reason?: string | null
          submission_date?: string | null
          updated_at?: string | null
          user_id?: string
          verification_date?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          document_type: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          uploaded_at: string
          user_id: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          document_type: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          uploaded_at?: string
          user_id: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          document_type?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          uploaded_at?: string
          user_id?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          category: string
          context: Json | null
          created_at: string | null
          id: string
          message: string
          resolved: boolean | null
          severity: string
          stack: string | null
          timestamp: string
          updated_at: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          context?: Json | null
          created_at?: string | null
          id?: string
          message: string
          resolved?: boolean | null
          severity: string
          stack?: string | null
          timestamp?: string
          updated_at?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          context?: Json | null
          created_at?: string | null
          id?: string
          message?: string
          resolved?: boolean | null
          severity?: string
          stack?: string | null
          timestamp?: string
          updated_at?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ips_alias_directory: {
        Row: {
          addr: string
          channel: string | null
          cm_id: string | null
          created_at: string | null
          entity_type: string
          expiry_ts: string
          id: string
          id_type: Database["public"]["Enums"]["ipp_alias_id_type"]
          id_value: string
          last_sync_at: string | null
          last_updated_ts: string | null
          merchant_id: string | null
          set_status: string | null
          status: Database["public"]["Enums"]["ipp_alias_status"]
          sync_error: string | null
          synced_with_ips: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          addr: string
          channel?: string | null
          cm_id?: string | null
          created_at?: string | null
          entity_type?: string
          expiry_ts: string
          id?: string
          id_type: Database["public"]["Enums"]["ipp_alias_id_type"]
          id_value: string
          last_sync_at?: string | null
          last_updated_ts?: string | null
          merchant_id?: string | null
          set_status?: string | null
          status?: Database["public"]["Enums"]["ipp_alias_status"]
          sync_error?: string | null
          synced_with_ips?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          addr?: string
          channel?: string | null
          cm_id?: string | null
          created_at?: string | null
          entity_type?: string
          expiry_ts?: string
          id?: string
          id_type?: Database["public"]["Enums"]["ipp_alias_id_type"]
          id_value?: string
          last_sync_at?: string | null
          last_updated_ts?: string | null
          merchant_id?: string | null
          set_status?: string | null
          status?: Database["public"]["Enums"]["ipp_alias_status"]
          sync_error?: string | null
          synced_with_ips?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_alias_merchant"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "ips_merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      ips_api_logs: {
        Row: {
          api_name: string
          api_version: string | null
          correlation_id: string
          created_at: string | null
          direction: string
          duration_ms: number | null
          endpoint_url: string | null
          environment: string | null
          error_code: string | null
          error_message: string | null
          http_status: number | null
          id: string
          ips_result: string | null
          ips_transaction_id: string | null
          received_at: string | null
          request_summary: Json | null
          response_summary: Json | null
          sent_at: string | null
          server_id: string | null
        }
        Insert: {
          api_name: string
          api_version?: string | null
          correlation_id: string
          created_at?: string | null
          direction: string
          duration_ms?: number | null
          endpoint_url?: string | null
          environment?: string | null
          error_code?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          ips_result?: string | null
          ips_transaction_id?: string | null
          received_at?: string | null
          request_summary?: Json | null
          response_summary?: Json | null
          sent_at?: string | null
          server_id?: string | null
        }
        Update: {
          api_name?: string
          api_version?: string | null
          correlation_id?: string
          created_at?: string | null
          direction?: string
          duration_ms?: number | null
          endpoint_url?: string | null
          environment?: string | null
          error_code?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          ips_result?: string | null
          ips_transaction_id?: string | null
          received_at?: string | null
          request_summary?: Json | null
          response_summary?: Json | null
          sent_at?: string | null
          server_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ips_api_logs_ips_transaction_id_fkey"
            columns: ["ips_transaction_id"]
            isOneToOne: false
            referencedRelation: "ips_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ips_device_bindings: {
        Row: {
          app_version: string | null
          binding_token: string | null
          bound_at: string | null
          created_at: string | null
          device_fingerprint: string
          device_model: string | null
          device_os: string | null
          device_os_version: string | null
          expires_at: string | null
          id: string
          imei: string | null
          mobile_number: string
          previous_binding_id: string | null
          sim_serial: string | null
          status: string
          unbind_reason: string | null
          unbound_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          binding_token?: string | null
          bound_at?: string | null
          created_at?: string | null
          device_fingerprint: string
          device_model?: string | null
          device_os?: string | null
          device_os_version?: string | null
          expires_at?: string | null
          id?: string
          imei?: string | null
          mobile_number: string
          previous_binding_id?: string | null
          sim_serial?: string | null
          status?: string
          unbind_reason?: string | null
          unbound_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          binding_token?: string | null
          bound_at?: string | null
          created_at?: string | null
          device_fingerprint?: string
          device_model?: string | null
          device_os?: string | null
          device_os_version?: string | null
          expires_at?: string | null
          id?: string
          imei?: string | null
          mobile_number?: string
          previous_binding_id?: string | null
          sim_serial?: string | null
          status?: string
          unbind_reason?: string | null
          unbound_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ips_device_bindings_previous_binding_id_fkey"
            columns: ["previous_binding_id"]
            isOneToOne: false
            referencedRelation: "ips_device_bindings"
            referencedColumns: ["id"]
          },
        ]
      }
      ips_error_codes: {
        Row: {
          code: string
          created_at: string | null
          description: string
          http_status: number | null
          internal_code: string
          is_retryable: boolean | null
          user_message: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description: string
          http_status?: number | null
          internal_code: string
          is_retryable?: boolean | null
          user_message?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string
          http_status?: number | null
          internal_code?: string
          is_retryable?: boolean | null
          user_message?: string | null
        }
        Relationships: []
      }
      ips_keys_cache: {
        Row: {
          created_at: string | null
          fetched_at: string
          id: string
          is_active: boolean | null
          key_algorithm: string | null
          key_id: string
          key_size: number | null
          key_type: string
          org_id: string
          public_key: string
          source: string | null
          updated_at: string | null
          valid_from: string
          valid_to: string
        }
        Insert: {
          created_at?: string | null
          fetched_at?: string
          id?: string
          is_active?: boolean | null
          key_algorithm?: string | null
          key_id: string
          key_size?: number | null
          key_type?: string
          org_id: string
          public_key: string
          source?: string | null
          updated_at?: string | null
          valid_from: string
          valid_to: string
        }
        Update: {
          created_at?: string | null
          fetched_at?: string
          id?: string
          is_active?: boolean | null
          key_algorithm?: string | null
          key_id?: string
          key_size?: number | null
          key_type?: string
          org_id?: string
          public_key?: string
          source?: string | null
          updated_at?: string | null
          valid_from?: string
          valid_to?: string
        }
        Relationships: []
      }
      ips_merchants: {
        Row: {
          business_name: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          dynamic_qr_enabled: boolean | null
          id: string
          is_active: boolean | null
          kyc_approved_at: string | null
          kyc_approved_by: string | null
          kyc_rejection_reason: string | null
          kyc_status: string | null
          merchant_alias: string | null
          merchant_category_code: string | null
          merchant_code: string | null
          merchant_numeric_id: string | null
          merchant_type: string | null
          physical_address: string | null
          qr_generated_at: string | null
          settlement_account_masked: string | null
          settlement_account_ref: string | null
          settlement_ifsc: string | null
          settlement_vpa: string | null
          state: Database["public"]["Enums"]["ipp_merchant_state"]
          static_qr_payload: string | null
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string | null
          user_id: string | null
          vae_entry_id: string | null
          vae_registered: boolean | null
        }
        Insert: {
          business_name: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          dynamic_qr_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          kyc_approved_at?: string | null
          kyc_approved_by?: string | null
          kyc_rejection_reason?: string | null
          kyc_status?: string | null
          merchant_alias?: string | null
          merchant_category_code?: string | null
          merchant_code?: string | null
          merchant_numeric_id?: string | null
          merchant_type?: string | null
          physical_address?: string | null
          qr_generated_at?: string | null
          settlement_account_masked?: string | null
          settlement_account_ref?: string | null
          settlement_ifsc?: string | null
          settlement_vpa?: string | null
          state?: Database["public"]["Enums"]["ipp_merchant_state"]
          static_qr_payload?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          user_id?: string | null
          vae_entry_id?: string | null
          vae_registered?: boolean | null
        }
        Update: {
          business_name?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          dynamic_qr_enabled?: boolean | null
          id?: string
          is_active?: boolean | null
          kyc_approved_at?: string | null
          kyc_approved_by?: string | null
          kyc_rejection_reason?: string | null
          kyc_status?: string | null
          merchant_alias?: string | null
          merchant_category_code?: string | null
          merchant_code?: string | null
          merchant_numeric_id?: string | null
          merchant_type?: string | null
          physical_address?: string | null
          qr_generated_at?: string | null
          settlement_account_masked?: string | null
          settlement_account_ref?: string | null
          settlement_ifsc?: string | null
          settlement_vpa?: string | null
          state?: Database["public"]["Enums"]["ipp_merchant_state"]
          static_qr_payload?: string | null
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          user_id?: string | null
          vae_entry_id?: string | null
          vae_registered?: boolean | null
        }
        Relationships: []
      }
      ips_onboarding: {
        Row: {
          alias_expiry_ts: string | null
          cm_id: string | null
          completed_at: string | null
          created_at: string | null
          device_binding_id: string | null
          id: string
          ips_pin_attempts: number | null
          ips_pin_locked_until: string | null
          ips_pin_set: boolean | null
          ips_pin_set_at: string | null
          last_error_code: string | null
          last_error_message: string | null
          last_step_completed: string | null
          long_alias: string | null
          mobile_id_status:
            | Database["public"]["Enums"]["ipp_alias_status"]
            | null
          numeric_id: string | null
          numeric_id_status:
            | Database["public"]["Enums"]["ipp_alias_status"]
            | null
          retry_count: number | null
          selected_account_ifsc: string | null
          selected_account_masked: string | null
          selected_account_ref: string | null
          selected_account_type: string | null
          short_alias_mobile: string | null
          sov_provider_code: string | null
          sov_provider_handle: string | null
          sov_provider_name: string | null
          started_at: string | null
          state: Database["public"]["Enums"]["ipp_onboarding_state"]
          suspended_at: string | null
          suspension_reason: string | null
          updated_at: string | null
          user_id: string
          verification_method: string | null
          verification_reference: string | null
          verified_at: string | null
        }
        Insert: {
          alias_expiry_ts?: string | null
          cm_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          device_binding_id?: string | null
          id?: string
          ips_pin_attempts?: number | null
          ips_pin_locked_until?: string | null
          ips_pin_set?: boolean | null
          ips_pin_set_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_step_completed?: string | null
          long_alias?: string | null
          mobile_id_status?:
            | Database["public"]["Enums"]["ipp_alias_status"]
            | null
          numeric_id?: string | null
          numeric_id_status?:
            | Database["public"]["Enums"]["ipp_alias_status"]
            | null
          retry_count?: number | null
          selected_account_ifsc?: string | null
          selected_account_masked?: string | null
          selected_account_ref?: string | null
          selected_account_type?: string | null
          short_alias_mobile?: string | null
          sov_provider_code?: string | null
          sov_provider_handle?: string | null
          sov_provider_name?: string | null
          started_at?: string | null
          state?: Database["public"]["Enums"]["ipp_onboarding_state"]
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          user_id: string
          verification_method?: string | null
          verification_reference?: string | null
          verified_at?: string | null
        }
        Update: {
          alias_expiry_ts?: string | null
          cm_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          device_binding_id?: string | null
          id?: string
          ips_pin_attempts?: number | null
          ips_pin_locked_until?: string | null
          ips_pin_set?: boolean | null
          ips_pin_set_at?: string | null
          last_error_code?: string | null
          last_error_message?: string | null
          last_step_completed?: string | null
          long_alias?: string | null
          mobile_id_status?:
            | Database["public"]["Enums"]["ipp_alias_status"]
            | null
          numeric_id?: string | null
          numeric_id_status?:
            | Database["public"]["Enums"]["ipp_alias_status"]
            | null
          retry_count?: number | null
          selected_account_ifsc?: string | null
          selected_account_masked?: string | null
          selected_account_ref?: string | null
          selected_account_type?: string | null
          short_alias_mobile?: string | null
          sov_provider_code?: string | null
          sov_provider_handle?: string | null
          sov_provider_name?: string | null
          started_at?: string | null
          state?: Database["public"]["Enums"]["ipp_onboarding_state"]
          suspended_at?: string | null
          suspension_reason?: string | null
          updated_at?: string | null
          user_id?: string
          verification_method?: string | null
          verification_reference?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ips_onboarding_device_binding_id_fkey"
            columns: ["device_binding_id"]
            isOneToOne: false
            referencedRelation: "ips_device_bindings"
            referencedColumns: ["id"]
          },
        ]
      }
      ips_onboarding_history: {
        Row: {
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          error_code: string | null
          error_message: string | null
          from_state: Database["public"]["Enums"]["ipp_onboarding_state"] | null
          id: string
          ips_response_code: string | null
          metadata: Json | null
          msg_id: string | null
          onboarding_id: string
          started_at: string
          step_name: string
          success: boolean
          to_state: Database["public"]["Enums"]["ipp_onboarding_state"]
          trigger_source: string | null
          triggered_by: string | null
          txn_id: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          from_state?:
            | Database["public"]["Enums"]["ipp_onboarding_state"]
            | null
          id?: string
          ips_response_code?: string | null
          metadata?: Json | null
          msg_id?: string | null
          onboarding_id: string
          started_at?: string
          step_name: string
          success: boolean
          to_state: Database["public"]["Enums"]["ipp_onboarding_state"]
          trigger_source?: string | null
          triggered_by?: string | null
          txn_id?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          error_code?: string | null
          error_message?: string | null
          from_state?:
            | Database["public"]["Enums"]["ipp_onboarding_state"]
            | null
          id?: string
          ips_response_code?: string | null
          metadata?: Json | null
          msg_id?: string | null
          onboarding_id?: string
          started_at?: string
          step_name?: string
          success?: boolean
          to_state?: Database["public"]["Enums"]["ipp_onboarding_state"]
          trigger_source?: string | null
          triggered_by?: string | null
          txn_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ips_onboarding_history_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "ips_onboarding"
            referencedColumns: ["id"]
          },
        ]
      }
      ips_sov_providers: {
        Row: {
          api_version: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_fetched_at: string | null
          maintenance_message: string | null
          maintenance_mode: boolean | null
          min_app_version: string | null
          provider_code: string
          provider_handle: string | null
          provider_name: string
          supports_aadhaar: boolean | null
          supports_collect: boolean | null
          supports_debit_card: boolean | null
          supports_wallet_pin: boolean | null
          updated_at: string | null
        }
        Insert: {
          api_version?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_fetched_at?: string | null
          maintenance_message?: string | null
          maintenance_mode?: boolean | null
          min_app_version?: string | null
          provider_code: string
          provider_handle?: string | null
          provider_name: string
          supports_aadhaar?: boolean | null
          supports_collect?: boolean | null
          supports_debit_card?: boolean | null
          supports_wallet_pin?: boolean | null
          updated_at?: string | null
        }
        Update: {
          api_version?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_fetched_at?: string | null
          maintenance_message?: string | null
          maintenance_mode?: boolean | null
          min_app_version?: string | null
          provider_code?: string
          provider_handle?: string | null
          provider_name?: string
          supports_aadhaar?: boolean | null
          supports_collect?: boolean | null
          supports_debit_card?: boolean | null
          supports_wallet_pin?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      ips_transaction_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          amount: number | null
          created_at: string | null
          hours_stuck: number | null
          id: string
          ips_transaction_id: string
          message: string
          resolution_notes: string | null
          resolved_at: string | null
          severity: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          amount?: number | null
          created_at?: string | null
          hours_stuck?: number | null
          id?: string
          ips_transaction_id: string
          message: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          amount?: number | null
          created_at?: string | null
          hours_stuck?: number | null
          id?: string
          ips_transaction_id?: string
          message?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "ips_transaction_alerts_ips_transaction_id_fkey"
            columns: ["ips_transaction_id"]
            isOneToOne: false
            referencedRelation: "ips_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      ips_transactions: {
        Row: {
          amount: number
          channel: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_ref: string | null
          device_fingerprint: Json | null
          disbursement_id: string | null
          expires_at: string | null
          id: string
          initiated_at: string
          initiation_mode: string | null
          internal_error_code: string | null
          ip_address: unknown
          ips_error_code: string | null
          ips_error_message: string | null
          ips_result: string | null
          ips_rrn: string | null
          ips_txn_id: string | null
          ips_txn_subtype: string | null
          ips_txn_type: string
          last_status_check_at: string | null
          loan_id: string | null
          msg_id: string
          note: string | null
          org_msg_id: string | null
          org_txn_id: string | null
          payee_account_masked: string | null
          payee_ifsc: string | null
          payee_name: string | null
          payee_vpa: string
          payer_account_masked: string | null
          payer_ifsc: string | null
          payer_name: string | null
          payer_vpa: string
          payment_id: string | null
          purpose_code: string | null
          response_received_at: string | null
          retry_count: number | null
          sent_at: string | null
          status: string
          transaction_type: string
          txn_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          channel?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_ref?: string | null
          device_fingerprint?: Json | null
          disbursement_id?: string | null
          expires_at?: string | null
          id?: string
          initiated_at?: string
          initiation_mode?: string | null
          internal_error_code?: string | null
          ip_address?: unknown
          ips_error_code?: string | null
          ips_error_message?: string | null
          ips_result?: string | null
          ips_rrn?: string | null
          ips_txn_id?: string | null
          ips_txn_subtype?: string | null
          ips_txn_type: string
          last_status_check_at?: string | null
          loan_id?: string | null
          msg_id: string
          note?: string | null
          org_msg_id?: string | null
          org_txn_id?: string | null
          payee_account_masked?: string | null
          payee_ifsc?: string | null
          payee_name?: string | null
          payee_vpa: string
          payer_account_masked?: string | null
          payer_ifsc?: string | null
          payer_name?: string | null
          payer_vpa: string
          payment_id?: string | null
          purpose_code?: string | null
          response_received_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          transaction_type: string
          txn_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          channel?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_ref?: string | null
          device_fingerprint?: Json | null
          disbursement_id?: string | null
          expires_at?: string | null
          id?: string
          initiated_at?: string
          initiation_mode?: string | null
          internal_error_code?: string | null
          ip_address?: unknown
          ips_error_code?: string | null
          ips_error_message?: string | null
          ips_result?: string | null
          ips_rrn?: string | null
          ips_txn_id?: string | null
          ips_txn_subtype?: string | null
          ips_txn_type?: string
          last_status_check_at?: string | null
          loan_id?: string | null
          msg_id?: string
          note?: string | null
          org_msg_id?: string | null
          org_txn_id?: string | null
          payee_account_masked?: string | null
          payee_ifsc?: string | null
          payee_name?: string | null
          payee_vpa?: string
          payer_account_masked?: string | null
          payer_ifsc?: string | null
          payer_name?: string | null
          payer_vpa?: string
          payment_id?: string | null
          purpose_code?: string | null
          response_received_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          transaction_type?: string
          txn_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ips_transactions_disbursement_id_fkey"
            columns: ["disbursement_id"]
            isOneToOne: false
            referencedRelation: "disbursements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ips_transactions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "collections_queue"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "ips_transactions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_balance_summary"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "ips_transactions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ips_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      ips_transactions_archive: {
        Row: {
          amount: number
          archive_reason: string | null
          archived_at: string | null
          channel: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_ref: string | null
          device_fingerprint: Json | null
          disbursement_id: string | null
          expires_at: string | null
          id: string
          initiated_at: string
          initiation_mode: string | null
          internal_error_code: string | null
          ip_address: unknown
          ips_error_code: string | null
          ips_error_message: string | null
          ips_result: string | null
          ips_rrn: string | null
          ips_txn_id: string | null
          ips_txn_subtype: string | null
          ips_txn_type: string
          last_status_check_at: string | null
          loan_id: string | null
          msg_id: string
          note: string | null
          org_msg_id: string | null
          org_txn_id: string | null
          payee_account_masked: string | null
          payee_ifsc: string | null
          payee_name: string | null
          payee_vpa: string
          payer_account_masked: string | null
          payer_ifsc: string | null
          payer_name: string | null
          payer_vpa: string
          payment_id: string | null
          purpose_code: string | null
          response_received_at: string | null
          retry_count: number | null
          sent_at: string | null
          status: string
          transaction_type: string
          txn_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          archive_reason?: string | null
          archived_at?: string | null
          channel?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_ref?: string | null
          device_fingerprint?: Json | null
          disbursement_id?: string | null
          expires_at?: string | null
          id?: string
          initiated_at?: string
          initiation_mode?: string | null
          internal_error_code?: string | null
          ip_address?: unknown
          ips_error_code?: string | null
          ips_error_message?: string | null
          ips_result?: string | null
          ips_rrn?: string | null
          ips_txn_id?: string | null
          ips_txn_subtype?: string | null
          ips_txn_type: string
          last_status_check_at?: string | null
          loan_id?: string | null
          msg_id: string
          note?: string | null
          org_msg_id?: string | null
          org_txn_id?: string | null
          payee_account_masked?: string | null
          payee_ifsc?: string | null
          payee_name?: string | null
          payee_vpa: string
          payer_account_masked?: string | null
          payer_ifsc?: string | null
          payer_name?: string | null
          payer_vpa: string
          payment_id?: string | null
          purpose_code?: string | null
          response_received_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          transaction_type: string
          txn_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          archive_reason?: string | null
          archived_at?: string | null
          channel?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_ref?: string | null
          device_fingerprint?: Json | null
          disbursement_id?: string | null
          expires_at?: string | null
          id?: string
          initiated_at?: string
          initiation_mode?: string | null
          internal_error_code?: string | null
          ip_address?: unknown
          ips_error_code?: string | null
          ips_error_message?: string | null
          ips_result?: string | null
          ips_rrn?: string | null
          ips_txn_id?: string | null
          ips_txn_subtype?: string | null
          ips_txn_type?: string
          last_status_check_at?: string | null
          loan_id?: string | null
          msg_id?: string
          note?: string | null
          org_msg_id?: string | null
          org_txn_id?: string | null
          payee_account_masked?: string | null
          payee_ifsc?: string | null
          payee_name?: string | null
          payee_vpa?: string
          payer_account_masked?: string | null
          payer_ifsc?: string | null
          payer_name?: string | null
          payer_vpa?: string
          payment_id?: string | null
          purpose_code?: string | null
          response_received_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          transaction_type?: string
          txn_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      ips_vae_entries: {
        Row: {
          addr: string
          approved_at: string | null
          created_at: string | null
          id: string
          key_ref: string | null
          last_sync_at: string | null
          logo_url: string | null
          merchant_id: string | null
          name: string
          operation: string
          rejected_at: string | null
          rejection_reason: string | null
          seq_num: number
          status: string
          sync_error: string | null
          synced_with_ips: boolean | null
          updated_at: string | null
          website_url: string | null
        }
        Insert: {
          addr: string
          approved_at?: string | null
          created_at?: string | null
          id?: string
          key_ref?: string | null
          last_sync_at?: string | null
          logo_url?: string | null
          merchant_id?: string | null
          name: string
          operation?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          seq_num?: number
          status?: string
          sync_error?: string | null
          synced_with_ips?: boolean | null
          updated_at?: string | null
          website_url?: string | null
        }
        Update: {
          addr?: string
          approved_at?: string | null
          created_at?: string | null
          id?: string
          key_ref?: string | null
          last_sync_at?: string | null
          logo_url?: string | null
          merchant_id?: string | null
          name?: string
          operation?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          seq_num?: number
          status?: string
          sync_error?: string | null
          synced_with_ips?: boolean | null
          updated_at?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ips_vae_entries_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "ips_merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      ips_vpa_registry: {
        Row: {
          account_holder_name: string | null
          account_masked: string | null
          created_at: string | null
          deactivated_at: string | null
          deactivation_reason: string | null
          display_name: string | null
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          is_default: boolean | null
          is_validated: boolean | null
          provider_code: string | null
          provider_name: string | null
          updated_at: string | null
          user_id: string
          validated_at: string | null
          validation_error: string | null
          validation_txn_id: string | null
          vpa_address: string
          vpa_type: string
        }
        Insert: {
          account_holder_name?: string | null
          account_masked?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivation_reason?: string | null
          display_name?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          is_validated?: boolean | null
          provider_code?: string | null
          provider_name?: string | null
          updated_at?: string | null
          user_id: string
          validated_at?: string | null
          validation_error?: string | null
          validation_txn_id?: string | null
          vpa_address: string
          vpa_type?: string
        }
        Update: {
          account_holder_name?: string | null
          account_masked?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivation_reason?: string | null
          display_name?: string | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          is_validated?: boolean | null
          provider_code?: string | null
          provider_name?: string | null
          updated_at?: string | null
          user_id?: string
          validated_at?: string | null
          validation_error?: string | null
          validation_txn_id?: string | null
          vpa_address?: string
          vpa_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ips_vpa_registry_validation_txn_id_fkey"
            columns: ["validation_txn_id"]
            isOneToOne: false
            referencedRelation: "ips_transactions"
            referencedColumns: ["id"]
          },
        ]
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
      late_payment_fees: {
        Row: {
          applied_at: string
          calculation_basis: string
          created_at: string
          fee_amount: number
          fee_type: string
          id: string
          loan_id: string
          payment_schedule_id: string
          updated_at: string
          waived_at: string | null
          waived_by: string | null
          waiver_reason: string | null
        }
        Insert: {
          applied_at?: string
          calculation_basis: string
          created_at?: string
          fee_amount: number
          fee_type: string
          id?: string
          loan_id: string
          payment_schedule_id: string
          updated_at?: string
          waived_at?: string | null
          waived_by?: string | null
          waiver_reason?: string | null
        }
        Update: {
          applied_at?: string
          calculation_basis?: string
          created_at?: string
          fee_amount?: number
          fee_type?: string
          id?: string
          loan_id?: string
          payment_schedule_id?: string
          updated_at?: string
          waived_at?: string | null
          waived_by?: string | null
          waiver_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "late_payment_fees_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "collections_queue"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "late_payment_fees_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_balance_summary"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "late_payment_fees_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "late_payment_fees_payment_schedule_id_fkey"
            columns: ["payment_schedule_id"]
            isOneToOne: false
            referencedRelation: "payment_schedules"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "collections_queue"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "loan_reviews_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_balance_summary"
            referencedColumns: ["loan_id"]
          },
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
          approval_request_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          disbursed_at: string | null
          id: string
          interest_rate: number
          monthly_payment: number
          outstanding_balance: number | null
          purpose: string | null
          settled_at: string | null
          status: string | null
          term_months: number
          total_paid: number | null
          total_repayment: number
          updated_at: string
          user_id: string
          version: number | null
        }
        Insert: {
          amount: number
          approval_request_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          disbursed_at?: string | null
          id?: string
          interest_rate: number
          monthly_payment: number
          outstanding_balance?: number | null
          purpose?: string | null
          settled_at?: string | null
          status?: string | null
          term_months: number
          total_paid?: number | null
          total_repayment: number
          updated_at?: string
          user_id: string
          version?: number | null
        }
        Update: {
          amount?: number
          approval_request_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          disbursed_at?: string | null
          id?: string
          interest_rate?: number
          monthly_payment?: number
          outstanding_balance?: number | null
          purpose?: string | null
          settled_at?: string | null
          status?: string | null
          term_months?: number
          total_paid?: number | null
          total_repayment?: number
          updated_at?: string
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "loans_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_expanded"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          category: string
          channel: string
          created_at: string | null
          enabled: boolean | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: string
          channel: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string
          channel?: string
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          attempts: number | null
          channel: string
          content: string
          created_at: string | null
          delivered_at: string | null
          expires_at: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          last_attempt_at: string | null
          max_attempts: number | null
          metadata: Json | null
          priority: number | null
          provider_message_id: string | null
          provider_response: Json | null
          recipient: string
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          template_code: string | null
          template_data: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          channel: string
          content: string
          created_at?: string | null
          delivered_at?: string | null
          expires_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number | null
          metadata?: Json | null
          priority?: number | null
          provider_message_id?: string | null
          provider_response?: Json | null
          recipient: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_code?: string | null
          template_data?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          channel?: string
          content?: string
          created_at?: string | null
          delivered_at?: string | null
          expires_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          last_attempt_at?: string | null
          max_attempts?: number | null
          metadata?: Json | null
          priority?: number | null
          provider_message_id?: string | null
          provider_response?: Json | null
          recipient?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          template_code?: string | null
          template_data?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          action_label: string | null
          action_url: string | null
          body: string
          category: string
          channels: string[]
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: string | null
          subject: string | null
          title: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          body: string
          category: string
          channels?: string[]
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: string | null
          subject?: string | null
          title: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          body?: string
          category?: string
          channels?: string[]
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: string | null
          subject?: string | null
          title?: string
          updated_at?: string | null
          variables?: string[] | null
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
      payment_reconciliations: {
        Row: {
          created_at: string
          id: string
          match_confidence: number | null
          match_type: string
          metadata: Json | null
          notes: string | null
          payment_id: string | null
          reconciled_at: string
          reconciled_by: string | null
          status: string
          transaction_amount: number
          transaction_date: string
          transaction_reference: string
          updated_at: string
          variance_amount: number | null
          variance_reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_confidence?: number | null
          match_type: string
          metadata?: Json | null
          notes?: string | null
          payment_id?: string | null
          reconciled_at?: string
          reconciled_by?: string | null
          status?: string
          transaction_amount: number
          transaction_date: string
          transaction_reference: string
          updated_at?: string
          variance_amount?: number | null
          variance_reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_confidence?: number | null
          match_type?: string
          metadata?: Json | null
          notes?: string | null
          payment_id?: string | null
          reconciled_at?: string
          reconciled_by?: string | null
          status?: string
          transaction_amount?: number
          transaction_date?: string
          transaction_reference?: string
          updated_at?: string
          variance_amount?: number | null
          variance_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_reconciliations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_schedules: {
        Row: {
          amount_paid: number | null
          created_at: string
          days_overdue: number | null
          due_date: string
          fee_amount: number | null
          id: string
          installment_number: number
          interest_amount: number
          late_fee_applied: number | null
          loan_id: string
          paid_at: string | null
          principal_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          days_overdue?: number | null
          due_date: string
          fee_amount?: number | null
          id?: string
          installment_number: number
          interest_amount: number
          late_fee_applied?: number | null
          loan_id: string
          paid_at?: string | null
          principal_amount: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          days_overdue?: number | null
          due_date?: string
          fee_amount?: number | null
          id?: string
          installment_number?: number
          interest_amount?: number
          late_fee_applied?: number | null
          loan_id?: string
          paid_at?: string | null
          principal_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "collections_queue"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "payment_schedules_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_balance_summary"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "payment_schedules_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          bank_account: string | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          initiated_at: string | null
          loan_id: string
          metadata: Json | null
          payment_id: string | null
          payment_method: string
          phone_number: string | null
          provider: string
          provider_request: Json | null
          provider_response: Json | null
          provider_transaction_id: string | null
          reference_number: string
          status: string
          updated_at: string | null
          user_id: string
          webhook_data: Json | null
          webhook_received_at: string | null
        }
        Insert: {
          amount: number
          bank_account?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          initiated_at?: string | null
          loan_id: string
          metadata?: Json | null
          payment_id?: string | null
          payment_method: string
          phone_number?: string | null
          provider: string
          provider_request?: Json | null
          provider_response?: Json | null
          provider_transaction_id?: string | null
          reference_number: string
          status: string
          updated_at?: string | null
          user_id: string
          webhook_data?: Json | null
          webhook_received_at?: string | null
        }
        Update: {
          amount?: number
          bank_account?: string | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          initiated_at?: string | null
          loan_id?: string
          metadata?: Json | null
          payment_id?: string | null
          payment_method?: string
          phone_number?: string | null
          provider?: string
          provider_request?: Json | null
          provider_response?: Json | null
          provider_transaction_id?: string | null
          reference_number?: string
          status?: string
          updated_at?: string | null
          user_id?: string
          webhook_data?: Json | null
          webhook_received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "collections_queue"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "payment_transactions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_balance_summary"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "payment_transactions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhooks: {
        Row: {
          error: string | null
          event_type: string | null
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          processing_result: Json | null
          provider: string
          received_at: string | null
          reference_number: string | null
          signature: string | null
          signature_valid: boolean | null
        }
        Insert: {
          error?: string | null
          event_type?: string | null
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          processing_result?: Json | null
          provider: string
          received_at?: string | null
          reference_number?: string | null
          signature?: string | null
          signature_valid?: boolean | null
        }
        Update: {
          error?: string | null
          event_type?: string | null
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          processing_result?: Json | null
          provider?: string
          received_at?: string | null
          reference_number?: string | null
          signature?: string | null
          signature_valid?: boolean | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          days_overdue: number | null
          id: string
          idempotency_key: string | null
          ips_transaction_id: string | null
          is_overdue: boolean | null
          loan_id: string
          paid_at: string | null
          payer_vpa: string | null
          payment_method: string
          payment_notes: string | null
          processing_fee: number | null
          reference_number: string | null
          status: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          days_overdue?: number | null
          id?: string
          idempotency_key?: string | null
          ips_transaction_id?: string | null
          is_overdue?: boolean | null
          loan_id: string
          paid_at?: string | null
          payer_vpa?: string | null
          payment_method: string
          payment_notes?: string | null
          processing_fee?: number | null
          reference_number?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          days_overdue?: number | null
          id?: string
          idempotency_key?: string | null
          ips_transaction_id?: string | null
          is_overdue?: boolean | null
          loan_id?: string
          paid_at?: string | null
          payer_vpa?: string | null
          payment_method?: string
          payment_notes?: string | null
          processing_fee?: number | null
          reference_number?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_ips_transaction_id_fkey"
            columns: ["ips_transaction_id"]
            isOneToOne: false
            referencedRelation: "ips_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "collections_queue"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "payments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_balance_summary"
            referencedColumns: ["loan_id"]
          },
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
      promise_to_pay: {
        Row: {
          created_at: string | null
          created_by: string | null
          follow_up_date: string | null
          id: string
          loan_id: string
          notes: string | null
          promised_amount: number
          promised_date: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          loan_id: string
          notes?: string | null
          promised_amount: number
          promised_date: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          follow_up_date?: string | null
          id?: string
          loan_id?: string
          notes?: string | null
          promised_amount?: number
          promised_date?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promise_to_pay_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "collections_queue"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "promise_to_pay_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_balance_summary"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "promise_to_pay_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_runs: {
        Row: {
          bank_account: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          matched_amount: number | null
          matched_count: number | null
          name: string
          notes: string | null
          period_end: string
          period_start: string
          status: string
          total_amount: number | null
          total_transactions: number | null
          unmatched_count: number | null
          updated_at: string
        }
        Insert: {
          bank_account?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          matched_amount?: number | null
          matched_count?: number | null
          name: string
          notes?: string | null
          period_end: string
          period_start: string
          status?: string
          total_amount?: number | null
          total_transactions?: number | null
          unmatched_count?: number | null
          updated_at?: string
        }
        Update: {
          bank_account?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          matched_amount?: number | null
          matched_count?: number | null
          name?: string
          notes?: string | null
          period_end?: string
          period_start?: string
          status?: string
          total_amount?: number | null
          total_transactions?: number | null
          unmatched_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      reschedule_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          loan_id: string
          original_due_date: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          requested_date: string
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          loan_id: string
          original_due_date: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          requested_date: string
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          loan_id?: string
          original_due_date?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          requested_date?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reschedule_requests_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "collections_queue"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "reschedule_requests_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_balance_summary"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "reschedule_requests_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_acknowledgements: {
        Row: {
          ack_type: Database["public"]["Enums"]["ack_type"]
          batch_id: string | null
          correlation_keys: Json | null
          created_at: string | null
          error_code: string | null
          error_description: string | null
          id: string
          msg_id: string
          processed_at: string | null
          raw_payload: string | null
          received_at: string | null
          run_id: string | null
        }
        Insert: {
          ack_type: Database["public"]["Enums"]["ack_type"]
          batch_id?: string | null
          correlation_keys?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_description?: string | null
          id?: string
          msg_id: string
          processed_at?: string | null
          raw_payload?: string | null
          received_at?: string | null
          run_id?: string | null
        }
        Update: {
          ack_type?: Database["public"]["Enums"]["ack_type"]
          batch_id?: string | null
          correlation_keys?: Json | null
          created_at?: string | null
          error_code?: string | null
          error_description?: string | null
          id?: string
          msg_id?: string
          processed_at?: string | null
          raw_payload?: string | null
          received_at?: string | null
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_acknowledgements_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "settlement_pacs009_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_acknowledgements_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "settlement_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_adjustments: {
        Row: {
          adjustment_type: string
          amount: number
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          original_tx_id: string | null
          reason_code: string | null
          reason_description: string | null
          responded_at: string | null
          response_notes: string | null
          response_required_by: string | null
          run_id: string | null
          settled_in_run_id: string | null
          source_participant_id: string
          status: string | null
          target_participant_id: string
          updated_at: string | null
        }
        Insert: {
          adjustment_type: string
          amount: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          original_tx_id?: string | null
          reason_code?: string | null
          reason_description?: string | null
          responded_at?: string | null
          response_notes?: string | null
          response_required_by?: string | null
          run_id?: string | null
          settled_in_run_id?: string | null
          source_participant_id: string
          status?: string | null
          target_participant_id: string
          updated_at?: string | null
        }
        Update: {
          adjustment_type?: string
          amount?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          original_tx_id?: string | null
          reason_code?: string | null
          reason_description?: string | null
          responded_at?: string | null
          response_notes?: string | null
          response_required_by?: string | null
          run_id?: string | null
          settled_in_run_id?: string | null
          source_participant_id?: string
          status?: string | null
          target_participant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_adjustments_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "settlement_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_adjustments_settled_in_run_id_fkey"
            columns: ["settled_in_run_id"]
            isOneToOne: false
            referencedRelation: "settlement_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_adjustments_source_participant_id_fkey"
            columns: ["source_participant_id"]
            isOneToOne: false
            referencedRelation: "settlement_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_adjustments_target_participant_id_fkey"
            columns: ["target_participant_id"]
            isOneToOne: false
            referencedRelation: "settlement_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_exposures: {
        Row: {
          calculated_at: string | null
          gross_payables: number | null
          gross_receivables: number | null
          id: string
          interchange_net: number | null
          net_position: number | null
          participant_id: string
          run_id: string
          switching_fee_payable: number | null
        }
        Insert: {
          calculated_at?: string | null
          gross_payables?: number | null
          gross_receivables?: number | null
          id?: string
          interchange_net?: number | null
          net_position?: number | null
          participant_id: string
          run_id: string
          switching_fee_payable?: number | null
        }
        Update: {
          calculated_at?: string | null
          gross_payables?: number | null
          gross_receivables?: number | null
          id?: string
          interchange_net?: number | null
          net_position?: number | null
          participant_id?: string
          run_id?: string
          switching_fee_payable?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_exposures_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "settlement_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_exposures_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "settlement_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_fee_rules: {
        Row: {
          created_at: string | null
          direction: string | null
          effective_from: string
          effective_to: string | null
          fee_type: string
          id: string
          product_type: string | null
          rate_tiers: Json | null
          rate_type: string
          rate_value: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          direction?: string | null
          effective_from: string
          effective_to?: string | null
          fee_type: string
          id?: string
          product_type?: string | null
          rate_tiers?: Json | null
          rate_type: string
          rate_value?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string | null
          effective_from?: string
          effective_to?: string | null
          fee_type?: string
          id?: string
          product_type?: string | null
          rate_tiers?: Json | null
          rate_type?: string
          rate_value?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      settlement_holiday_calendar: {
        Row: {
          created_at: string | null
          description: string | null
          holiday_date: string
          id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          holiday_date: string
          id?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          holiday_date?: string
          id?: string
        }
        Relationships: []
      }
      settlement_net_instructions: {
        Row: {
          amount: number
          batch_type: Database["public"]["Enums"]["settlement_batch_type"]
          category_group: string
          created_at: string | null
          end_to_end_id: string | null
          id: string
          instruction_id: string
          run_id: string
          source_participant_id: string
          target_participant_id: string
        }
        Insert: {
          amount: number
          batch_type: Database["public"]["Enums"]["settlement_batch_type"]
          category_group: string
          created_at?: string | null
          end_to_end_id?: string | null
          id?: string
          instruction_id: string
          run_id: string
          source_participant_id: string
          target_participant_id: string
        }
        Update: {
          amount?: number
          batch_type?: Database["public"]["Enums"]["settlement_batch_type"]
          category_group?: string
          created_at?: string | null
          end_to_end_id?: string | null
          id?: string
          instruction_id?: string
          run_id?: string
          source_participant_id?: string
          target_participant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_net_instructions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "settlement_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_net_instructions_source_participant_id_fkey"
            columns: ["source_participant_id"]
            isOneToOne: false
            referencedRelation: "settlement_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_net_instructions_target_participant_id_fkey"
            columns: ["target_participant_id"]
            isOneToOne: false
            referencedRelation: "settlement_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_obligations: {
        Row: {
          amount: number
          category: Database["public"]["Enums"]["obligation_category"]
          created_at: string | null
          fee_rule_id: string | null
          id: string
          metadata: Json | null
          run_id: string
          source_participant_id: string
          source_settlement_id: string
          source_tx_id: string | null
          target_participant_id: string
          target_settlement_id: string
        }
        Insert: {
          amount: number
          category: Database["public"]["Enums"]["obligation_category"]
          created_at?: string | null
          fee_rule_id?: string | null
          id?: string
          metadata?: Json | null
          run_id: string
          source_participant_id: string
          source_settlement_id: string
          source_tx_id?: string | null
          target_participant_id: string
          target_settlement_id: string
        }
        Update: {
          amount?: number
          category?: Database["public"]["Enums"]["obligation_category"]
          created_at?: string | null
          fee_rule_id?: string | null
          id?: string
          metadata?: Json | null
          run_id?: string
          source_participant_id?: string
          source_settlement_id?: string
          source_tx_id?: string | null
          target_participant_id?: string
          target_settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_obligations_fee_rule_id_fkey"
            columns: ["fee_rule_id"]
            isOneToOne: false
            referencedRelation: "settlement_fee_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_obligations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "settlement_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_obligations_source_participant_id_fkey"
            columns: ["source_participant_id"]
            isOneToOne: false
            referencedRelation: "settlement_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_obligations_source_settlement_id_fkey"
            columns: ["source_settlement_id"]
            isOneToOne: false
            referencedRelation: "settlement_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_obligations_target_participant_id_fkey"
            columns: ["target_participant_id"]
            isOneToOne: false
            referencedRelation: "settlement_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_obligations_target_settlement_id_fkey"
            columns: ["target_settlement_id"]
            isOneToOne: false
            referencedRelation: "settlement_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_pacs009_batches: {
        Row: {
          accepted_at: string | null
          batch_type: Database["public"]["Enums"]["settlement_batch_type"]
          created_at: string | null
          dispatched_at: string | null
          failed_at: string | null
          failure_reason: string | null
          file_checksum: string | null
          file_content: string | null
          file_name: string
          file_path: string | null
          file_size: number | null
          id: string
          instruction_count: number | null
          msg_id: string
          run_id: string
          status: string | null
          total_amount: number | null
          updated_at: string | null
          validated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          batch_type: Database["public"]["Enums"]["settlement_batch_type"]
          created_at?: string | null
          dispatched_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          file_checksum?: string | null
          file_content?: string | null
          file_name: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          instruction_count?: number | null
          msg_id: string
          run_id: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          validated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          batch_type?: Database["public"]["Enums"]["settlement_batch_type"]
          created_at?: string | null
          dispatched_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          file_checksum?: string | null
          file_content?: string | null
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          instruction_count?: number | null
          msg_id?: string
          run_id?: string
          status?: string | null
          total_amount?: number | null
          updated_at?: string | null
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_pacs009_batches_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "settlement_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_participants: {
        Row: {
          created_at: string | null
          id: string
          is_operator: boolean | null
          name: string
          niss_account_ref: string | null
          participant_type: Database["public"]["Enums"]["participant_type"]
          routing_code: string
          sponsor_id: string | null
          status: string | null
          swift_bic: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_operator?: boolean | null
          name: string
          niss_account_ref?: string | null
          participant_type?: Database["public"]["Enums"]["participant_type"]
          routing_code: string
          sponsor_id?: string | null
          status?: string | null
          swift_bic: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_operator?: boolean | null
          name?: string
          niss_account_ref?: string | null
          participant_type?: Database["public"]["Enums"]["participant_type"]
          routing_code?: string
          sponsor_id?: string | null
          status?: string | null
          swift_bic?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_participants_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "settlement_participants"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_reports: {
        Row: {
          created_at: string | null
          distributed_at: string | null
          distribution_channel: string | null
          file_checksum: string | null
          file_content: string | null
          file_name: string
          file_path: string | null
          file_size: number | null
          id: string
          participant_id: string | null
          report_data: Json | null
          report_type: Database["public"]["Enums"]["settlement_report_type"]
          run_id: string
        }
        Insert: {
          created_at?: string | null
          distributed_at?: string | null
          distribution_channel?: string | null
          file_checksum?: string | null
          file_content?: string | null
          file_name: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          participant_id?: string | null
          report_data?: Json | null
          report_type: Database["public"]["Enums"]["settlement_report_type"]
          run_id: string
        }
        Update: {
          created_at?: string | null
          distributed_at?: string | null
          distribution_channel?: string | null
          file_checksum?: string | null
          file_content?: string | null
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          participant_id?: string | null
          report_data?: Json | null
          report_type?: Database["public"]["Enums"]["settlement_report_type"]
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlement_reports_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "settlement_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_reports_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "settlement_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_runs: {
        Row: {
          amendment_seq: number | null
          closed_at: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          cutoff_at: string | null
          dispatched_at: string | null
          generated_at: string | null
          id: string
          net_instruction_count: number | null
          netting_completed_at: string | null
          run_id: string
          scheme_version: string | null
          settled_at: string | null
          settlement_date: string
          state: Database["public"]["Enums"]["settlement_run_state"]
          total_interchange: number | null
          total_principal: number | null
          total_switching_fee: number | null
          transaction_count: number | null
          updated_at: string | null
          window_id: string
        }
        Insert: {
          amendment_seq?: number | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          cutoff_at?: string | null
          dispatched_at?: string | null
          generated_at?: string | null
          id?: string
          net_instruction_count?: number | null
          netting_completed_at?: string | null
          run_id: string
          scheme_version?: string | null
          settled_at?: string | null
          settlement_date: string
          state?: Database["public"]["Enums"]["settlement_run_state"]
          total_interchange?: number | null
          total_principal?: number | null
          total_switching_fee?: number | null
          transaction_count?: number | null
          updated_at?: string | null
          window_id: string
        }
        Update: {
          amendment_seq?: number | null
          closed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          cutoff_at?: string | null
          dispatched_at?: string | null
          generated_at?: string | null
          id?: string
          net_instruction_count?: number | null
          netting_completed_at?: string | null
          run_id?: string
          scheme_version?: string | null
          settled_at?: string | null
          settlement_date?: string
          state?: Database["public"]["Enums"]["settlement_run_state"]
          total_interchange?: number | null
          total_principal?: number | null
          total_switching_fee?: number | null
          transaction_count?: number | null
          updated_at?: string | null
          window_id?: string
        }
        Relationships: []
      }
      settlement_timeout_transactions: {
        Row: {
          amount: number
          counterparty_id: string
          created_at: string | null
          id: string
          original_tx_id: string
          participant_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          run_id: string | null
          status: string | null
          timeout_reason: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          counterparty_id: string
          created_at?: string | null
          id?: string
          original_tx_id: string
          participant_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          run_id?: string | null
          status?: string | null
          timeout_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          counterparty_id?: string
          created_at?: string | null
          id?: string
          original_tx_id?: string
          participant_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          run_id?: string | null
          status?: string | null
          timeout_reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlement_timeout_transactions_counterparty_id_fkey"
            columns: ["counterparty_id"]
            isOneToOne: false
            referencedRelation: "settlement_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_timeout_transactions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "settlement_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlement_timeout_transactions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "settlement_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      settlement_windows: {
        Row: {
          created_at: string | null
          cutoff_time: string
          day_of_week: number
          description: string | null
          enabled: boolean | null
          id: string
          updated_at: string | null
          window_id: string
        }
        Insert: {
          created_at?: string | null
          cutoff_time: string
          day_of_week: number
          description?: string | null
          enabled?: boolean | null
          id?: string
          updated_at?: string | null
          window_id: string
        }
        Update: {
          created_at?: string | null
          cutoff_time?: string
          day_of_week?: number
          description?: string | null
          enabled?: boolean | null
          id?: string
          updated_at?: string | null
          window_id?: string
        }
        Relationships: []
      }
      state_transitions: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          from_state: string
          id: string
          metadata: Json | null
          to_state: string
          transition_reason: string | null
          triggered_by: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          from_state: string
          id?: string
          metadata?: Json | null
          to_state: string
          transition_reason?: string | null
          triggered_by?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          from_state?: string
          id?: string
          metadata?: Json | null
          to_state?: string
          transition_reason?: string | null
          triggered_by?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "state_transitions_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      tigerbeetle_accounts: {
        Row: {
          created_at: string
          created_in_tb_at: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          id: string
          retry_count: number | null
          status: string
          tb_account_id_high: number
          tb_account_id_low: number
          tb_code: number
          tb_ledger: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_in_tb_at?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          id?: string
          retry_count?: number | null
          status?: string
          tb_account_id_high: number
          tb_account_id_low: number
          tb_code: number
          tb_ledger?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_in_tb_at?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          retry_count?: number | null
          status?: string
          tb_account_id_high?: number
          tb_account_id_low?: number
          tb_code?: number
          tb_ledger?: number
          updated_at?: string
        }
        Relationships: []
      }
      tigerbeetle_outbox: {
        Row: {
          created_at: string
          event_type: string
          id: string
          last_error: string | null
          max_retries: number | null
          next_retry_at: string | null
          payload: Json
          processed_at: string | null
          retry_count: number | null
          source_id: string
          source_table: string
          status: string
          tb_transfer_ids: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          last_error?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          payload: Json
          processed_at?: string | null
          retry_count?: number | null
          source_id: string
          source_table: string
          status?: string
          tb_transfer_ids?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          last_error?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          payload?: Json
          processed_at?: string | null
          retry_count?: number | null
          source_id?: string
          source_table?: string
          status?: string
          tb_transfer_ids?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      tigerbeetle_reconciliation: {
        Row: {
          auto_resolved: number | null
          completed_at: string | null
          discrepancies_found: number | null
          discrepancy_details: Json | null
          duration_ms: number | null
          end_timestamp: string | null
          id: string
          loan_id: string | null
          records_checked: number | null
          run_type: string
          start_timestamp: string | null
          started_at: string
          status: string
        }
        Insert: {
          auto_resolved?: number | null
          completed_at?: string | null
          discrepancies_found?: number | null
          discrepancy_details?: Json | null
          duration_ms?: number | null
          end_timestamp?: string | null
          id?: string
          loan_id?: string | null
          records_checked?: number | null
          run_type: string
          start_timestamp?: string | null
          started_at?: string
          status?: string
        }
        Update: {
          auto_resolved?: number | null
          completed_at?: string | null
          discrepancies_found?: number | null
          discrepancy_details?: Json | null
          duration_ms?: number | null
          end_timestamp?: string | null
          id?: string
          loan_id?: string | null
          records_checked?: number | null
          run_type?: string
          start_timestamp?: string | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tigerbeetle_reconciliation_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "collections_queue"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "tigerbeetle_reconciliation_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loan_balance_summary"
            referencedColumns: ["loan_id"]
          },
          {
            foreignKeyName: "tigerbeetle_reconciliation_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      tigerbeetle_transfers: {
        Row: {
          amount: number
          created_at: string
          credit_account_id: string | null
          debit_account_id: string | null
          id: string
          is_pending: boolean | null
          is_posted: boolean | null
          is_voided: boolean | null
          outbox_id: string | null
          pending_transfer_id: string | null
          source_id: string
          source_table: string
          tb_code: number
          tb_ledger: number
          tb_timestamp: number | null
          tb_transfer_id_high: number
          tb_transfer_id_low: number
          user_data_128: string | null
          user_data_32: string | null
          user_data_64: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          credit_account_id?: string | null
          debit_account_id?: string | null
          id?: string
          is_pending?: boolean | null
          is_posted?: boolean | null
          is_voided?: boolean | null
          outbox_id?: string | null
          pending_transfer_id?: string | null
          source_id: string
          source_table: string
          tb_code: number
          tb_ledger?: number
          tb_timestamp?: number | null
          tb_transfer_id_high: number
          tb_transfer_id_low: number
          user_data_128?: string | null
          user_data_32?: string | null
          user_data_64?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          credit_account_id?: string | null
          debit_account_id?: string | null
          id?: string
          is_pending?: boolean | null
          is_posted?: boolean | null
          is_voided?: boolean | null
          outbox_id?: string | null
          pending_transfer_id?: string | null
          source_id?: string
          source_table?: string
          tb_code?: number
          tb_ledger?: number
          tb_timestamp?: number | null
          tb_transfer_id_high?: number
          tb_transfer_id_low?: number
          user_data_128?: string | null
          user_data_32?: string | null
          user_data_64?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tigerbeetle_transfers_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "tigerbeetle_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tigerbeetle_transfers_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "tigerbeetle_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tigerbeetle_transfers_outbox_id_fkey"
            columns: ["outbox_id"]
            isOneToOne: false
            referencedRelation: "tigerbeetle_outbox"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tigerbeetle_transfers_pending_transfer_id_fkey"
            columns: ["pending_transfer_id"]
            isOneToOne: false
            referencedRelation: "tigerbeetle_transfers"
            referencedColumns: ["id"]
          },
        ]
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
          role?: Database["public"]["Enums"]["app_role"]
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
      view_logs: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: string
          fields_viewed: string[] | null
          id: string
          ip_address: unknown
          metadata: Json | null
          session_id: string | null
          user_id: string | null
          view_duration_ms: number | null
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: string
          fields_viewed?: string[] | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
          view_duration_ms?: number | null
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          fields_viewed?: string[] | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          session_id?: string | null
          user_id?: string | null
          view_duration_ms?: number | null
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          context: Json | null
          conversation_id: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          last_message_at: string | null
          last_message_direction: string | null
          phone_number: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          wa_id: string | null
        }
        Insert: {
          context?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_direction?: string | null
          phone_number: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          wa_id?: string | null
        }
        Update: {
          context?: Json | null
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_message_at?: string | null
          last_message_direction?: string | null
          phone_number?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          wa_id?: string | null
        }
        Relationships: []
      }
      workflow_definition_history: {
        Row: {
          change_reason: string | null
          changed_at: string | null
          changed_by: string | null
          id: string
          stages: Json
          version: number
          workflow_definition_id: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          stages: Json
          version: number
          workflow_definition_id?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          stages?: Json
          version?: number
          workflow_definition_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_definition_history_workflow_definition_id_fkey"
            columns: ["workflow_definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_definitions: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          name: string
          stages: Json
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entity_type: string
          id?: string
          is_active?: boolean | null
          name: string
          stages: Json
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          name?: string
          stages?: Json
          updated_at?: string | null
          version?: number | null
        }
        Relationships: []
      }
      workflow_instances: {
        Row: {
          completed_at: string | null
          current_stage: number | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          started_at: string | null
          status: string | null
          workflow_definition_id: string | null
        }
        Insert: {
          completed_at?: string | null
          current_stage?: number | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string | null
          workflow_definition_id?: string | null
        }
        Update: {
          completed_at?: string | null
          current_stage?: number | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          started_at?: string | null
          status?: string | null
          workflow_definition_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_instances_workflow_definition_id_fkey"
            columns: ["workflow_definition_id"]
            isOneToOne: false
            referencedRelation: "workflow_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_stage_executions: {
        Row: {
          assigned_role: string | null
          assigned_to: string | null
          created_at: string | null
          decided_at: string | null
          decided_by: string | null
          decision: string | null
          decision_notes: string | null
          id: string
          stage_name: string
          stage_number: number
          status: string | null
          workflow_instance_id: string | null
        }
        Insert: {
          assigned_role?: string | null
          assigned_to?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_notes?: string | null
          id?: string
          stage_name: string
          stage_number: number
          status?: string | null
          workflow_instance_id?: string | null
        }
        Update: {
          assigned_role?: string | null
          assigned_to?: string | null
          created_at?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decision?: string | null
          decision_notes?: string | null
          id?: string
          stage_name?: string
          stage_number?: number
          status?: string | null
          workflow_instance_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_stage_executions_workflow_instance_id_fkey"
            columns: ["workflow_instance_id"]
            isOneToOne: false
            referencedRelation: "workflow_instances"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      approval_requests_expanded: {
        Row: {
          assigned_first_name: string | null
          assigned_last_name: string | null
          assigned_to: string | null
          auto_approve_eligible: boolean | null
          compliance_flags: Json | null
          created_at: string | null
          id: string | null
          metadata: Json | null
          priority: string | null
          reference_id: string | null
          reference_table: string | null
          request_data: Json | null
          request_type: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_first_name: string | null
          reviewer_id: string | null
          reviewer_last_name: string | null
          risk_score: number | null
          status: string | null
          updated_at: string | null
          user_first_name: string | null
          user_id: string | null
          user_last_name: string | null
          version: number | null
        }
        Relationships: []
      }
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
      collections_queue: {
        Row: {
          contact_attempts_7_days: number | null
          days_overdue: number | null
          email: string | null
          first_name: string | null
          last_contact_date: string | null
          last_contact_type: string | null
          last_name: string | null
          loan_amount: number | null
          loan_created_at: string | null
          loan_id: string | null
          loan_status: string | null
          monthly_payment: number | null
          next_promise_date: string | null
          overdue_installments: number | null
          pending_promises: number | null
          phone_number: string | null
          risk_bucket: string | null
          total_overdue: number | null
          user_id: string | null
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
      ips_alerts_summary: {
        Row: {
          acknowledged_count: number | null
          alert_count: number | null
          alert_date: string | null
          avg_hours_stuck: number | null
          resolved_count: number | null
          severity: string | null
          total_amount: number | null
        }
        Relationships: []
      }
      loan_applications_unified: {
        Row: {
          amount: number | null
          applicant_email: string | null
          applicant_name: string | null
          approved_at: string | null
          created_at: string | null
          disbursed_at: string | null
          employment_status: string | null
          id: string | null
          interest_rate: number | null
          monthly_income: number | null
          priority: string | null
          purpose: string | null
          source: string | null
          status: string | null
          term_months: number | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      loan_balance_summary: {
        Row: {
          created_at: string | null
          disbursed_at: string | null
          fees_balance: number | null
          interest_balance: number | null
          interest_rate: number | null
          loan_id: string | null
          loan_status: string | null
          next_due_date: string | null
          original_principal: number | null
          payments_made: number | null
          principal_balance: number | null
          schedules_paid: number | null
          term_months: number | null
          total_balance: number | null
          total_paid: number | null
          total_schedules: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          disbursed_at?: string | null
          fees_balance?: never
          interest_balance?: never
          interest_rate?: number | null
          loan_id?: string | null
          loan_status?: string | null
          next_due_date?: never
          original_principal?: number | null
          payments_made?: never
          principal_balance?: never
          schedules_paid?: never
          term_months?: number | null
          total_balance?: never
          total_paid?: never
          total_schedules?: never
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          disbursed_at?: string | null
          fees_balance?: never
          interest_balance?: never
          interest_rate?: number | null
          loan_id?: string | null
          loan_status?: string | null
          next_due_date?: never
          original_principal?: number | null
          payments_made?: never
          principal_balance?: never
          schedules_paid?: never
          term_months?: number | null
          total_balance?: never
          total_paid?: never
          total_schedules?: never
          user_id?: string | null
        }
        Relationships: []
      }
      profiles_with_roles: {
        Row: {
          account_status: string | null
          address_verified: boolean | null
          created_at: string | null
          credit_score: number | null
          email: string | null
          employment_duration: number | null
          employment_status: string | null
          employment_verified: boolean | null
          existing_debt: number | null
          first_name: string | null
          id: string | null
          id_number: string | null
          is_admin: boolean | null
          is_client: boolean | null
          is_loan_officer: boolean | null
          last_login: string | null
          last_name: string | null
          monthly_debt_payments: number | null
          monthly_income: number | null
          phone: string | null
          phone_number: string | null
          primary_role: Database["public"]["Enums"]["app_role"] | null
          risk_category: string | null
          roles: Database["public"]["Enums"]["app_role"][] | null
          updated_at: string | null
          user_id: string | null
          verified: boolean | null
          version: number | null
        }
        Insert: {
          account_status?: never
          address_verified?: boolean | null
          created_at?: string | null
          credit_score?: number | null
          email?: string | null
          employment_duration?: number | null
          employment_status?: string | null
          employment_verified?: boolean | null
          existing_debt?: number | null
          first_name?: string | null
          id?: string | null
          id_number?: string | null
          is_admin?: never
          is_client?: never
          is_loan_officer?: never
          last_login?: string | null
          last_name?: string | null
          monthly_debt_payments?: number | null
          monthly_income?: number | null
          phone?: string | null
          phone_number?: string | null
          primary_role?: never
          risk_category?: string | null
          roles?: never
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
          version?: number | null
        }
        Update: {
          account_status?: never
          address_verified?: boolean | null
          created_at?: string | null
          credit_score?: number | null
          email?: string | null
          employment_duration?: number | null
          employment_status?: string | null
          employment_verified?: boolean | null
          existing_debt?: number | null
          first_name?: string | null
          id?: string | null
          id_number?: string | null
          is_admin?: never
          is_client?: never
          is_loan_officer?: never
          last_login?: string | null
          last_name?: string | null
          monthly_debt_payments?: number | null
          monthly_income?: number | null
          phone?: string | null
          phone_number?: string | null
          primary_role?: never
          risk_category?: string | null
          roles?: never
          updated_at?: string | null
          user_id?: string | null
          verified?: boolean | null
          version?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      acknowledge_ips_alert: {
        Args: { p_alert_id: string; p_notes?: string }
        Returns: boolean
      }
      admin_initiate_ipp_onboarding: {
        Args: { p_mobile_number?: string; p_user_id: string }
        Returns: Json
      }
      advance_ips_onboarding_step: {
        Args: {
          p_error_code?: string
          p_error_message?: string
          p_step_data?: Json
          p_step_name: string
          p_success?: boolean
          p_user_id: string
        }
        Returns: Json
      }
      apply_payment_to_schedule: {
        Args: { p_amount: number; p_payment_id: string }
        Returns: Json
      }
      approve_disbursement: {
        Args: { p_disbursement_id: string; p_notes?: string }
        Returns: Json
      }
      assign_to_collection_agent: {
        Args: { p_agent_id: string; p_loan_id: string; p_notes?: string }
        Returns: Json
      }
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
      calculate_credit_score: {
        Args: { p_input_data?: Json; p_loan_id?: string; p_user_id: string }
        Returns: string
      }
      calculate_late_fee: { Args: { p_schedule_id: string }; Returns: Json }
      check_loan_eligibility: {
        Args: never
        Returns: {
          eligible: boolean
          missing_required_docs: string[]
          profile_completion_percentage: number
          required_docs: number
          verified_docs: number
        }[]
      }
      check_loan_eligibility_admin: {
        Args: { target_user_id: string }
        Returns: {
          eligible: boolean
          missing_required_docs: string[]
          profile_completion_percentage: number
          required_docs: number
          verified_docs: number
        }[]
      }
      check_stuck_ips_transactions: {
        Args: never
        Returns: {
          alerts_created: number
          critical_count: number
          warning_count: number
        }[]
      }
      complete_disbursement: {
        Args: {
          p_disbursement_id: string
          p_notes?: string
          p_payment_method: string
          p_payment_reference: string
        }
        Returns: Json
      }
      complete_ips_transaction: {
        Args: {
          p_error_message?: string
          p_ips_error_code?: string
          p_ips_result: string
          p_ips_rrn?: string
          p_ips_txn_id: string
          p_ips_txn_id_response?: string
        }
        Returns: Json
      }
      compute_settlement_netting: { Args: { p_run_id: string }; Returns: Json }
      create_disbursement_on_approval: {
        Args: { p_loan_id: string }
        Returns: Json
      }
      create_payment: {
        Args: {
          p_amount: number
          p_idempotency_key?: string
          p_loan_id: string
          p_payer_vpa?: string
          p_payment_method: string
          p_payment_notes?: string
          p_processing_fee?: number
        }
        Returns: Json
      }
      create_promise_to_pay: {
        Args: {
          p_follow_up_date?: string
          p_loan_id: string
          p_notes?: string
          p_promised_amount: number
          p_promised_date: string
        }
        Returns: string
      }
      create_settlement_run: {
        Args: { p_settlement_date?: string; p_window_id?: string }
        Returns: Json
      }
      decide_workflow_stage: {
        Args: {
          p_decision: string
          p_notes?: string
          p_stage_execution_id: string
        }
        Returns: Json
      }
      evaluate_approval_rules: {
        Args: { p_request_data: Json; p_request_type: string }
        Returns: {
          action: string
          action_data: Json
          rule_id: string
        }[]
      }
      fail_disbursement: {
        Args: { p_disbursement_id: string; p_reason: string }
        Returns: Json
      }
      generate_collection_queue: {
        Args: never
        Returns: {
          client_name: string
          days_overdue: number
          email: string
          last_contact_date: string
          last_contact_type: string
          loan_id: string
          overdue_installments: number
          phone_number: string
          priority_score: number
          promise_amount: number
          promise_date: string
          total_overdue: number
          user_id: string
        }[]
      }
      generate_compliance_report: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_report_type: string
        }
        Returns: string
      }
      generate_ips_msg_id: { Args: never; Returns: string }
      generate_ips_txn_id: { Args: never; Returns: string }
      generate_pacs009_batches: { Args: { p_run_id: string }; Returns: Json }
      generate_pacs009_xml: {
        Args: {
          p_batch_type: Database["public"]["Enums"]["settlement_batch_type"]
          p_msg_id: string
          p_run_id: string
        }
        Returns: string
      }
      generate_payment_schedule: { Args: { p_loan_id: string }; Returns: Json }
      generate_settlement_reports: { Args: { p_run_id: string }; Returns: Json }
      generate_settlement_run_id: {
        Args: { p_settlement_date: string; p_window_id: string }
        Returns: string
      }
      get_active_workflow: {
        Args: { p_entity_type: string }
        Returns: {
          id: string
          name: string
          stages: Json
        }[]
      }
      get_admin_dashboard_summary: {
        Args: never
        Returns: {
          overdue_payments: number
          pending_amount: number
          rejected_amount: number
          total_clients: number
          total_disbursed: number
          total_loans: number
          total_repayments: number
        }[]
      }
      get_collection_activities: {
        Args: { p_loan_id: string }
        Returns: {
          activity_status: string
          activity_type: string
          agent_name: string
          contact_method: string
          created_at: string
          id: string
          next_action_date: string
          notes: string
          outcome: string
          promise_amount: number
          promise_date: string
          promise_fulfilled: boolean
        }[]
      }
      get_collections_stats: { Args: never; Returns: Json }
      get_current_credit_score: {
        Args: { p_user_id?: string }
        Returns: {
          calculated_at: string
          max_approved_amount: number
          risk_level: string
          score: number
          score_range: string
          suggested_interest_rate: number
        }[]
      }
      get_dashboard_summary: { Args: never; Returns: Json }
      get_ipp_onboarding_summary: { Args: never; Returns: Json }
      get_ips_error_message: { Args: { p_code: string }; Returns: string }
      get_ips_transaction_health: { Args: never; Returns: Json }
      get_ips_transaction_status: {
        Args: { p_ips_txn_id: string }
        Returns: Json
      }
      get_loan_ips_transactions: { Args: { p_loan_id: string }; Returns: Json }
      get_loan_payment_details: { Args: { p_loan_id: string }; Returns: Json }
      get_loan_portfolio_summary: {
        Args: { p_user_id?: string }
        Returns: Json
      }
      get_or_create_ips_onboarding: {
        Args: { p_user_id?: string }
        Returns: Json
      }
      get_overdue_loans: {
        Args: never
        Returns: {
          client_name: string
          last_payment_date: string
          loan_id: string
          max_days_overdue: number
          overdue_installments: number
          phone_number: string
          total_late_fees: number
          total_overdue_amount: number
          user_id: string
        }[]
      }
      get_pacs009_batch: { Args: { p_batch_id: string }; Returns: Json }
      get_payment_schedule: {
        Args: { p_loan_id: string }
        Returns: {
          amount_paid: number
          balance: number
          days_overdue: number
          due_date: string
          fee_amount: number
          id: string
          installment_number: number
          interest_amount: number
          late_fee_applied: number
          paid_at: string
          principal_amount: number
          status: string
          total_amount: number
        }[]
      }
      get_pending_disbursements: {
        Args: never
        Returns: {
          amount: number
          client_name: string
          created_at: string
          id: string
          loan_id: string
          method: string
          reference: string
          scheduled_at: string
          status: string
        }[]
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
      get_schedule_balance: { Args: { p_schedule_id: string }; Returns: number }
      get_schedule_total_amount: {
        Args: { p_schedule_id: string }
        Returns: number
      }
      get_settlement_adjustments: {
        Args: { p_run_id?: string; p_status?: string }
        Returns: {
          adjustment_type: string
          amount: number
          created_at: string
          id: string
          reason_code: string
          reason_description: string
          response_required_by: string
          run_date: string
          run_id: string
          source_participant: string
          status: string
          target_participant: string
        }[]
      }
      get_settlement_reports: {
        Args: {
          p_participant_id?: string
          p_report_type?: Database["public"]["Enums"]["settlement_report_type"]
          p_run_id?: string
        }
        Returns: {
          created_at: string
          distributed_at: string
          file_name: string
          file_size: number
          id: string
          participant_name: string
          report_type: Database["public"]["Enums"]["settlement_report_type"]
          run_date: string
          run_id: string
          window_id: string
        }[]
      }
      get_settlement_run_details: { Args: { p_run_id: string }; Returns: Json }
      get_settlement_runs: {
        Args: {
          p_date_from?: string
          p_date_to?: string
          p_limit?: number
          p_state?: Database["public"]["Enums"]["settlement_run_state"]
        }
        Returns: {
          created_at: string
          id: string
          net_instruction_count: number
          run_id: string
          settled_at: string
          settlement_date: string
          state: Database["public"]["Enums"]["settlement_run_state"]
          total_interchange: number
          total_principal: number
          total_switching_fee: number
          transaction_count: number
          window_id: string
        }[]
      }
      get_settlement_statistics: {
        Args: { p_date_from?: string; p_date_to?: string }
        Returns: Json
      }
      get_timeout_transactions: {
        Args: { p_status?: string }
        Returns: {
          amount: number
          counterparty: string
          created_at: string
          id: string
          participant: string
          run_date: string
          run_id: string
          status: string
          timeout_reason: string
        }[]
      }
      get_unread_notification_count: { Args: never; Returns: number }
      get_user_roles: {
        Args: { target_user_id: string }
        Returns: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_user_vpas: { Args: { p_user_id?: string }; Returns: Json }
      get_users_pending_ipp_onboarding: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_state_filter?: Database["public"]["Enums"]["ipp_onboarding_state"]
        }
        Returns: Json
      }
      has_admin_role: { Args: { uid?: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_staff_role: { Args: { uid?: string }; Returns: boolean }
      ingest_ips_transactions_for_settlement: {
        Args: { p_date_from?: string; p_date_to?: string; p_run_id: string }
        Returns: Json
      }
      initiate_ips_disbursement: {
        Args: {
          p_disbursement_id: string
          p_note?: string
          p_payee_vpa: string
        }
        Returns: Json
      }
      initiate_ips_repayment: {
        Args: {
          p_amount: number
          p_loan_id: string
          p_note?: string
          p_payer_vpa: string
        }
        Returns: Json
      }
      is_ips_error_retryable: { Args: { p_code: string }; Returns: boolean }
      is_user_ipp_ready: { Args: { p_user_id?: string }; Returns: boolean }
      log_collections_interaction: {
        Args: {
          p_call_duration?: number
          p_interaction_type: string
          p_loan_id: string
          p_next_action?: string
          p_next_action_date?: string
          p_notes?: string
          p_outcome?: string
        }
        Returns: string
      }
      log_state_transition: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_from_state: string
          p_reason?: string
          p_to_state: string
          p_workflow_instance_id?: string
        }
        Returns: string
      }
      log_view_access: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_fields_viewed?: string[]
          p_view_duration_ms?: number
        }
        Returns: string
      }
      mark_all_notifications_read: { Args: never; Returns: number }
      mark_disbursement_processing: {
        Args: { p_disbursement_id: string; p_notes?: string }
        Returns: Json
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      mark_overdue_payments: { Args: never; Returns: Json }
      mark_promise_fulfilled: { Args: { p_activity_id: string }; Returns: Json }
      mark_settlement_settled: { Args: { p_run_id: string }; Returns: Json }
      process_approval_transaction: {
        Args: { p_request_id: string }
        Returns: Json
      }
      process_loan_payment: {
        Args: {
          p_amount: number
          p_loan_id: string
          p_notes?: string
          p_payment_method: string
          p_reference_number?: string
        }
        Returns: Json
      }
      process_notification_queue: { Args: never; Returns: number }
      process_payment_webhook: {
        Args: {
          p_provider: string
          p_provider_data: Json
          p_reference: string
          p_status: string
        }
        Returns: string
      }
      process_reschedule_request: {
        Args: { p_admin_notes?: string; p_request_id: string; p_status: string }
        Returns: boolean
      }
      process_settlement_run: {
        Args: { p_date_from?: string; p_date_to?: string; p_run_id: string }
        Returns: Json
      }
      queue_ipp_onboarding_notification: {
        Args: {
          p_message?: string
          p_state: Database["public"]["Enums"]["ipp_onboarding_state"]
          p_title?: string
          p_user_id: string
        }
        Returns: string
      }
      queue_notification: {
        Args: {
          p_data?: Json
          p_scheduled_at?: string
          p_template_code: string
          p_user_id: string
        }
        Returns: string[]
      }
      queue_tigerbeetle_event: {
        Args: {
          p_event_type: string
          p_payload: Json
          p_source_id: string
          p_source_table: string
        }
        Returns: string
      }
      record_collection_activity: {
        Args: {
          p_activity_type: string
          p_contact_method?: string
          p_loan_id: string
          p_next_action_date?: string
          p_next_action_type?: string
          p_notes?: string
          p_outcome?: string
          p_promise_amount?: number
          p_promise_date?: string
        }
        Returns: Json
      }
      record_payment_promise: {
        Args: {
          p_loan_id: string
          p_notes?: string
          p_promise_amount: number
          p_promise_date: string
        }
        Returns: Json
      }
      remove_user_role: {
        Args: {
          target_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      request_payment_reschedule: {
        Args: {
          p_loan_id: string
          p_original_due_date: string
          p_reason: string
          p_requested_date: string
        }
        Returns: string
      }
      resolve_ips_alert: {
        Args: { p_alert_id: string; p_notes: string }
        Returns: boolean
      }
      resolve_promise_to_pay: {
        Args: { p_notes?: string; p_ptp_id: string; p_status: string }
        Returns: boolean
      }
      send_ips_alert_notification: {
        Args: { p_alert_id: string }
        Returns: number
      }
      send_notification: {
        Args: {
          p_action_label?: string
          p_action_url?: string
          p_category?: string
          p_message: string
          p_metadata?: Json
          p_priority?: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      set_user_roles: {
        Args: {
          target_roles: Database["public"]["Enums"]["app_role"][]
          target_user_id: string
        }
        Returns: undefined
      }
      start_workflow_instance: {
        Args: { p_entity_id: string; p_entity_type: string; p_metadata?: Json }
        Returns: string
      }
      submit_approval_request: {
        Args: {
          p_reference_id?: string
          p_reference_table?: string
          p_request_data: Json
          p_request_type: string
        }
        Returns: string
      }
      upsert_user_vpa: {
        Args: {
          p_display_name?: string
          p_set_default?: boolean
          p_vpa_address: string
          p_vpa_type?: string
        }
        Returns: Json
      }
      uuid_to_tb_id: {
        Args: { input_uuid: string }
        Returns: {
          high_bits: number
          low_bits: number
        }[]
      }
      validate_role_hierarchy: {
        Args: {
          new_roles: Database["public"]["Enums"]["app_role"][]
          target_user_id: string
        }
        Returns: boolean
      }
      waive_late_fee: {
        Args: { p_late_fee_id: string; p_reason: string }
        Returns: Json
      }
    }
    Enums: {
      ack_type: "xsys_001" | "xsys_002" | "xsys_003"
      app_role: "client" | "loan_officer" | "admin"
      ipp_alias_id_type: "MOBILE" | "NUMERICID"
      ipp_alias_status:
        | "NEW"
        | "ACTIVE"
        | "INACTIVE"
        | "BLOCKED"
        | "DEREGISTER"
        | "PORTED"
      ipp_merchant_state:
        | "MERCHANT_KYC_PENDING"
        | "MERCHANT_KYC_APPROVED"
        | "MERCHANT_ALIAS_PENDING"
        | "MERCHANT_ALIAS_CREATED"
        | "MERCHANT_ID_PENDING"
        | "MERCHANT_ID_ASSIGNED"
        | "MERCHANT_DIRECTORY_PENDING"
        | "MERCHANT_DIRECTORY_REGISTERED"
        | "QR_GENERATION_PENDING"
        | "QR_READY"
        | "MERCHANT_LIVE"
        | "MERCHANT_SUSPENDED"
        | "MERCHANT_DEREGISTERED"
      ipp_onboarding_state:
        | "NOT_STARTED"
        | "DEVICE_BINDING_REQUIRED"
        | "DEVICE_BOUND"
        | "SOV_SELECTION_PENDING"
        | "SOV_SELECTED"
        | "ACCOUNTS_LISTED"
        | "VERIFICATION_PENDING"
        | "VERIFIED"
        | "IPS_PIN_SETTING"
        | "IPS_PIN_SET"
        | "ALIAS_REGISTRATION_PENDING"
        | "ALIAS_REGISTERED"
        | "READY_FOR_IPP_PAYMENTS"
        | "SUSPENDED"
        | "DEREGISTERED"
      obligation_category:
        | "principal"
        | "interchange"
        | "switching_fee"
        | "penalty"
        | "adjustment"
      participant_type: "direct" | "sponsored"
      settlement_batch_type: "main" | "switching_fee"
      settlement_report_type:
        | "raw_data"
        | "ntsl"
        | "adjustment"
        | "pending_adjustment_response"
        | "pending_status"
        | "timeout"
      settlement_run_state:
        | "collecting"
        | "cutoff_reached"
        | "prepare_inputs"
        | "netting"
        | "generated"
        | "dispatched"
        | "sent_to_swift"
        | "swift_validated"
        | "sent_to_niss"
        | "niss_accepted"
        | "failed_validation"
        | "settled"
        | "closed"
        | "adjustment_pending"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ack_type: ["xsys_001", "xsys_002", "xsys_003"],
      app_role: ["client", "loan_officer", "admin"],
      ipp_alias_id_type: ["MOBILE", "NUMERICID"],
      ipp_alias_status: [
        "NEW",
        "ACTIVE",
        "INACTIVE",
        "BLOCKED",
        "DEREGISTER",
        "PORTED",
      ],
      ipp_merchant_state: [
        "MERCHANT_KYC_PENDING",
        "MERCHANT_KYC_APPROVED",
        "MERCHANT_ALIAS_PENDING",
        "MERCHANT_ALIAS_CREATED",
        "MERCHANT_ID_PENDING",
        "MERCHANT_ID_ASSIGNED",
        "MERCHANT_DIRECTORY_PENDING",
        "MERCHANT_DIRECTORY_REGISTERED",
        "QR_GENERATION_PENDING",
        "QR_READY",
        "MERCHANT_LIVE",
        "MERCHANT_SUSPENDED",
        "MERCHANT_DEREGISTERED",
      ],
      ipp_onboarding_state: [
        "NOT_STARTED",
        "DEVICE_BINDING_REQUIRED",
        "DEVICE_BOUND",
        "SOV_SELECTION_PENDING",
        "SOV_SELECTED",
        "ACCOUNTS_LISTED",
        "VERIFICATION_PENDING",
        "VERIFIED",
        "IPS_PIN_SETTING",
        "IPS_PIN_SET",
        "ALIAS_REGISTRATION_PENDING",
        "ALIAS_REGISTERED",
        "READY_FOR_IPP_PAYMENTS",
        "SUSPENDED",
        "DEREGISTERED",
      ],
      obligation_category: [
        "principal",
        "interchange",
        "switching_fee",
        "penalty",
        "adjustment",
      ],
      participant_type: ["direct", "sponsored"],
      settlement_batch_type: ["main", "switching_fee"],
      settlement_report_type: [
        "raw_data",
        "ntsl",
        "adjustment",
        "pending_adjustment_response",
        "pending_status",
        "timeout",
      ],
      settlement_run_state: [
        "collecting",
        "cutoff_reached",
        "prepare_inputs",
        "netting",
        "generated",
        "dispatched",
        "sent_to_swift",
        "swift_validated",
        "sent_to_niss",
        "niss_accepted",
        "failed_validation",
        "settled",
        "closed",
        "adjustment_pending",
      ],
    },
  },
} as const

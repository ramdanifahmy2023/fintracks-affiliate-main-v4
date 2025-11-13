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
    PostgrestVersion: "13.0.5"
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
      accounts: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"] | null
          created_at: string
          data_status: Database["public"]["Enums"]["account_data_status"] | null
          email: string
          group_id: string | null
          id: string
          password: string
          phone: string | null
          platform: Database["public"]["Enums"]["account_platform"]
          updated_at: string
          username: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          created_at?: string
          data_status?:
            | Database["public"]["Enums"]["account_data_status"]
            | null
          email: string
          group_id?: string | null
          id?: string
          password: string
          phone?: string | null
          platform: Database["public"]["Enums"]["account_platform"]
          updated_at?: string
          username: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"] | null
          created_at?: string
          data_status?:
            | Database["public"]["Enums"]["account_data_status"]
            | null
          email?: string
          group_id?: string | null
          id?: string
          password?: string
          phone?: string | null
          platform?: Database["public"]["Enums"]["account_platform"]
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          assigned_to: string | null
          category: string
          condition: string | null
          created_at: string
          current_value: number | null
          id: string
          location: string | null
          name: string
          notes: string | null
          purchase_date: string
          purchase_price: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          condition?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          purchase_date: string
          purchase_price: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          condition?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string
          purchase_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          attendance_date: string
          check_in: string | null
          check_out: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          updated_at: string
        }
        Insert: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string
        }
        Update: {
          attendance_date?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cashflow: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          group_id: string | null
          id: string
          proof_url: string | null
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          group_id?: string | null
          id?: string
          proof_url?: string | null
          transaction_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          group_id?: string | null
          id?: string
          proof_url?: string | null
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashflow_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cashflow_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          account_id: string
          created_at: string
          employee_id: string | null
          gross_commission: number
          id: string
          net_commission: number
          paid_commission: number
          payment_date: string | null
          period: Database["public"]["Enums"]["commission_period"]
          period_end: string
          period_start: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          employee_id?: string | null
          gross_commission?: number
          id?: string
          net_commission?: number
          paid_commission?: number
          payment_date?: string | null
          period: Database["public"]["Enums"]["commission_period"]
          period_end: string
          period_start: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          employee_id?: string | null
          gross_commission?: number
          id?: string
          net_commission?: number
          paid_commission?: number
          payment_date?: string | null
          period?: Database["public"]["Enums"]["commission_period"]
          period_end?: string
          period_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          account_id: string | null
          closing_balance: number
          created_at: string
          device_id: string | null
          employee_id: string
          id: string
          kategori_produk: string | null
          live_status: string | null
          notes: string | null
          opening_balance: number | null
          report_date: string
          shift_number: string | null
          shift_status: Database["public"]["Enums"]["shift_status"]
          submitted_at: string | null
          total_sales: number
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          closing_balance?: number
          created_at?: string
          device_id?: string | null
          employee_id: string
          id?: string
          kategori_produk?: string | null
          live_status?: string | null
          notes?: string | null
          opening_balance?: number | null
          report_date?: string
          shift_number?: string | null
          shift_status?: Database["public"]["Enums"]["shift_status"]
          submitted_at?: string | null
          total_sales?: number
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          closing_balance?: number
          created_at?: string
          device_id?: string | null
          employee_id?: string
          id?: string
          kategori_produk?: string | null
          live_status?: string | null
          notes?: string | null
          opening_balance?: number | null
          report_date?: string
          shift_number?: string | null
          shift_status?: Database["public"]["Enums"]["shift_status"]
          submitted_at?: string | null
          total_sales?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      debt_receivable: {
        Row: {
          amount: number
          counterparty: string
          created_at: string
          description: string | null
          due_date: string | null
          group_id: string | null
          id: string
          status: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          counterparty: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          group_id?: string | null
          id?: string
          status?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          counterparty?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          group_id?: string | null
          id?: string
          status?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debt_receivable_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          device_id: string
          google_account: string | null
          group_id: string | null
          id: string
          imei: string
          purchase_date: string | null
          purchase_price: number | null
          screenshot_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_id: string
          google_account?: string | null
          group_id?: string | null
          id?: string
          imei: string
          purchase_date?: string | null
          purchase_price?: number | null
          screenshot_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_id?: string
          google_account?: string | null
          group_id?: string | null
          id?: string
          imei?: string
          purchase_date?: string | null
          purchase_price?: number | null
          screenshot_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          position: string | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          position?: string | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          position?: string | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          leader_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_base: {
        Row: {
          category: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_base_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_targets: {
        Row: {
          actual_attendance: number | null
          actual_commission: number | null
          actual_sales: number | null
          attendance_target: number | null
          commission_target: number
          created_at: string
          employee_id: string
          id: string
          sales_target: number
          target_month: string
          updated_at: string
        }
        Insert: {
          actual_attendance?: number | null
          actual_commission?: number | null
          actual_sales?: number | null
          attendance_target?: number | null
          commission_target?: number
          created_at?: string
          employee_id: string
          id?: string
          sales_target?: number
          target_month: string
          updated_at?: string
        }
        Update: {
          actual_attendance?: number | null
          actual_commission?: number | null
          actual_sales?: number | null
          attendance_target?: number | null
          commission_target?: number
          created_at?: string
          employee_id?: string
          id?: string
          sales_target?: number
          target_month?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kpi_targets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_read: boolean
          link: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string
          full_name: string
          id: string
          join_date: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email: string
          full_name: string
          id?: string
          join_date?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string
          full_name?: string
          id?: string
          join_date?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_group_and_assign: {
        Args: {
          account_ids?: string[]
          device_ids?: string[]
          employee_ids?: string[]
          group_desc?: string
          group_name: string
        }
        Returns: undefined
      }
      create_new_employee: {
        Args: {
          email: string
          employee_position: string
          full_name: string
          group_id?: string
          join_date: string
          password: string
          phone: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Returns: string
      }
      delete_group: { Args: { group_id_to_delete: string }; Returns: undefined }
      get_daily_sales_chart: {
        Args: {
          employee_id_filter?: string
          end_date: string
          group_id_filter?: string
          start_date: string
        }
        Returns: {
          report_date: string
          total_omset: number
        }[]
      }
      get_group_stats: {
        Args: never
        Returns: {
          account_count: number
          description: string
          device_count: number
          employee_count: number
          id: string
          name: string
        }[]
      }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      update_group_and_assign: {
        Args: {
          group_id_to_edit: string
          new_account_ids?: string[]
          new_desc?: string
          new_device_ids?: string[]
          new_employee_ids?: string[]
          new_name: string
        }
        Returns: undefined
      }
    }
    Enums: {
      account_data_status: "empty" | "in_progress" | "rejected" | "verified"
      account_platform: "shopee" | "tiktok"
      account_status: "active" | "banned_temporary" | "banned_permanent"
      attendance_status: "present" | "leave" | "sick" | "absent"
      commission_period: "M1" | "M2" | "M3" | "M4" | "M5"
      expense_category:
        | "fixed"
        | "variable"
        | "Variable"
        | "Fix Cost"
        | "Lain-lain"
        | "Variable Cost"
      shift_status: "smooth" | "dead_relive"
      user_role: "superadmin" | "leader" | "admin" | "staff" | "viewer"
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
      account_data_status: ["empty", "in_progress", "rejected", "verified"],
      account_platform: ["shopee", "tiktok"],
      account_status: ["active", "banned_temporary", "banned_permanent"],
      attendance_status: ["present", "leave", "sick", "absent"],
      commission_period: ["M1", "M2", "M3", "M4", "M5"],
      expense_category: [
        "fixed",
        "variable",
        "Variable",
        "Fix Cost",
        "Lain-lain",
        "Variable Cost",
      ],
      shift_status: ["smooth", "dead_relive"],
      user_role: ["superadmin", "leader", "admin", "staff", "viewer"],
    },
  },
} as const

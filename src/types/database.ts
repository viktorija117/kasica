// Shape matches `supabase gen types typescript`. Regenerate with `npm run db:types`
// after `npx supabase link`, whenever a migration changes the schema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type HouseholdFk<Name extends string, Column extends string, Table extends string, RefColumn extends string> = {
  foreignKeyName: Name
  columns: ['household_id', Column]
  isOneToOne: false
  referencedRelation: Table
  referencedColumns: ['household_id', RefColumn]
}

type HouseholdRef<Name extends string> = {
  foreignKeyName: Name
  columns: ['household_id']
  isOneToOne: false
  referencedRelation: 'households'
  referencedColumns: ['id']
}

export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          invite_code: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          invite_code: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string
          created_at?: string
        }
        Relationships: []
      }
      household_members: {
        Row: {
          household_id: string
          user_id: string
          display_name: string
          joined_at: string
        }
        Insert: {
          household_id: string
          user_id: string
          display_name: string
          joined_at?: string
        }
        Update: {
          household_id?: string
          user_id?: string
          display_name?: string
          joined_at?: string
        }
        Relationships: [HouseholdRef<'household_members_household_id_fkey'>]
      }
      categories: {
        Row: {
          id: string
          household_id: string
          name: string
          emoji: string
          color: string
          sort: number
          monthly_limit: number | null
          default_necessity: Database['public']['Enums']['necessity']
          archived: boolean
          import_batch: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          emoji?: string
          color?: string
          sort?: number
          monthly_limit?: number | null
          default_necessity?: Database['public']['Enums']['necessity']
          archived?: boolean
          import_batch?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          emoji?: string
          color?: string
          sort?: number
          monthly_limit?: number | null
          default_necessity?: Database['public']['Enums']['necessity']
          archived?: boolean
          import_batch?: string | null
          created_at?: string
        }
        Relationships: [
          HouseholdRef<'categories_household_id_fkey'>,
          HouseholdFk<'categories_household_id_import_batch_fkey', 'import_batch', 'import_batches', 'id'>,
        ]
      }
      import_batches: {
        Row: {
          id: string
          household_id: string
          file_name: string
          created_by: string | null
          created_at: string
          month_settings_before: Json
        }
        Insert: {
          id?: string
          household_id: string
          file_name: string
          created_by?: string | null
          created_at?: string
          month_settings_before?: Json
        }
        Update: {
          id?: string
          household_id?: string
          file_name?: string
          created_by?: string | null
          created_at?: string
          month_settings_before?: Json
        }
        Relationships: [HouseholdRef<'import_batches_household_id_fkey'>]
      }
      recurring_expenses: {
        Row: {
          id: string
          household_id: string
          name: string
          category_id: string
          amount: number
          day_of_month: number
          necessity: Database['public']['Enums']['necessity']
          active: boolean
          sort: number
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          category_id: string
          amount: number
          day_of_month: number
          necessity?: Database['public']['Enums']['necessity']
          active?: boolean
          sort?: number
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          category_id?: string
          amount?: number
          day_of_month?: number
          necessity?: Database['public']['Enums']['necessity']
          active?: boolean
          sort?: number
          created_at?: string
        }
        Relationships: [
          HouseholdRef<'recurring_expenses_household_id_fkey'>,
          HouseholdFk<'recurring_expenses_household_id_category_id_fkey', 'category_id', 'categories', 'id'>,
        ]
      }
      receipts: {
        Row: {
          id: string
          household_id: string
          url: string
          store: string | null
          date: string | null
          total: number | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          url: string
          store?: string | null
          date?: string | null
          total?: number | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          url?: string
          store?: string | null
          date?: string | null
          total?: number | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [HouseholdRef<'receipts_household_id_fkey'>]
      }
      expenses: {
        Row: {
          id: string
          household_id: string
          date: string
          category_id: string
          description: string
          amount: number
          necessity: Database['public']['Enums']['necessity']
          paid_by: string | null
          note: string | null
          recurring_id: string | null
          import_batch: string | null
          receipt_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          date: string
          category_id: string
          description?: string
          amount: number
          necessity: Database['public']['Enums']['necessity']
          paid_by?: string | null
          note?: string | null
          recurring_id?: string | null
          import_batch?: string | null
          receipt_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          date?: string
          category_id?: string
          description?: string
          amount?: number
          necessity?: Database['public']['Enums']['necessity']
          paid_by?: string | null
          note?: string | null
          recurring_id?: string | null
          import_batch?: string | null
          receipt_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          HouseholdRef<'expenses_household_id_fkey'>,
          HouseholdFk<'expenses_household_id_category_id_fkey', 'category_id', 'categories', 'id'>,
          HouseholdFk<'expenses_household_id_paid_by_fkey', 'paid_by', 'household_members', 'user_id'>,
          HouseholdFk<'expenses_household_id_recurring_id_fkey', 'recurring_id', 'recurring_expenses', 'id'>,
          HouseholdFk<'expenses_household_id_import_batch_fkey', 'import_batch', 'import_batches', 'id'>,
          HouseholdFk<'expenses_household_id_receipt_id_fkey', 'receipt_id', 'receipts', 'id'>,
        ]
      }
      incomes: {
        Row: {
          id: string
          household_id: string
          date: string
          source: string
          amount: number
          received_by: string | null
          note: string | null
          import_batch: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          date: string
          source: string
          amount: number
          received_by?: string | null
          note?: string | null
          import_batch?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          date?: string
          source?: string
          amount?: number
          received_by?: string | null
          note?: string | null
          import_batch?: string | null
          created_at?: string
        }
        Relationships: [
          HouseholdRef<'incomes_household_id_fkey'>,
          HouseholdFk<'incomes_household_id_received_by_fkey', 'received_by', 'household_members', 'user_id'>,
          HouseholdFk<'incomes_household_id_import_batch_fkey', 'import_batch', 'import_batches', 'id'>,
        ]
      }
      savings: {
        Row: {
          id: string
          household_id: string
          date: string
          amount: number
          note: string | null
          import_batch: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          date: string
          amount: number
          note?: string | null
          import_batch?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          date?: string
          amount?: number
          note?: string | null
          import_batch?: string | null
          created_at?: string
        }
        Relationships: [
          HouseholdRef<'savings_household_id_fkey'>,
          HouseholdFk<'savings_household_id_import_batch_fkey', 'import_batch', 'import_batches', 'id'>,
        ]
      }
      month_settings: {
        Row: {
          household_id: string
          month: string
          carry_enabled: boolean
          carry_override: number | null
        }
        Insert: {
          household_id: string
          month: string
          carry_enabled?: boolean
          carry_override?: number | null
        }
        Update: {
          household_id?: string
          month?: string
          carry_enabled?: boolean
          carry_override?: number | null
        }
        Relationships: [HouseholdRef<'month_settings_household_id_fkey'>]
      }
    }
    Views: {
      expense_suggestions: {
        Row: {
          household_id: string
          description: string
          category_id: string
          necessity: Database['public']['Enums']['necessity']
          uses: number
          last_date: string
        }
        Relationships: []
      }
      month_category_totals: {
        Row: {
          household_id: string
          month: string
          category_id: string
          spent: number
          unneeded: number
        }
        Relationships: []
      }
      month_totals: {
        Row: {
          household_id: string
          month: string
          income: number
          spent: number
          saved: number
          entries: number
        }
        Relationships: []
      }
    }
    Functions: {
      import_workbook: {
        Args: {
          p_household_id: string
          p_file_name: string
          p_categories: Json
          p_expenses: Json
          p_incomes: Json
          p_savings: Json
          p_carry: Json
        }
        Returns: string
      }
      undo_import: {
        Args: { p_batch_id: string }
        Returns: undefined
      }
      reorder_categories: {
        Args: { p_household_id: string; p_ids: string[] }
        Returns: undefined
      }
      reorder_recurring_expenses: {
        Args: { p_household_id: string; p_ids: string[] }
        Returns: undefined
      }
      create_household: {
        Args: { p_name: string; p_display_name: string }
        Returns: string
      }
      generate_invite_code: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_member: {
        Args: { hh: string }
        Returns: boolean
      }
      join_household: {
        Args: { p_code: string; p_display_name: string }
        Returns: string
      }
    }
    Enums: {
      necessity: 'needed' | 'unneeded'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']
export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      allowed_professor_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          note: string | null
          professor_name: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          note?: string | null
          professor_name?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          note?: string | null
          professor_name?: string | null
        }
        Relationships: []
      }
      allowed_student_ids: {
        Row: {
          created_at: string
          id: string
          note: string | null
          student_id: string
          student_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          student_id: string
          student_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          student_id?: string
          student_name?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          classroom: string | null
          created_at: string
          description: string | null
          end_time: string
          id: string
          name: string
          professor_id: string | null
          professor_name: string | null
          start_time: string
          textbook_info: string | null
          textbook_title: string | null
          weekday: Database["public"]["Enums"]["weekday"]
        }
        Insert: {
          classroom?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          name: string
          professor_id?: string | null
          professor_name?: string | null
          start_time: string
          textbook_info?: string | null
          textbook_title?: string | null
          weekday: Database["public"]["Enums"]["weekday"]
        }
        Update: {
          classroom?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          name?: string
          professor_id?: string | null
          professor_name?: string | null
          start_time?: string
          textbook_info?: string | null
          textbook_title?: string | null
          weekday?: Database["public"]["Enums"]["weekday"]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          post_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          post_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          post_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      password_hints: {
        Row: {
          ciphertext: string
          iv: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ciphertext: string
          iv: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ciphertext?: string
          iv?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      password_recovery_requests: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          full_name: string | null
          id: string
          identifier: string
          requested_at: string
          role: string | null
          status: string
          temp_password: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          full_name?: string | null
          id?: string
          identifier: string
          requested_at?: string
          role?: string | null
          status?: string
          temp_password?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          full_name?: string | null
          id?: string
          identifier?: string
          requested_at?: string
          role?: string | null
          status?: string
          temp_password?: string | null
          user_id?: string
        }
        Relationships: []
      }
      post_attachments: {
        Row: {
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          post_id: string
          size_bytes: number
          storage_path: string
          uploader_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          post_id: string
          size_bytes: number
          storage_path: string
          uploader_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          post_id?: string
          size_bytes?: number
          storage_path?: string
          uploader_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_attachments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          author_id: string
          author_name: string
          author_role: Database["public"]["Enums"]["app_role"]
          content: string
          created_at: string
          id: string
          is_secret: boolean
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name: string
          author_role: Database["public"]["Enums"]["app_role"]
          content: string
          created_at?: string
          id?: string
          is_secret?: boolean
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          author_role?: Database["public"]["Enums"]["app_role"]
          content?: string
          created_at?: string
          id?: string
          is_secret?: boolean
          post_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_reads: {
        Row: {
          id: string
          post_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          post_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          post_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reads_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          author_name: string
          author_role: Database["public"]["Enums"]["app_role"]
          category: Database["public"]["Enums"]["post_category"]
          content: string | null
          course_id: string | null
          created_at: string
          due_date: string | null
          id: string
          inquiry_target_professor_id: string | null
          is_pinned: boolean
          notify_audience: string
          parent_post_id: string | null
          title: string
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          author_name: string
          author_role: Database["public"]["Enums"]["app_role"]
          category: Database["public"]["Enums"]["post_category"]
          content?: string | null
          course_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          inquiry_target_professor_id?: string | null
          is_pinned?: boolean
          notify_audience?: string
          parent_post_id?: string | null
          title: string
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          author_name?: string
          author_role?: Database["public"]["Enums"]["app_role"]
          category?: Database["public"]["Enums"]["post_category"]
          content?: string | null
          course_id?: string | null
          created_at?: string
          due_date?: string | null
          id?: string
          inquiry_target_professor_id?: string | null
          is_pinned?: boolean
          notify_audience?: string
          parent_post_id?: string | null
          title?: string
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "posts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_parent_post_id_fkey"
            columns: ["parent_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          can_pin: boolean
          can_write_notice: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          student_id: string | null
        }
        Insert: {
          can_pin?: boolean
          can_write_notice?: boolean
          created_at?: string
          email: string
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          student_id?: string | null
        }
        Update: {
          can_pin?: boolean
          can_write_notice?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          student_id?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      admin_exists: { Args: never; Returns: boolean }
      bootstrap_admin: { Args: never; Returns: undefined }
      can_view_post_comment: { Args: { _comment_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_post_view: { Args: { _post_id: string }; Returns: undefined }
      is_course_professor: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      update_my_profile: { Args: { _full_name: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "professor" | "student"
      post_category:
        | "material"
        | "assignment"
        | "notice"
        | "inquiry"
        | "submission"
        | "gallery"
      weekday: "mon" | "tue" | "wed" | "thu" | "fri"
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
      app_role: ["admin", "professor", "student"],
      post_category: [
        "material",
        "assignment",
        "notice",
        "inquiry",
        "submission",
        "gallery",
      ],
      weekday: ["mon", "tue", "wed", "thu", "fri"],
    },
  },
} as const

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          display_name: string;
          avatar_url: string | null;
          role: string;
          company_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          display_name: string;
          avatar_url?: string | null;
          role?: string;
          company_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          display_name?: string;
          avatar_url?: string | null;
          role?: string;
          company_name?: string | null;
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          company: string | null;
          status: "lead" | "prospect" | "customer" | "churned";
          notes: string | null;
          tags: string[];
          last_contacted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          status?: "lead" | "prospect" | "customer" | "churned";
          notes?: string | null;
          tags?: string[];
          last_contacted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          company?: string | null;
          status?: "lead" | "prospect" | "customer" | "churned";
          notes?: string | null;
          tags?: string[];
          last_contacted_at?: string | null;
          updated_at?: string;
        };
      };
      deals: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          title: string;
          value: number;
          currency: string;
          stage: "discovery" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
          expected_close_date: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id: string;
          title: string;
          value?: number;
          currency?: string;
          stage?: "discovery" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
          expected_close_date?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_id?: string;
          title?: string;
          value?: number;
          currency?: string;
          stage?: "discovery" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
          expected_close_date?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          contact_id: string;
          deal_id: string | null;
          type: "call" | "email" | "meeting" | "note";
          description: string;
          scheduled_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          contact_id: string;
          deal_id?: string | null;
          type: "call" | "email" | "meeting" | "note";
          description: string;
          scheduled_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          contact_id?: string;
          deal_id?: string | null;
          type?: "call" | "email" | "meeting" | "note";
          description?: string;
          scheduled_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      chat_history: {
        Row: {
          id: string;
          user_id: string;
          messages: Json;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          messages?: Json;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          messages?: Json;
          title?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type Deal = Database["public"]["Tables"]["deals"]["Row"];
export type Activity = Database["public"]["Tables"]["activities"]["Row"];
export type ChatHistory = Database["public"]["Tables"]["chat_history"]["Row"];

export type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];
export type ContactUpdate = Database["public"]["Tables"]["contacts"]["Update"];
export type DealInsert = Database["public"]["Tables"]["deals"]["Insert"];
export type DealUpdate = Database["public"]["Tables"]["deals"]["Update"];
export type ActivityInsert = Database["public"]["Tables"]["activities"]["Insert"];
export type ActivityUpdate = Database["public"]["Tables"]["activities"]["Update"];

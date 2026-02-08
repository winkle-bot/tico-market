// Database types for Supabase
// This is a simplified type definition - you can generate full types using supabase CLI

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          bio: string | null;
          location: string | null;
          rating: number;
          verified: boolean;
          joined: string;
          pickup_locations: Json | null;
          accepts_delivery: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          bio?: string | null;
          location?: string | null;
          rating?: number;
          verified?: boolean;
          joined?: string;
          pickup_locations?: Json | null;
          accepts_delivery?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          bio?: string | null;
          location?: string | null;
          rating?: number;
          verified?: boolean;
          joined?: string;
          pickup_locations?: Json | null;
          accepts_delivery?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      listings: {
        Row: {
          id: number;
          seller_id: string;
          title: string;
          description: string | null;
          price: string;
          category: string;
          location_lat: number;
          location_lng: number;
          rating: number;
          type: 'seller' | 'driver';
          owner: string;
          image_url: string | null;
          verified: boolean;
          private_key: string | null;
          pickup_config: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          seller_id: string;
          title: string;
          description?: string | null;
          price: string;
          category: string;
          location_lat: number;
          location_lng: number;
          rating?: number;
          type: 'seller' | 'driver';
          owner: string;
          image_url?: string | null;
          verified?: boolean;
          private_key?: string | null;
          pickup_config?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          seller_id?: string;
          title?: string;
          description?: string | null;
          price?: string;
          category?: string;
          location_lat?: number;
          location_lng?: number;
          rating?: number;
          type?: 'seller' | 'driver';
          owner?: string;
          image_url?: string | null;
          verified?: boolean;
          private_key?: string | null;
          pickup_config?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: number;
          listing_id: number;
          sender_id: string;
          text: string;
          created_at: string;
          read: boolean;
          buyer_id: string;
          buyer_name: string;
          seller_id: string;
          seller_name: string;
        };
        Insert: {
          id?: number;
          listing_id: number;
          sender_id: string;
          text: string;
          created_at?: string;
          read?: boolean;
          buyer_id: string;
          buyer_name: string;
          seller_id: string;
          seller_name: string;
        };
        Update: {
          id?: number;
          listing_id?: number;
          sender_id?: string;
          text?: string;
          created_at?: string;
          read?: boolean;
          buyer_id?: string;
          buyer_name?: string;
          seller_id?: string;
          seller_name?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          listing_id: number;
          listing_snapshot: Json;
          buyer_id: string;
          buyer_name: string;
          seller_id: string;
          seller_name: string;
          type: 'delivery' | 'pickup';
          status: 'pending' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled';
          driver_id: string | null;
          driver_name: string | null;
          delivery_address: string | null;
          delivery_fee: number | null;
          pickup_location_id: string | null;
          pickup_location: Json | null;
          scheduled_window: string | null;
          notes: string | null;
          payment_status: 'pending' | 'requires_payment' | 'paid' | 'failed' | 'refunded';
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          payment_amount: number | null;
          payment_currency: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: number;
          listing_snapshot: Json;
          buyer_id: string;
          buyer_name: string;
          seller_id: string;
          seller_name: string;
          type: 'delivery' | 'pickup';
          status?: 'pending' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled';
          driver_id?: string | null;
          driver_name?: string | null;
          delivery_address?: string | null;
          delivery_fee?: number | null;
          pickup_location_id?: string | null;
          pickup_location?: Json | null;
          scheduled_window?: string | null;
          notes?: string | null;
          payment_status?: 'pending' | 'requires_payment' | 'paid' | 'failed' | 'refunded';
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          payment_amount?: number | null;
          payment_currency?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: number;
          listing_snapshot?: Json;
          buyer_id?: string;
          buyer_name?: string;
          seller_id?: string;
          seller_name?: string;
          type?: 'delivery' | 'pickup';
          status?: 'pending' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled';
          driver_id?: string | null;
          driver_name?: string | null;
          delivery_address?: string | null;
          delivery_fee?: number | null;
          pickup_location_id?: string | null;
          pickup_location?: Json | null;
          scheduled_window?: string | null;
          notes?: string | null;
          payment_status?: 'pending' | 'requires_payment' | 'paid' | 'failed' | 'refunded';
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          payment_amount?: number | null;
          payment_currency?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      favorites: {
        Row: {
          id: number;
          user_id: string;
          listing_id: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          listing_id: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          listing_id?: number;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

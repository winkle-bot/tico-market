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
          role: 'user' | 'admin' | 'moderator';
          joined: string;
          pickup_locations: Json | null;
          accepts_delivery: boolean;
          avg_response_minutes: number | null;
          total_transactions: number;
          landmark_directions: string | null;
          verification_badges: Json;
          notification_prefs: Json;
          phone_number: string | null;
          whatsapp_opted_in: boolean;
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
          role?: 'user' | 'admin' | 'moderator';
          joined?: string;
          pickup_locations?: Json | null;
          accepts_delivery?: boolean;
          avg_response_minutes?: number | null;
          total_transactions?: number;
          landmark_directions?: string | null;
          verification_badges?: Json;
          notification_prefs?: Json;
          phone_number?: string | null;
          whatsapp_opted_in?: boolean;
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
          role?: 'user' | 'admin' | 'moderator';
          joined?: string;
          pickup_locations?: Json | null;
          accepts_delivery?: boolean;
          avg_response_minutes?: number | null;
          total_transactions?: number;
          landmark_directions?: string | null;
          verification_badges?: Json;
          notification_prefs?: Json;
          phone_number?: string | null;
          whatsapp_opted_in?: boolean;
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
          price: string | null;
          price_cents: number;
          currency: 'CRC' | 'USD';
          category: string;
          location_lat: number;
          location_lng: number;
          rating: number;
          listing_kind: 'seller' | 'driver';
          owner: string;
          image_url: string | null;
          image_urls: Json | null;
          condition: 'new' | 'like_new' | 'good' | 'fair' | 'for_parts';
          item_type: 'physical' | 'food' | 'service' | 'rental' | 'free';
          fulfillment_options: Json | null;
          verified: boolean;
          moderation_status: 'active' | 'hidden';
          private_key: string | null;
          pickup_config: Json | null;
          expires_at: string | null;
          last_bumped_at: string | null;
          landmark_directions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          seller_id: string;
          title: string;
          description?: string | null;
          price?: string | null;
          price_cents: number;
          currency?: 'CRC' | 'USD';
          category: string;
          location_lat: number;
          location_lng: number;
          rating?: number;
          listing_kind: 'seller' | 'driver';
          owner: string;
          image_url?: string | null;
          image_urls?: Json | null;
          condition?: 'new' | 'like_new' | 'good' | 'fair' | 'for_parts';
          item_type?: 'physical' | 'food' | 'service' | 'rental' | 'free';
          fulfillment_options?: Json | null;
          verified?: boolean;
          moderation_status?: 'active' | 'hidden';
          private_key?: string | null;
          pickup_config?: Json | null;
          expires_at?: string | null;
          last_bumped_at?: string | null;
          landmark_directions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          seller_id?: string;
          title?: string;
          description?: string | null;
          price?: string | null;
          price_cents?: number;
          currency?: 'CRC' | 'USD';
          category?: string;
          location_lat?: number;
          location_lng?: number;
          rating?: number;
          listing_kind?: 'seller' | 'driver';
          owner?: string;
          image_url?: string | null;
          image_urls?: Json | null;
          condition?: 'new' | 'like_new' | 'good' | 'fair' | 'for_parts';
          item_type?: 'physical' | 'food' | 'service' | 'rental' | 'free';
          fulfillment_options?: Json | null;
          verified?: boolean;
          moderation_status?: 'active' | 'hidden';
          private_key?: string | null;
          pickup_config?: Json | null;
          expires_at?: string | null;
          last_bumped_at?: string | null;
          landmark_directions?: string | null;
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
          attachments: Json | null;
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
          attachments?: Json | null;
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
          attachments?: Json | null;
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
      driver_profiles: {
        Row: {
          id: string;
          user_id: string;
          vehicle_type: 'motorcycle' | 'car' | 'pickup' | 'bike' | 'walker' | null;
          capacity_description: string | null;
          specialties: string[] | null;
          service_radius_km: number | null;
          base_location_lat: number | null;
          base_location_lng: number | null;
          current_lat: number | null;
          current_lng: number | null;
          is_online: boolean | null;
          total_deliveries: number | null;
          rating: number | null;
          face_image_url: string | null;
          is_verified: boolean | null;
          verification_status: 'none' | 'pending' | 'approved' | 'rejected';
          license_image_key: string | null;
          base_rate: number | null;
          live_now: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vehicle_type?: 'motorcycle' | 'car' | 'pickup' | 'bike' | 'walker' | null;
          capacity_description?: string | null;
          specialties?: string[] | null;
          service_radius_km?: number | null;
          base_location_lat?: number | null;
          base_location_lng?: number | null;
          current_lat?: number | null;
          current_lng?: number | null;
          is_online?: boolean | null;
          total_deliveries?: number | null;
          rating?: number | null;
          face_image_url?: string | null;
          is_verified?: boolean | null;
          verification_status?: 'none' | 'pending' | 'approved' | 'rejected';
          license_image_key?: string | null;
          base_rate?: number | null;
          live_now?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vehicle_type?: 'motorcycle' | 'car' | 'pickup' | 'bike' | 'walker' | null;
          capacity_description?: string | null;
          specialties?: string[] | null;
          service_radius_km?: number | null;
          base_location_lat?: number | null;
          base_location_lng?: number | null;
          current_lat?: number | null;
          current_lng?: number | null;
          is_online?: boolean | null;
          total_deliveries?: number | null;
          rating?: number | null;
          face_image_url?: string | null;
          is_verified?: boolean | null;
          verification_status?: 'none' | 'pending' | 'approved' | 'rejected';
          license_image_key?: string | null;
          base_rate?: number | null;
          live_now?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      delivery_requests: {
        Row: {
          id: string;
          requester_id: string;
          status: 'open' | 'assigned' | 'in_transit' | 'completed' | 'cancelled' | null;
          request_type: 'auto' | 'manual' | 'broadcast';
          target_driver_id: string | null;
          expires_at: string | null;
          offered_price: number | null;
          pickup_address: string;
          pickup_lat: number | null;
          pickup_lng: number | null;
          pickup_instructions: string | null;
          pickup_window_start: string | null;
          pickup_window_end: string | null;
          dropoff_address: string;
          dropoff_lat: number | null;
          dropoff_lng: number | null;
          dropoff_instructions: string | null;
          dropoff_window_start: string | null;
          dropoff_window_end: string | null;
          item_description: string;
          item_photos: string[] | null;
          estimated_weight_kg: number | null;
          is_fragile: boolean | null;
          budget_amount: number | null;
          final_amount: number | null;
          assigned_driver_id: string | null;
          assigned_at: string | null;
          picked_up_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          requester_id: string;
          status?: 'open' | 'assigned' | 'in_transit' | 'completed' | 'cancelled' | null;
          request_type?: 'auto' | 'manual' | 'broadcast';
          target_driver_id?: string | null;
          expires_at?: string | null;
          offered_price?: number | null;
          pickup_address: string;
          pickup_lat?: number | null;
          pickup_lng?: number | null;
          pickup_instructions?: string | null;
          pickup_window_start?: string | null;
          pickup_window_end?: string | null;
          dropoff_address: string;
          dropoff_lat?: number | null;
          dropoff_lng?: number | null;
          dropoff_instructions?: string | null;
          dropoff_window_start?: string | null;
          dropoff_window_end?: string | null;
          item_description: string;
          item_photos?: string[] | null;
          estimated_weight_kg?: number | null;
          is_fragile?: boolean | null;
          budget_amount?: number | null;
          final_amount?: number | null;
          assigned_driver_id?: string | null;
          assigned_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          requester_id?: string;
          status?: 'open' | 'assigned' | 'in_transit' | 'completed' | 'cancelled' | null;
          request_type?: 'auto' | 'manual' | 'broadcast';
          target_driver_id?: string | null;
          expires_at?: string | null;
          offered_price?: number | null;
          pickup_address?: string;
          pickup_lat?: number | null;
          pickup_lng?: number | null;
          pickup_instructions?: string | null;
          pickup_window_start?: string | null;
          pickup_window_end?: string | null;
          dropoff_address?: string;
          dropoff_lat?: number | null;
          dropoff_lng?: number | null;
          dropoff_instructions?: string | null;
          dropoff_window_start?: string | null;
          dropoff_window_end?: string | null;
          item_description?: string;
          item_photos?: string[] | null;
          estimated_weight_kg?: number | null;
          is_fragile?: boolean | null;
          budget_amount?: number | null;
          final_amount?: number | null;
          assigned_driver_id?: string | null;
          assigned_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      delivery_bids: {
        Row: {
          id: string;
          delivery_request_id: string;
          driver_id: string;
          amount: number;
          eta_minutes: number | null;
          message: string | null;
          status: 'pending' | 'accepted' | 'rejected' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          delivery_request_id: string;
          driver_id: string;
          amount: number;
          eta_minutes?: number | null;
          message?: string | null;
          status?: 'pending' | 'accepted' | 'rejected' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          delivery_request_id?: string;
          driver_id?: string;
          amount?: number;
          eta_minutes?: number | null;
          message?: string | null;
          status?: 'pending' | 'accepted' | 'rejected' | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      driver_documents: {
        Row: {
          id: string;
          driver_profile_id: string;
          document_type: 'license';
          storage_key: string;
          uploaded_at: string | null;
        };
        Insert: {
          id?: string;
          driver_profile_id: string;
          document_type?: 'license';
          storage_key: string;
          uploaded_at?: string | null;
        };
        Update: {
          id?: string;
          driver_profile_id?: string;
          document_type?: 'license';
          storage_key?: string;
          uploaded_at?: string | null;
        };
      };
      delivery_negotiations: {
        Row: {
          id: string;
          delivery_request_id: string;
          proposed_by: string;
          amount: number;
          status: 'proposed' | 'accepted' | 'rejected' | 'countered';
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          delivery_request_id: string;
          proposed_by: string;
          amount: number;
          status?: 'proposed' | 'accepted' | 'rejected' | 'countered';
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          delivery_request_id?: string;
          proposed_by?: string;
          amount?: number;
          status?: 'proposed' | 'accepted' | 'rejected' | 'countered';
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      sinpe_config: {
        Row: {
          id: string;
          label: string;
          phone_number: string;
          account_holder: string;
          instructions: string | null;
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          label?: string;
          phone_number: string;
          account_holder: string;
          instructions?: string | null;
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          phone_number?: string;
          account_holder?: string;
          instructions?: string | null;
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      event_drivers: {
        Row: {
          id: string;
          driver_id: string;
          event_id: string;
          event_name: string;
          event_date: string;
          location_name: string;
          availability_start: string | null;
          availability_end: string | null;
          notes: string | null;
          status: 'pending' | 'approved' | 'rejected' | 'cancelled';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          event_id: string;
          event_name: string;
          event_date: string;
          location_name: string;
          availability_start?: string | null;
          availability_end?: string | null;
          notes?: string | null;
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          event_id?: string;
          event_name?: string;
          event_date?: string;
          location_name?: string;
          availability_start?: string | null;
          availability_end?: string | null;
          notes?: string | null;
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
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
      reviews: {
        Row: {
          id: number;
          order_id: string;
          listing_id: number;
          seller_id: string;
          buyer_id: string;
          buyer_name: string;
          driver_id: string | null;
          review_type: 'seller' | 'driver';
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          order_id: string;
          listing_id: number;
          seller_id: string;
          buyer_id: string;
          buyer_name: string;
          driver_id?: string | null;
          review_type?: 'seller' | 'driver';
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          order_id?: string;
          listing_id?: number;
          seller_id?: string;
          buyer_id?: string;
          buyer_name?: string;
          driver_id?: string | null;
          review_type?: 'seller' | 'driver';
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
      };
      reports: {
        Row: {
          id: number;
          reporter_id: string;
          target_type: 'listing' | 'user';
          target_listing_id: number | null;
          target_user_id: string | null;
          reason: string;
          details: string | null;
          status: 'open' | 'resolved' | 'dismissed';
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          reporter_id: string;
          target_type: 'listing' | 'user';
          target_listing_id?: number | null;
          target_user_id?: string | null;
          reason: string;
          details?: string | null;
          status?: 'open' | 'resolved' | 'dismissed';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          reporter_id?: string;
          target_type?: 'listing' | 'user';
          target_listing_id?: number | null;
          target_user_id?: string | null;
          reason?: string;
          details?: string | null;
          status?: 'open' | 'resolved' | 'dismissed';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          p256dh?: string;
          auth?: string;
          user_agent?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      disputes: {
        Row: {
          id: string;
          order_id: string;
          opened_by: string;
          reason: 'item_not_received' | 'item_not_as_described' | 'damaged' | 'wrong_item' | 'seller_unresponsive' | 'other';
          description: string;
          status: 'open' | 'under_review' | 'resolved_buyer' | 'resolved_seller' | 'resolved_refund' | 'closed';
          resolution_notes: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          opened_by: string;
          reason: 'item_not_received' | 'item_not_as_described' | 'damaged' | 'wrong_item' | 'seller_unresponsive' | 'other';
          description: string;
          status?: 'open' | 'under_review' | 'resolved_buyer' | 'resolved_seller' | 'resolved_refund' | 'closed';
          resolution_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          opened_by?: string;
          reason?: 'item_not_received' | 'item_not_as_described' | 'damaged' | 'wrong_item' | 'seller_unresponsive' | 'other';
          description?: string;
          status?: 'open' | 'under_review' | 'resolved_buyer' | 'resolved_seller' | 'resolved_refund' | 'closed';
          resolution_notes?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ferias: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          location_name: string;
          location_lat: number | null;
          location_lng: number | null;
          waze_link: string | null;
          schedule_text: string | null;
          schedule_days: string[];
          start_time: string | null;
          end_time: string | null;
          next_date: string | null;
          organizer_id: string | null;
          organizer_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          cover_image_url: string | null;
          photos: Json;
          is_active: boolean;
          vendor_count: number;
          follower_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          location_name: string;
          location_lat?: number | null;
          location_lng?: number | null;
          waze_link?: string | null;
          schedule_text?: string | null;
          schedule_days?: string[];
          start_time?: string | null;
          end_time?: string | null;
          next_date?: string | null;
          organizer_id?: string | null;
          organizer_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          cover_image_url?: string | null;
          photos?: Json;
          is_active?: boolean;
          vendor_count?: number;
          follower_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          location_name?: string;
          location_lat?: number | null;
          location_lng?: number | null;
          waze_link?: string | null;
          schedule_text?: string | null;
          schedule_days?: string[];
          start_time?: string | null;
          end_time?: string | null;
          next_date?: string | null;
          organizer_id?: string | null;
          organizer_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          cover_image_url?: string | null;
          photos?: Json;
          is_active?: boolean;
          vendor_count?: number;
          follower_count?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      feria_vendors: {
        Row: {
          id: string;
          feria_id: string;
          vendor_id: string;
          display_name: string | null;
          description: string | null;
          products_summary: string | null;
          status: 'pending' | 'approved' | 'rejected';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          feria_id: string;
          vendor_id: string;
          display_name?: string | null;
          description?: string | null;
          products_summary?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          feria_id?: string;
          vendor_id?: string;
          display_name?: string | null;
          description?: string | null;
          products_summary?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          created_at?: string;
          updated_at?: string;
        };
      };
      feria_followers: {
        Row: {
          id: string;
          feria_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          feria_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          feria_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      dispute_messages: {
        Row: {
          id: string;
          dispute_id: string;
          sender_id: string;
          sender_role: 'buyer' | 'seller' | 'admin';
          text: string;
          evidence_urls: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          dispute_id: string;
          sender_id: string;
          sender_role: 'buyer' | 'seller' | 'admin';
          text: string;
          evidence_urls?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          dispute_id?: string;
          sender_id?: string;
          sender_role?: 'buyer' | 'seller' | 'admin';
          text?: string;
          evidence_urls?: string[];
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

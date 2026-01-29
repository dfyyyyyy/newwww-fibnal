export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      admin_roles: {
        Row: {
          id: number;
          uid: string;
          name: string;
          permissions: string;
          created_at: string;
        }
        Insert: {
          uid: string;
          name: string
          permissions: string
          created_at?: string
        }
        Update: {
          name?: string
          permissions?: string
        }
      }
      bookings: {
        Row: {
          id: number;
          uid: string;
          customer: string;
          driver: string;
          pickup: string;
          dropoff: string | null;
          status: Database["public"]["Enums"]["booking_status"];
          amount: string;
          created_at: string;
          form_data: Json | null;
          waypoints: Json | null;
          calculated_distance: number | null;
          calculated_duration: number | null;
          booking_type: Database["public"]["Enums"]["booking_type"] | null;
          rental_hours: number | null;
        }
        Insert: {
          uid: string;
          customer: string
          driver: string
          pickup: string
          dropoff?: string | null;
          status: Database["public"]["Enums"]["booking_status"]
          amount: string
          created_at?: string
          form_data?: Json | null;
          waypoints?: Json | null;
          calculated_distance?: number | null;
          calculated_duration?: number | null;
          booking_type?: Database["public"]["Enums"]["booking_type"] | null;
          rental_hours?: number | null;
        }
        Update: {
          customer?: string
          driver?: string
          pickup?: string
          dropoff?: string | null;
          status?: Database["public"]["Enums"]["booking_status"]
          amount?: string
          form_data?: Json | null;
          waypoints?: Json | null;
          calculated_distance?: number | null;
          calculated_duration?: number | null;
          booking_type?: Database["public"]["Enums"]["booking_type"] | null;
          rental_hours?: number | null;
        }
      }
      company_settings: {
        Row: {
          id: number;
          uid: string;
          company_name: string;
          contact_email: string;
          contact_phone: string;
          address: string;
          created_at?: string;
          logo_url: string | null;
          social_links: Json | null;
          gmb_url: string | null;
        }
        Insert: {
          uid: string;
          company_name: string
          contact_email: string
          contact_phone: string
          address: string
          created_at?: string
          logo_url?: string | null;
          social_links?: Json | null;
          gmb_url?: string | null;
        }
        Update: {
          company_name?: string
          contact_email?: string
          contact_phone?: string
          address?: string
          created_at?: string;
          logo_url?: string | null;
          social_links?: Json | null;
          gmb_url?: string | null;
        }
      }
      customers: {
        Row: {
          id: number;
          uid: string;
          name: string;
          email: string;
          total_bookings: number;
          member_since: string;
          created_at: string;
        }
        Insert: {
          uid: string;
          name: string
          email: string
          total_bookings: number
          member_since: string
          created_at?: string
        }
        Update: {
          name?: string
          email?: string
          total_bookings?: number
          member_since?: string
        }
      }
      drivers: {
        Row: {
          id: number;
          uid: string;
          user_id: string | null;
          name: string;
          email: string;
          phone_number: string | null;
          vehicle: string;
          rating: number;
          status: Database["public"]["Enums"]["driver_status"];
          joined_date: string;
          created_at: string;
          date_of_birth: string | null;
          gender: string | null;
          profile_picture_url: string | null;
          last_location: Json | null;
        }
        Insert: {
          uid: string;
          user_id?: string | null;
          name: string;
          email: string;
          phone_number?: string | null;
          vehicle: string;
          rating: number;
          status: Database["public"]["Enums"]["driver_status"];
          joined_date: string;
          created_at?: string;
          date_of_birth?: string | null;
          gender?: string | null;
          profile_picture_url?: string | null;
          last_location?: Json | null;
        }
        Update: {
          user_id?: string | null;
          name?: string;
          email?: string;
          phone_number?: string | null;
          vehicle?: string;
          rating?: number;
          status?: Database["public"]["Enums"]["driver_status"];
          joined_date?: string;
          date_of_birth?: string | null;
          gender?: string | null;
          profile_picture_url?: string | null;
          last_location?: Json | null;
        }
      }
      payments: {
        Row: {
          id: number;
          uid: string;
          driver: string;
          amount: string;
          date: string;
          status: Database["public"]["Enums"]["payment_status"];
          created_at: string;
        }
        Insert: {
          uid: string;
          driver: string
          amount: string
          date: string
          status: Database["public"]["Enums"]["payment_status"]
          created_at?: string
        }
        Update: {
          driver?: string
          amount?: string
          date?: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
      }
      promos: {
        Row: {
          id: number;
          uid: string;
          code: string;
          discount: string;
          usage: string;
          status: Database["public"]["Enums"]["promo_status"];
          created_at: string;
        }
        Insert: {
          uid: string;
          code: string
          discount: string
          usage: string
          status: Database["public"]["Enums"]["promo_status"]
          created_at?: string
        }
        Update: {
          code?: string
          discount?: string
          usage?: string
          status?: Database["public"]["Enums"]["promo_status"]
        }
      }
      vehicles: {
        Row: {
          id: number
          uid: string
          type: string
          model: string
          license: string
          status: Database["public"]["Enums"]["vehicle_status"]
          created_at: string
          name: string
          image_url: string | null
          max_passengers: number
          max_luggage: number
          max_carry_on: number
          rate_per_km: number
          base_fare: number
          cost_per_min: number
          cost_per_hour: number
        }
        Insert: {
          uid: string
          type: string
          model: string
          license: string
          status: Database["public"]["Enums"]["vehicle_status"]
          created_at?: string
          name: string
          image_url?: string | null
          max_passengers: number
          max_luggage: number
          max_carry_on: number
          rate_per_km: number
          base_fare: number
          cost_per_min: number
          cost_per_hour: number
        }
        Update: {
          type?: string
          model?: string
          license?: string
          status?: Database["public"]["Enums"]["vehicle_status"]
          name?: string
          image_url?: string | null
          max_passengers?: number
          max_luggage?: number
          max_carry_on?: number
          rate_per_km?: number
          base_fare?: number
          cost_per_min?: number
          cost_per_hour?: number
        }
      }
      form_configurations: {
        Row: {
          id: number;
          uid: string;
          fields: Json | null
          customizations: Json | null
          updated_at: string
        }
        Insert: {
          uid: string;
          fields?: Json | null
          customizations?: Json | null
          updated_at?: string
        }
        Update: {
          fields?: Json | null
          customizations?: Json | null
          updated_at?: string
        }
      }
      email_templates: {
        Row: {
          id: number;
          uid: string;
          template_name: string;
          subject: string;
          body: string;
          updated_at: string;
        }
        Insert: {
          id?: number;
          uid: string;
          template_name: string;
          subject: string;
          body: string;
          updated_at?: string;
        }
        Update: {
          id?: number;
          uid?: string;
          template_name?: string;
          subject?: string;
          body?: string;
          updated_at?: string;
        }
      }
      notifications: {
        Row: {
          id: number
          created_at: string
          uid: string
          recipient_email: string
          subject: string
          body: string
          is_read: boolean
        }
        Insert: {
          id?: number
          created_at?: string
          uid: string
          recipient_email: string
          subject: string
          body: string
          is_read?: boolean
        }
        Update: {
          id?: number
          created_at?: string
          uid?: string
          recipient_email?: string
          subject?: string
          body?: string
          is_read?: boolean
        }
      }
      pricing_settings: {
        Row: {
          id: number;
          uid: string;
          base_fare: number;
          cost_per_km: number;
          cost_per_min: number;
          cost_per_hour: number;
          surge_multiplier: number;
          advanced_config: Json | null;
          updated_at: string;
        }
        Insert: {
          uid: string;
          base_fare?: number;
          cost_per_km?: number;
          cost_per_min?: number;
          cost_per_hour?: number;
          surge_multiplier?: number;
          advanced_config?: Json | null;
          updated_at?: string;
        }
        Update: {
          base_fare?: number;
          cost_per_km?: number;
          cost_per_min?: number;
          cost_per_hour?: number;
          surge_multiplier?: number;
          advanced_config?: Json | null;
          updated_at?: string;
        }
      }
      flat_rate_routes: {
        Row: {
          id: number;
          uid: string;
          route_name: string;
          start_address: string;
          end_address: string;
          fixed_price: number;
          created_at: string;
        }
        Insert: {
          uid: string;
          route_name: string;
          start_address: string;
          end_address: string;
          fixed_price: number;
          created_at?: string;
        }
        Update: {
          route_name?: string;
          start_address?: string;
          end_address?: string;
          fixed_price?: number;
        }
      }
      payment_integrations: {
        Row: {
          id: number
          uid: string
          created_at: string
          stripe_public_key: string | null
          stripe_secret_key: string | null
          paypal_client_id: string | null
          paypal_client_secret: string | null
        }
        Insert: {
          id?: number
          uid: string
          created_at?: string
          stripe_public_key?: string | null
          stripe_secret_key?: string | null
          paypal_client_id?: string | null
          paypal_client_secret?: string | null
        }
        Update: {
          id?: number
          uid?: string
          created_at?: string
          stripe_public_key?: string | null
          stripe_secret_key?: string | null
          paypal_client_id?: string | null
          paypal_client_secret?: string | null
        }
      }
      push_subscriptions: {
        Row: {
          id: number
          uid: string
          driver_id: number | null
          token: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          uid: string
          driver_id?: number | null
          token: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          uid?: string
          driver_id?: number | null
          token?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: number
          created_at: string
          uid: string
          sender_id: string
          receiver_id: string
          content: string
          is_read: boolean
        }
        Insert: {
          id?: number
          created_at?: string
          uid: string
          sender_id: string
          receiver_id: string
          content: string
          is_read?: boolean
        }
        Update: {
          is_read?: boolean
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_public_booking: {
        Args: {
          uid_param: string
          customer: string
          driver: string
          pickup: string
          dropoff: string | null
          status: string
          amount: string
          form_data_param: Json
          booking_type: string | null
          rental_hours: number | null
        }
        Returns: number
      }
      get_public_booking_config: {
        Args: {
          p_uid: string
        }
        Returns: Json
      }
    }
    Enums: {
        booking_status: 'Completed' | 'In Progress' | 'Scheduled' | 'Cancelled' | 'On Way';
        driver_status: 'Online' | 'On Trip' | 'Offline';
        vehicle_status: 'Active' | 'Maintenance';
        promo_status: 'Active' | 'Expired' | 'Deactivated';
        payment_status: 'Paid' | 'Pending';
        booking_type: 'distance' | 'hourly' | 'flat_rate' | 'on_demand' | 'charter' | 'airport_transfer' | 'event_shuttle';
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type BookingStatus = Database["public"]["Enums"]["booking_status"]
export type DriverStatus = Database["public"]["Enums"]["driver_status"]
export type VehicleStatus = Database["public"]["Enums"]["vehicle_status"]
export type PromoStatus = Database["public"]["Enums"]["promo_status"]
export type PaymentStatus = Database["public"]["Enums"]["payment_status"]
export type BookingType = Database["public"]["Enums"]["booking_type"]

export type PricingSettings = Database['public']['Tables']['pricing_settings']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Driver = Database['public']['Tables']['drivers']['Row'];
export type Vehicle = Database['public']['Tables']['vehicles']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Promo = Database['public']['Tables']['promos']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
export type AdminRole = Database['public']['Tables']['admin_roles']['Row'];
export type CompanySettings = Database['public']['Tables']['company_settings']['Row'];
export type FormConfiguration = Database['public']['Tables']['form_configurations']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type EmailTemplate = Database['public']['Tables']['email_templates']['Row'];
export type FlatRateRoute = Database['public']['Tables']['flat_rate_routes']['Row'];
export type PaymentIntegrations = Database['public']['Tables']['payment_integrations']['Row'];
export type PushSubscription = Database['public']['Tables']['push_subscriptions']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
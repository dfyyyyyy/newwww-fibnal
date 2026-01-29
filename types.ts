
import type { Session, User } from '@supabase/gotrue-js';
import type { BookingType, PricingSettings, FlatRateRoute, Vehicle, PaymentIntegrations, PushSubscription, EmailTemplate, Message } from './services/database.types';

export type { Session, User };

export type {
    Booking,
    BookingStatus,
    Driver,
    DriverStatus,
    Vehicle,
    VehicleStatus,
    Customer,
    Promo,
    PromoStatus,
    Payment,
    PaymentStatus,
    AdminRole,
    CompanySettings,
    FormConfiguration,
    Notification,
    PricingSettings,
    Json,
    BookingType,
    FlatRateRoute,
    PaymentIntegrations,
    PushSubscription,
    EmailTemplate,
    Message,
} from './services/database.types';


export enum View {
  Dashboard = 'Dashboard',
  Bookings = 'Bookings',
  Drivers = 'Drivers',
  Vehicles = 'Vehicles',
  Customers = 'Customers',
  LiveMap = 'Live Map',
  Chat = 'Chat',
  Pricing = 'Pricing',
  RouteManagement = 'Route Management',
  Promos = 'Promos',
  Notifications = 'Notifications',
  EmailTemplates = 'Email Templates',
  Reports = 'Reports',
  Payments = 'Payments',
  Permissions = 'Permissions',
  NotesAndExtra = 'Notes & Extra',
  FormTemplates = 'Form Templates',
  FormBuilder = 'Form Builder',
  Integrations = 'Integrations',
  Settings = 'Settings',
}

// Form Builder types
export enum FormFieldType {
  Text = 'text',
  Textarea = 'textarea',
  Dropdown = 'dropdown',
  DateTime = 'datetime-local',
  Number = 'number',
  Checkbox = 'checkbox',
  Radio = 'radio',
  VehicleType = 'vehicletype',
}

export interface FormField {
  id: string;
  key?: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  options?: string[];
  required: boolean;
  conditionalLogic?: {
    fieldKey: string;
    value: string;
  };
}

export interface FormStructure {
  common: FormField[];
  distance: FormField[];
  hourly: FormField[];
  flat_rate: FormField[];
  on_demand: FormField[];
  charter: FormField[];
  airport_transfer: FormField[];
  event_shuttle: FormField[];
}

export interface ExtraOption {
    name: string;
    price: number;
    enabled: boolean;
    min?: number;
    max?: number;
}

// Charting types
export interface ChartData {
  name: string;
  bookings: number;
}

// Theme types
export enum Theme {
  Light = 'light',
  Dark = 'dark',
  System = 'system'
}

export type AccentColor = 'blue' | 'green' | 'indigo' | 'rose' | 'orange' | 'slate';
export type SidebarStyle = 'light' | 'dark';

export interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  sidebarStyle: SidebarStyle;
  setSidebarStyle: (style: SidebarStyle) => void;
  isDarkMode: boolean;
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, defaultText?: string) => string;
}


export interface CustomizationOptions {
    title: string;
    logo: string | null;
    defaultLanguage: string;
    selectedLanguages: string[];
    paymentIcons: string[];
    color: string;
    enabledBookingTypes: BookingType[];
    hourlyNotes?: {
        minimum_hours: string;
        extra_hour_charges: string;
        driver_waiting_charges: string;
        toll_parking: string;
    };
    extraOptions?: ExtraOption[];
    layout_settings?: {
        container_style: string;
        container_color?: string;
        container_color_dark?: string;
        container_border_radius?: number;
        button_style: string;
        button_position: string;
        progress_bar_visibility: string;
        step_titles_visibility: string;
        secondary_button_style?: string;
        custom_css?: string;
        components_visibility?: {
            booking_type_selector?: boolean;
            language_selector?: boolean;
            vehicle_selector?: boolean;
            round_trip_button?: boolean;
            add_waypoint_button?: boolean;
            extra_options_button?: boolean;
            notes_button?: boolean;
            payment_icons?: boolean;
            map_visibility?: boolean;
            show_logo?: boolean;
        };
        waypoint_button_config?: {
            enabled_for_types: BookingType[];
            display_after_field: string;
        };
    };
    pricing?: Partial<PricingSettings>;
    routes?: FlatRateRoute[];
    vehicles?: Vehicle[];
}

// FIX: Changed interfaces to type aliases to allow assignment to the Supabase 'Json' type.
export type PeakHour = {
    id: string;
    start: string;
    end: string;
    multiplier: number;
    days: number[]; // 0 for Sunday, 6 for Saturday
};

export type TimeOfDaySlot = {
    id: string;
    name: string;
    start: string;
    end: string;
    type: 'multiplier' | 'fixed';
    value: number;
};

export type LocationZone = {
    id: string;
    name: string;
    keywords: string;
    surcharge: number;
    apply_to: 'pickup' | 'dropoff' | 'both';
};

export type AdvancedPricingConfig = {
    is_enabled: boolean;
    surge: {
        is_enabled: boolean;
        peak_hours: PeakHour[];
    };
    time_of_day: {
        is_enabled: boolean;
        slots: TimeOfDaySlot[];
    };
    location_surcharges: {
        is_enabled: boolean;
        zones: LocationZone[];
    };
    scheduled_rides: {
        is_enabled: boolean;
        surge_protection: boolean;
        premium_type: 'multiplier' | 'fixed';
        premium_value: number;
    };
    additional_fees: {
        waiting_fee_per_min: number;
        waiting_grace_period_mins: number;
        cancellation_fee: number;
        standard_cleaning_fee: number;
    };
};

export interface AISuggestion {
    recommendedDriver: string;
    reason: string;
    score: number;
}

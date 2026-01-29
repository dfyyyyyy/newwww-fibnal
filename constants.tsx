import React from 'react';
import { View, FormStructure, CustomizationOptions, FormFieldType, BookingType } from './types';

export const ICONS: { [key: string]: React.ReactNode } = {
  // Navigation Icons
  [View.Dashboard]: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  [View.Bookings]: <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
  [View.Drivers]: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  [View.Vehicles]: <path strokeLinecap="round" strokeLinejoin="round" d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />,
  [View.Customers]: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />,
  [View.LiveMap]: <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" />,
  [View.Chat]: <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />,
  [View.Pricing]: <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />,
  [View.NotesAndExtra]: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  [View.RouteManagement]: <><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" strokeLinecap="round" strokeLinejoin="round" /><circle cx="18" cy="5" r="3" /></>,
  [View.Promos]: <><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 9h.008v.008H6V9z" /></>,
  [View.Notifications]: <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
  [View.EmailTemplates]: <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  [View.Reports]: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  [View.Payments]: <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />,
  [View.Permissions]: <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
  [View.FormTemplates]: <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
  [View.FormBuilder]: <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.586a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
  [View.Integrations]: <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25v2.25A2.25 2.25 0 006 20.25z" />,
  [View.Settings]: <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />,
  // UI Icons
  Expand: <path strokeLinecap="round" strokeLinejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" />,
  Collapse: <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />,
  Globe: <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0M3.6 9h16.8M3.6 15h16.8M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18" />,
  Appearance: <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />,
  Sun: <path strokeLinecap="round" strokeLinejoin="round" d="M12 12m-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0 M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42" />,
  Moon: <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />,
  Laptop: <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  // Action Icons
  Edit: <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />,
  Add: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />,
  Delete: <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />,
  Lock: <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
  DragHandle: <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />,
  ChevronUp: <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />,
  ChevronDown: <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />,
  ShowPassword: <><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>,
  HidePassword: <><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></>,
  Info: <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  RoundTrip: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5-5-5m10-6l-5-5-5 5" />,
  Export: <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />,
};

export const BUILDER_ICONS: { [key: string]: React.ReactNode } = {
  Desktop: <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />,
  Tablet: <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75A2.25 2.25 0 0015.75 1.5h-2.25m-3.75 0h3.75M12 18.75h.008v.008H12v-.008z" />,
  Mobile: <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75A2.25 2.25 0 0015.75 1.5h-2.25m-3.75 0h3.75M12 18.75h.008v.008H12v-.008z" />,
  Fields: <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75h-7.5a2.25 2.25 0 00-2.25 2.25v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25z" />,
  Style: <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4-2.245 4.5 4.5 0 118.9-2.25 4.5 4.5 0 01-2.456 2.245c-.215.123-.44.208-.688.261zm-4.432-1.442a3 3 0 015.78-1.128 2.25 2.25 0 002.4-2.245 4.5 4.5 0 10-8.9 2.25 4.5 4.5 0 002.456-2.245c.215-.123.44-.208.688-.261z" />,
};

export const FIELD_TYPE_ICONS: Record<string, React.ReactNode> = {
  "Text Input": <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 4.5l-15 15m0 0h11.25m-11.25 0V8.25" />,
  "Textarea": <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />,
  "Number Input": <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 6.75h.75A2.25 2.25 0 0110.5 9v.006c0 .814-.42 1.538-1.07 1.954L6.75 14.25M15.75 6.75h.75a2.25 2.25 0 012.25 2.25v.006c0 .814-.42 1.538-1.07 1.954L13.75 14.25" />,
  "Date/Time Input": <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" />,
  "Dropdown": <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />,
  "Checkbox": <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
  "Vehicle Type": <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9.75h4.875a2.625 2.625 0 010 5.25H12M8.25 9.75L10.5 7.5M8.25 9.75L10.5 12m9-7.243V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />,
};


export const FIELD_ICONS: Record<string, string> = {
  full_name: `<path stroke-linecap="round" stroke-linejoin="round" d="M15 9h-1a2 2 0 1 0 0 4h1m-1-4a2 2 0 1 1 0 4m-1-4h-1a2 2 0 1 0 0 4h1m-1-4a2 2 0 1 1 0 4M9 9a2 2 0 1 0 0 4a2 2 0 0 0 0-4zm0 4h1m-1 0a2 2 0 1 1 0-4m0 4v1a2 2 0 1 1-4 0v-1m4 0a2 2 0 1 0 0-4m4-3a4 4 0 1 1-8 0 4 4 0 0 1 8 0z"></path>`,
  email: `<path stroke-linecap="round" stroke-linejoin="round" d="M16 12a4 4 0 1 0-8 0 4 4 0 0 0 8 0zm0 0v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-9 9m4.5-1.5a2.5 2.5 0 0 0 0-5V12"></path>`,
  phone_number: `<path stroke-linecap="round" stroke-linejoin="round" d="M11 14l-1 1-1-1-1 1-1-1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2l-1-1-1 1-1-1-1 1zM4 8h12"></path>`,
  pickup_location: `<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"></path>`,
  dropoff_location: `<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"></path>`,
  datetime: `<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"></path>`,
  rental_hours: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"></path>`,
  airport_name: `<path stroke-linecap="round" stroke-linejoin="round" d="M12 19V5m0 14-4-4m4 4 4-4M8 5h8M5 10h14"></path>`,
  flight_number: `<path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-2 2-2-2z"></path>`,
};

export const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
];

export const LANGUAGE_FLAG_SVGS: Record<string, string> = {
    'en': '<g clip-path="url(#a)"><path fill="#012169" d="M0 0h21v15H0z"/><path fill="#fff" d="M0 0h21v15H0z"/><path fill="none" stroke="#C8102E" stroke-width="3" d="M0 7.5h21m-10.5-7.5v15"/><path fill="none" stroke="#fff" stroke-width=".6" d="m0 0 21 15m0-15L0 15"/><path fill="none" stroke="#C8102E" stroke-width="2" d="m0 0 21 15m0-15L0 15"/></g><defs><clipPath id="a"><path fill="#fff" d="M0 0h21v15H0z"/></clipPath></defs>',
    'es': '<path fill="#C60B1E" d="M0 0h21v15H0z"/><path fill="#FFC400" d="M0 2.5h21v10H0z"/><g transform="translate(4.5 5.25) scale(.75)"><g fill="#C60B1E"><path d="M4 0v1.5h1V3h1V1.5h1V0H4z"/><path d="M4.5.75h2v.75h-2z"/></g><g fill="#AD1519"><path d="M1 4.5h6v1H1z"/><path d="M2.5 5.5h3v1h-3zM1 6.5h6v1H1zM2.5 7.5h3v1h-3zM1 8.5h6v1H1z"/></g><path fill="#C60B1E" d="M2.5 4V.75h-1V4H.75L3.5 6.5 6.25 4H5.5V.75h-1V4h-.75V.75A1.75 1.75 0 0 0 2 2 .75.75 0 1 0 2 .5a1.75 1.75 0 0 0-1.75 2 .75.75 0 1 0 1.5 0A1.75 1.75 0 0 0 3.5 4v-.75.75z"/><path fill="#7A8B99" d="M2.5 1.5h3v3h-3z"/><g fill="#FFC400"><path d="M2.5 2.25h3v.75h-3z"/><path d="M3.25 1.5h1.5v3h-1.5z"/></g></g>',
    'fr': '<path fill="#fff" d="M0 0h21v15H0z"/><path fill="#002654" d="M0 0h7v15H0z"/><path fill="#CE1126" d="M14 0h7v15h-7z"/>',
    'de': '<path d="M0 0h21v15H0z"/><path fill="#FFCE00" d="M0 5h21v5H0z"/><path fill="#D00" d="M0 10h21v5H0z"/>',
    'it': '<path fill="#fff" d="M0 0h21v15H0z"/><path fill="#009246" d="M0 0h7v15H0z"/><path fill="#CE2B37" d="M14 0h7v15h-7z"/>',
    'pt': '<path fill="#006233" d="M0 0h21v15H0z"/><path fill="#D21034" d="M6 0h15v15H6z"/><circle cx="6" cy="7.5" r="3.5" fill="#FFC400"/><g transform="translate(6 7.5) scale(.7)"><circle r="2" fill="#002654"/><path fill="#fff" d="M-.31 1.07 0 .5l.31.57.31-.57L0-.5l-.31.57zM0 1.25a.25.25 0 1 0 0-.5.25.25 0 0 0 0 .5"/><path fill="#fff" d="m-1.18.6-1.18.6.45-1.45-1.18-.6h1.45l.45-1.45.45 1.45h1.45l-1.18.6.45 1.45z"/><g fill="#D21034"><path d="M-2 0h-1v1.5h1zM-2.75 0A.75.75 0 0 0-3.5.75v0h1.5v0A.75.75 0 0 0-2.75 0M-2 1.5v.5h-1V1.5zM2 0h1v1.5H2zM2.75 0A.75.75 0 0 1 3.5.75v0h-1.5v0A.75.75 0 0 1 2.75 0M2 1.5v.5h1V1.5zM-1.25 2.25h2.5v1h-2.5z"/></g></g>',
};

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  // Add any needed translations here, e.g.
  dashboard: { en: 'Dashboard', es: 'Tablero' },
  bookings: { en: 'Bookings', es: 'Reservas' },
  // ... more translations
};

export const DEFAULT_FORM_FIELDS: FormStructure = {
  common: [
    { id: 'field_common_1', key: 'full_name', type: FormFieldType.Text, label: 'Full Name', placeholder: 'Enter your full name', required: true },
    { id: 'field_common_2', key: 'email', type: FormFieldType.Text, label: 'Email Address', placeholder: 'Enter your email address', required: true },
    { id: 'field_common_3', key: 'phone_number', type: FormFieldType.Text, label: 'Phone Number', placeholder: 'Enter your phone number', required: true },
    { id: 'field_common_4', key: 'special_instructions', type: FormFieldType.Textarea, label: 'Special Instructions', placeholder: 'Any special requests?', required: false },
  ],
  distance: [
    { id: 'field_distance_1', key: 'pickup_location', type: FormFieldType.Text, label: 'Pickup Location', placeholder: 'Enter pickup address', required: true },
    { id: 'field_distance_2', key: 'dropoff_location', type: FormFieldType.Text, label: 'Dropoff Location', placeholder: 'Enter destination address', required: true },
    { id: 'field_distance_3', key: 'datetime', type: FormFieldType.DateTime, label: 'Pickup Date & Time', required: true },
  ],
  hourly: [
    { id: 'field_hourly_1', key: 'pickup_location', type: FormFieldType.Text, label: 'Pickup Location', placeholder: 'Enter pickup address', required: true },
    { id: 'field_hourly_2', key: 'rental_hours', type: FormFieldType.Number, label: 'Rental Hours', placeholder: 'e.g., 3', required: true },
    { id: 'field_hourly_3', key: 'datetime', type: FormFieldType.DateTime, label: 'Pickup Date & Time', required: true },
  ],
  flat_rate: [
    { id: 'field_flat_rate_1', key: 'route_id', type: FormFieldType.Dropdown, label: 'Select a Route', required: true, options: [] },
    { id: 'field_flat_rate_2', key: 'datetime', type: FormFieldType.DateTime, label: 'Pickup Date & Time', required: true },
  ],
  on_demand: [
      { id: 'field_on_demand_1', key: 'pickup_location', type: FormFieldType.Text, label: 'Pickup Location', placeholder: 'Enter pickup address', required: true },
      { id: 'field_on_demand_2', key: 'dropoff_location', type: FormFieldType.Text, label: 'Dropoff Location', placeholder: 'Enter destination address', required: true },
  ],
  charter: [
    { id: 'field_charter_1', key: 'pickup_location', type: FormFieldType.Text, label: 'Pickup Location', placeholder: 'Enter pickup address', required: true },
    { id: 'field_charter_2', key: 'event_details', type: FormFieldType.Textarea, label: 'Event Details', placeholder: 'Describe the charter needs', required: true },
    { id: 'field_charter_3', key: 'datetime', type: FormFieldType.DateTime, label: 'Pickup Date & Time', required: true },
  ],
  airport_transfer: [
    { 
      id: 'field_airport_1', 
      key: 'transfer_direction', 
      type: FormFieldType.Radio, 
      label: 'Transfer Direction', 
      required: true, 
      options: ['From Airport', 'To Airport'] 
    },
    { 
      id: 'field_airport_2', 
      key: 'airport_name', 
      type: FormFieldType.Text, 
      label: 'Airport Name', 
      placeholder: 'e.g., JFK, LAX', 
      required: true 
    },
    { 
      id: 'field_airport_3', 
      key: 'pickup_location', 
      type: FormFieldType.Text, 
      label: 'Pickup Address', 
      placeholder: 'Enter pickup address', 
      required: true,
      conditionalLogic: {
        fieldKey: 'transfer_direction',
        value: 'To Airport',
      }
    },
    { 
      id: 'field_airport_4', 
      key: 'dropoff_location', 
      type: FormFieldType.Text, 
      label: 'Dropoff Address', 
      placeholder: 'Enter destination address', 
      required: true,
      conditionalLogic: {
        fieldKey: 'transfer_direction',
        value: 'From Airport',
      }
    },
    { 
      id: 'field_airport_5', 
      key: 'flight_number', 
      type: FormFieldType.Text, 
      label: 'Flight Number', 
      placeholder: 'Optional', 
      required: false 
    },
    { 
      id: 'field_airport_6', 
      key: 'datetime', 
      type: FormFieldType.DateTime, 
      label: 'Pickup/Arrival Date & Time', 
      required: true 
    },
  ],
  event_shuttle: [
    { id: 'field_event_1', key: 'event_name', type: FormFieldType.Text, label: 'Event Name', placeholder: 'e.g., Music Festival', required: true },
    { id: 'field_event_2', key: 'pickup_location', type: FormFieldType.Text, label: 'Pickup Location', placeholder: 'Enter pickup address', required: true },
    { id: 'field_event_3', key: 'datetime', type: FormFieldType.DateTime, label: 'Pickup Date & Time', required: true },
  ],
};

export const DEFAULT_CUSTOMIZATIONS: CustomizationOptions = {
    title: "Book Your Ride",
    logo: null,
    defaultLanguage: "en",
    selectedLanguages: ["en", "es", "fr"],
    paymentIcons: ["visa", "mastercard", "paypal", "cash"],
    color: "#f43f5e",
    enabledBookingTypes: ['distance', 'hourly', 'flat_rate', 'on_demand'],
    hourlyNotes: {
        minimum_hours: "2 hours",
        extra_hour_charges: "$50/hr",
        driver_waiting_charges: "$1/min after 15 mins grace period",
        toll_parking: "Not included"
    },
    extraOptions: [
        { name: 'Child Seat', price: 15.00, enabled: true, min: 0, max: 2 },
        { name: 'Bottled Water', price: 2.00, enabled: true, min: 0, max: 5 },
    ],
    layout_settings: {
        container_style: 'card_with_shadow',
        container_color: 'rgba(255,255,255,1)',
        container_color_dark: 'rgba(30,41,59,1)',
        container_border_radius: 8,
        button_style: 'filled_rounded',
        button_position: 'right',
        progress_bar_visibility: 'visible',
        step_titles_visibility: 'visible',
        secondary_button_style: 'filled',
        components_visibility: {
            booking_type_selector: true,
            language_selector: true,
            vehicle_selector: true,
            round_trip_button: true,
            add_waypoint_button: true,
            extra_options_button: true,
            notes_button: true,
            payment_icons: true,
            map_visibility: true,
            show_logo: true,
        },
        waypoint_button_config: {
            enabled_for_types: ['distance' as BookingType],
            display_after_field: 'dropoff_location'
        }
    }
};

export const PAYMENT_ICONS = [
    { name: 'visa', label: 'Visa', icon: '<path d="M1 4h22v16H1z" fill="#142688"/><path d="M4.3 12.8h2l1 4h2.2l-1.3-6.1c-.1-.6-.2-1.1-.3-1.6h.1c.4 1 1.2 2.1 2.4 3.4l.6-1c-1.3-1.3-2-2.3-2.4-3.1-.3-.6-.5-1.1-.5-1.5 0-.6.4-1 1.2-1h1.7l1.3 6.9c.1.6.2 1 .3 1.4h-.1c-.4-1-1.2-2.1-2.4-3.4l-.6 1c1.3 1.3 2 2.3 2.4 3.1.3.6.5 1.1.5 1.5 0 .6-.4 1-1.2 1h-1.7l-2-7.5-1.1 5.3h-1.8l1-4h-2.1z" fill="#F7A600"/>' },
    { name: 'mastercard', label: 'Mastercard', icon: '<circle cx="8" cy="12" r="7" fill="#EA001B"/><circle cx="16" cy="12" r="7" fill="#F79F1A"/><path d="M12 12a7 7 0 01-2.12-5.1A7 7 0 0012 19a7 7 0 002.12-5.1A7 7 0 0112 12z" fill="#FF5F00"/>' },
    { name: 'amex', label: 'American Express', icon: '<rect width="22" height="16" x="1" y="4" fill="#0077C8" rx="2"/><rect width="16" height="6" x="4" y="9" fill="#F7F7F7"/><text x="12" y="14" fill="#fff" font-family="monospace" font-size="2.5" text-anchor="middle">AMERICAN EXPRESS</text>' },
    { name: 'paypal', label: 'PayPal', icon: '<path d="M3.2.4C2.9.2 2.5 0 2 0H.5L0 3.2v.3c0 .8.5 1.3 1.3 1.3H2c1.2 0 1.9-.8 2.2-2L4.6.4H3.2z" fill="#253B80"/><path d="M6.3 0c-.3 0-.6.1-.8.4L3.9 6.2c-.1.3-.4.5-.7.5h-.4L3 5.4c0-.8-.5-1.3-1.3-1.3H1c-1.2 0-1.9.8-2.2 2l-.4 2.5v.2C-2.1 10 .2 12 4.4 12h.2c2.5 0 4.2-1.3 4.8-3.7l.8-4c.1-.4 0-.7-.3-.9L8.7 0H6.3z" fill="#179BD7" transform="translate(4.6)"/>' },
    { name: 'stripe', label: 'Stripe', icon: '<path d="M19 12a7 7 0 11-14 0 7 7 0 0114 0z" fill="#6772E5"/><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z" fill="#fff" opacity=".3"/><path d="M12 5.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z" fill="#fff"/>' },
    { name: 'applepay', label: 'Apple Pay', icon: '<path d="M16.5 12.3c0 2.2-1.5 3.3-3.6 3.3-1.6 0-2.6-.8-3.7-.8-1.1 0-2.3.8-3.6.8-2.2 0-3.9-1.3-3.9-3.7 0-2.5 1.8-3.9 4-3.9 1.5 0 2.4.8 3.5.8 1 0 2.2-.9 3.7-.9 2.1 0 3.1 1.4 3.1 3.4zM13.2 6c.1-1.2.9-2.2 1.9-2.2.3 0 .9 1.4.8 2.3-.1 1.2-1 2.2-2 2.2-.1 0-1-.8-1-2.3z"/>' },
    { name: 'googlepay', label: 'Google Pay', icon: '<path d="M11.6 12.2c-.3 0-.6-.3-.6-.6V9.4c0-.4.3-.6.6-.6h.8c.4 0 .6.3.6.6v2.2c0 .4-.2.6-.6.6h-.8zm2 0c-.4 0-.6-.3-.6-.6V9.4c0-.4.2-.6.6-.6h.8c.4 0 .6.3.6.6v2.2c0 .4-.2.6-.6.6h-.8zm2.1 0c-.4 0-.6-.3-.6-.6V9.4c0-.4.2-.6.6-.6h.8c.4 0 .6.3.6.6v2.2c0 .4-.2.6-.6.6h-.8zM8.8 12h-1c-.4 0-.7-.3-.7-.7V9.5c0-.4.3-.7.7-.7h1c.4 0 .7.3.7.7v1.8c0 .4-.3.7-.7.7z"/><path d="M12.5 7.9h-1c-.4 0-.6-.2-.6-.5V6.2c0-.3.2-.5.6-.5h1c.4 0 .6.2.6.5v1.2c0 .3-.2.5-.6.5z"/><path d="M24 6.2v11.6c0 3.4-2.8 6.2-6.2 6.2H6.2A6.2 6.2 0 010 17.8V6.2A6.2 6.2 0 016.2 0h11.6A6.2 6.2 0 0124 6.2z" fill="#5F6368"/>' },
    { name: 'cash', label: 'Cash', icon: '<path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>' },
];
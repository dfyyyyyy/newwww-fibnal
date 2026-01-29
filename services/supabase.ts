import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export const supabaseUrl = 'https://usakivpjjvvzwobbwcbz.supabase.co';
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzYWtpdnBqanZ2endvYmJ3Y2J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTAwNzMsImV4cCI6MjA2ODE2NjA3M30.HINUSbqgDg69Hma-6JH2AY34XdqkUDqxJj48vRCPO3I';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
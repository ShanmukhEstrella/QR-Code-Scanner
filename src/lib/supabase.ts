import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Attendee = {
  id: string;
  name: string;
  entry_gate: string;
  seating_position: string;
  qr_code: string;
  created_by: string;
  created_at: string;
};

export type Scan = {
  id: string;
  attendee_id: string;
  scanned_at: string;
  scanned_by: string;
  created_at: string;
};

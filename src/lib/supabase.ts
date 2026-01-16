import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Gunakan nama unik seperti supabaseAdmin agar tidak bentrok
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
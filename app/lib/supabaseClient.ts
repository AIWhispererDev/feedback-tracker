import { createClient } from '@supabase/supabase-js'

// Supabase Admin client for server-side operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  { auth: { persistSession: false } }
)
export default supabaseAdmin

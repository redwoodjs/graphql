import { createClient } from '@supabase/supabase-js'

import { createAuth } from '@redwoodjs/auth-supabase-web'

const supabaseClient = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
)

export const { AuthProvider, useAuth } = createAuth(supabaseClient)

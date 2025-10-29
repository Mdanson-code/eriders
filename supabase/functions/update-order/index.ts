// Supabase Edge Function: Secure Order Update (bypasses client RLS via service role)
// Deploy: supabase functions deploy update-order

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
    }

    const payload = await req.json()
    const { order_id, update } = payload as { order_id?: string; update?: Record<string, unknown> }

    if (!order_id || !update || typeof update !== 'object') {
      return new Response(
        JSON.stringify({ error: 'order_id and update object are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    const { data, error } = await supabase
      .from('orders')
      .update(update)
      .eq('id', order_id)
      .select('*')
      .single()

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ success: true, order: data }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})



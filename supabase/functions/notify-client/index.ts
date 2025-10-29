// Supabase Edge Function: Notify Client (Delivery Confirmation)
// Deploy: supabase functions deploy notify-client

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') || 'https://erdelivery.app'

// Reuse WhatsApp functions from notify-admin
async function sendWhatsAppMessage(to: string, message: string, method: 'meta' | 'twilio' = 'meta') {
  if (method === 'meta') {
    return await sendViaMeta(to, message)
  } else {
    return await sendViaTwilio(to, message)
  }
}

async function sendViaMeta(to: string, message: string) {
  const META_TOKEN = Deno.env.get('META_WHATSAPP_TOKEN')
  const META_PHONE_ID = Deno.env.get('META_PHONE_NUMBER_ID')
  
  if (!META_TOKEN || !META_PHONE_ID) {
    return { success: false, fallback: true }
  }

  const url = `https://graph.facebook.com/v18.0/${META_PHONE_ID}/messages`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${META_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace('+', ''),
        type: 'text',
        text: { body: message }
      })
    })

    const data = await response.json()
    return response.ok ? { success: true, messageId: data.messages[0].id } : { success: false, error: data }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

async function sendViaTwilio(to: string, message: string) {
  const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
  const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
  const TWILIO_WA_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+14155238886'
  
  if (!TWILIO_SID || !TWILIO_TOKEN) {
    return { success: false, fallback: true }
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`
  const auth = btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: TWILIO_WA_NUMBER,
        To: `whatsapp:${to}`,
        Body: message
      })
    })

    const data = await response.json()
    return response.ok ? { success: true, messageId: data.sid } : { success: false, error: data }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

serve(async (req: Request) => {
  try {
    const { order_id, message_type = 'delivered' } = await req.json()
    
    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Fetch order
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (error || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    let message = ''

    // Different message templates based on type
    switch (message_type) {
      case 'tracking':
        message = `🚴 eRdelivery Tracking

Hi ${order.client_name},
Your order ${order.order_id} is on the way.
Track live: ${order.tracking_link || SITE_URL + '/track.html?order=' + order.order_id}

Reply here if you have any questions.`
        break

      case 'delivered':
        message = `✅ Delivered

Hi ${order.client_name},
Your order ${order.order_id} has been delivered.
Thanks for shopping with eRdelivery. Enjoy! 🎉`
        break

      case 'assigned':
        message = `👍 *Order Confirmed*

Hi ${order.client_name}!

Your order *${order.order_id}* has been confirmed and assigned to a rider.

We'll send you the tracking link shortly.

eRdelivery 🚴`
        break

      default:
        message = `eRiders update for order ${order.order_id}`
    }

    // Send WhatsApp
    const result = await sendWhatsAppMessage(order.client_whatsapp, message, 'meta')
    
    if (!result.success && !result.fallback) {
      const twilioResult = await sendWhatsAppMessage(order.client_whatsapp, message, 'twilio')
      if (twilioResult.success) {
        return new Response(
          JSON.stringify({ success: true, method: 'twilio' }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true, method: 'meta' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Fallback
    const waLink = `https://wa.me/${order.client_whatsapp.replace('+', '')}?text=${encodeURIComponent(message)}`
    
    return new Response(
      JSON.stringify({
        success: false,
        fallback: true,
        wa_link: waLink,
        manual_message: message
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

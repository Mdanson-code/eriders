// Supabase Edge Function: Notify Admin of New Order
// Deploy: supabase functions deploy notify-admin

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_WA_NUMBER = Deno.env.get('ADMIN_WA_NUMBER') || '+254793476587'
const SITE_URL = Deno.env.get('SITE_URL') || 'https://erdelivery.app'

// WhatsApp sending function - supports both Twilio and Meta Cloud API
async function sendWhatsAppMessage(to: string, message: string, method: 'meta' | 'twilio' = 'meta') {
  if (method === 'meta') {
    return await sendViaMeta(to, message)
  } else {
    return await sendViaTwilio(to, message)
  }
}

// Meta Cloud API implementation
async function sendViaMeta(to: string, message: string) {
  const META_TOKEN = Deno.env.get('META_WHATSAPP_TOKEN')
  const META_PHONE_ID = Deno.env.get('META_PHONE_NUMBER_ID')
  
  if (!META_TOKEN || !META_PHONE_ID) {
    console.log('Meta API not configured, using fallback')
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
    
    if (response.ok) {
      return { success: true, messageId: data.messages[0].id }
    } else {
      console.error('Meta API error:', data)
      return { success: false, error: data }
    }
  } catch (error) {
    console.error('Meta API exception:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Twilio implementation
async function sendViaTwilio(to: string, message: string) {
  const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
  const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
  const TWILIO_WA_NUMBER = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+14155238886'
  
  if (!TWILIO_SID || !TWILIO_TOKEN) {
    console.log('Twilio not configured, using fallback')
    return { success: false, fallback: true }
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`
  // Deno doesn't have btoa, use base64 encoding
  const credentials = `${TWILIO_SID}:${TWILIO_TOKEN}`
  const auth = btoa(credentials)
  
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
    
    if (response.ok) {
      return { success: true, messageId: data.sid }
    } else {
      console.error('Twilio error:', data)
      return { success: false, error: data }
    }
  } catch (error) {
    console.error('Twilio exception:', error)
    return { success: false, error: (error as Error).message }
  }
}

serve(async (req: Request) => {
  try {
    const { order_id } = await req.json()
    
    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Fetch order details
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

    // Compose admin notification message
    const message = `🚴 *eRdelivery New Order*

*Order:* ${order.order_id}
*Client:* ${order.client_name}
*Contact:* ${order.client_whatsapp}

*Shop:* ${order.preferred_shop || 'Not specified'}
*Items:* ${order.order_desc}

*Delivery:* ${order.delivery_location_text}

💰 *ACTION REQUIRED:* Calculate price & reply to client with quote

📋 Manage: ${SITE_URL}/admin.html?order=${order.order_id}

⏰ Received: ${new Date(order.created_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}`

    // Try to send via WhatsApp API (Meta preferred, fallback to Twilio)
    const result = await sendWhatsAppMessage(ADMIN_WA_NUMBER, message, 'meta')
    
    if (!result.success && !result.fallback) {
      // Try Twilio as fallback
      const twilioResult = await sendWhatsAppMessage(ADMIN_WA_NUMBER, message, 'twilio')
      if (twilioResult.success) {
        return new Response(
          JSON.stringify({ success: true, method: 'twilio', messageId: twilioResult.messageId }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    if (result.success) {
      return new Response(
        JSON.stringify({ success: true, method: 'meta', messageId: result.messageId }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    // If both APIs fail, return fallback URL
    const waLink = `https://wa.me/${ADMIN_WA_NUMBER.replace('+', '')}?text=${encodeURIComponent(message)}`
    
    return new Response(
      JSON.stringify({
        success: false,
        fallback: true,
        message: 'WhatsApp API unavailable',
        wa_link: waLink,
        manual_message: message
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

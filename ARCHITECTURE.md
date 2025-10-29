# eRiders System Architecture

## 🏗️ Complete Data Flow

### 1. Order Creation Flow

```
CLIENT                    FRONTEND              SUPABASE DB           EDGE FUNCTION         WHATSAPP
  |                          |                       |                      |                    |
  |-- Fill order form ------>|                       |                      |                    |
  |                          |                       |                      |                    |
  |                          |-- INSERT order ------>|                      |                    |
  |                          |                       |                      |                    |
  |                          |<-- order created -----|                      |                    |
  |                          |   (with order.id)     |                      |                    |
  |                          |                       |                      |                    |
  |                          |-- Call notify-admin ------------------------>|                    |
  |                          |   (with order.id)     |                      |                    |
  |                          |                       |                      |-- Fetch order ---->|
  |                          |                       |                      |<-- order data -----|
  |                          |                       |                      |                    |
  |                          |                       |                      |-- Send WhatsApp -------------->|
  |                          |                       |                      |                    |           |
  |                          |<-- success response -------------------------|                    |           |
  |                          |                       |                      |                    |<-- sent --|
  |                          |                       |                      |                    |
  |<-- Show confirmation ----|                       |                      |                    |
  |    (opens wa.me link)    |                       |                      |                    |
```

### 2. Rider Updates Status Flow

```
RIDER                    FRONTEND              SUPABASE DB           EDGE FUNCTION         CLIENT
  |                          |                       |                      |                    |
  |-- Update status -------->|                       |                      |                    |
  |   (to "on_route")        |                       |                      |                    |
  |                          |                       |                      |                    |
  |                          |-- UPDATE order ------>|                      |                    |
  |                          |   status='on_route'   |                      |                    |
  |                          |                       |-- TRIGGER ---------->|                    |
  |                          |                       |   log_status_change  |                    |
  |                          |                       |                      |                    |
  |                          |<-- updated ------------|                      |                    |
  |                          |                       |                      |                    |
  |                          |-- Call notify-client ----------------------->|                    |
  |                          |   (order_id, 'tracking')                     |                    |
  |                          |                       |                      |-- Send WhatsApp ---------->|
  |                          |                       |                      |                    |        |
  |                          |                       |                      |<-- sent -------------------|
```

## 📂 **File Responsibilities**

### Frontend (public/)
- **index.html** - Landing page, marketing
- **order.html** - Form to create orders, calls Supabase + Edge Function
- **track.html** - Real-time order tracking, reads from Supabase
- **rider.html** - Rider updates status, generates tracking links
- **admin.html** - Admin manages all orders
- **js/config.js** - Supabase client initialization

### Backend (supabase/)
- **migrations/001_initial_schema.sql** - Database structure
  - Creates tables
  - Creates functions (generate_order_id, log_event)
  - Creates triggers (auto-logging)
  - NO HTTP calls (SQL can't make HTTP requests easily)

- **functions/notify-admin/index.ts** - Edge Function
  - Called BY: Frontend (order.html) after order creation
  - Does: Fetches order, sends WhatsApp to admin
  - Returns: Success or fallback wa.me link

- **functions/notify-client/index.ts** - Edge Function
  - Called BY: Frontend (rider.html, admin.html) after status update
  - Does: Fetches order, sends WhatsApp to client
  - Returns: Success or fallback wa.me link

## 🔄 **Integration Points**

### Point 1: Order Creation (order.html)
```javascript
// 1. Insert order into database
const { data: order } = await supabase
  .from('orders')
  .insert({ ...orderData })
  .select()
  .single()

// 2. Call Edge Function to notify admin
const response = await fetch(`${SUPABASE_URL}/functions/v1/notify-admin`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ order_id: order.id })
})

// 3. Handle response (success or fallback)
const result = await response.json()
if (result.fallback) {
  // Open wa.me link as fallback
  window.open(result.wa_link)
}
```

### Point 2: Status Update (rider.html, admin.html)
```javascript
// 1. Update order status
await supabase
  .from('orders')
  .update({ status: 'on_route' })
  .eq('id', orderId)

// 2. Call Edge Function to notify client
await fetch(`${SUPABASE_URL}/functions/v1/notify-client`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ 
    order_id: orderId,
    message_type: 'tracking' // or 'delivered', 'assigned'
  })
})
```

## 🚨 **Why This Architecture?**

### Why not database triggers calling HTTP?
- PostgreSQL can't easily make HTTP calls
- Would need pg_net extension + complex setup
- Frontend calling is simpler and more reliable

### Why Edge Functions at all?
- Keep WhatsApp API keys SECRET (not in frontend)
- Centralized notification logic
- Can be called from anywhere (frontend, webhooks, cron)

### Why fallback wa.me links?
- Works without any WhatsApp API setup
- User can manually send pre-formatted message
- Good for development/testing

## 📊 **Data Storage**

### What goes in database:
- Orders, riders, admin, events
- Order status, timestamps
- GPS coordinates
- Tracking links

### What doesn't:
- WhatsApp API keys (in environment variables)
- Message sending logic (in Edge Functions)
- Real-time GPS streaming (too expensive, snapshot only)

## 🔐 **Security Model**

### Public access (anon key):
- CREATE orders
- READ orders (for tracking)
- READ active riders
- INSERT events (logging)
- CALL Edge Functions

### Service key (backend only):
- UPDATE orders
- Manage users
- Access sensitive data

### Row Level Security:
- Clients can only see their orders
- Admins can see everything
- Riders can see assigned orders

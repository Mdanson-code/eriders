# 🗄️ Supabase Database Setup Guide

Your Supabase credentials:
- **Project URL:** https://ynthnahpnnusbtecivnt.supabase.co
- **Anon Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

---

## 📋 **Step-by-Step Setup**

### Step 1: Access Supabase Dashboard

1. Open: https://supabase.com/dashboard
2. Select your project: `ynthnahpnnusbtecivnt`
3. You should see the dashboard

### Step 2: Run Database Migration

1. In dashboard, click **"SQL Editor"** in left sidebar
2. Click **"New Query"**
3. Copy the ENTIRE content from: `eriders/supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **"Run"** (or press Ctrl+Enter)

**Expected Output:**
```
Success. No rows returned
```

This creates:
- ✅ Tables: `orders`, `riders`, `admin`, `events`
- ✅ Functions: `generate_order_id()`, `log_event()`
- ✅ Triggers: Auto-logging, auto-timestamps
- ✅ RLS Policies: Security rules

### Step 3: Verify Tables Created

1. In dashboard, click **"Table Editor"** in left sidebar
2. You should see these tables:
   - `orders`
   - `riders`
   - `admin`
   - `events`

### Step 4: Add Sample Data (Optional)

1. Go back to **SQL Editor**
2. Click **"New Query"**
3. Copy content from: `eriders/scripts/seed-data.sql`
4. Paste and **Run**

This adds:
- 1 Admin user
- 3 Sample riders
- 1 Test order

### Step 5: Test Connection

Run this command in your terminal:

```bash
cd eriders
npm install @supabase/supabase-js
node scripts/test-db-connection.js
```

**Expected output:**
```
✅ Supabase client initialized
✅ Table "orders" exists
✅ Table "riders" exists
✅ Table "admin" exists
✅ Table "events" exists
✅ Function works! Generated ID: ER-2025-001
```

---

## 🔧 **Common Issues & Fixes**

### ❌ Error: "relation does not exist"
**Fix:** You haven't run the migration yet. Go to Step 2.

### ❌ Error: "permission denied"
**Fix:** Check RLS policies. The migration should have created them automatically.

### ❌ Error: "Invalid API key"
**Fix:** Double-check your anon key is copied correctly.

### ❌ Tables created but no data
**Fix:** Run the seed data script (Step 4).

---

## 📊 **What Each Table Does**

### `orders`
Stores all delivery orders with:
- Order ID (ER-2025-XXX)
- Client info
- Pickup & delivery locations
- Rider assignment
- Status tracking
- GPS coordinates

### `riders`
Stores rider information:
- Name, phone, WhatsApp
- Active status
- Last known location
- Performance stats

### `admin`
Stores admin users:
- Name, contact info
- Auth tokens

### `events`
Event log for ML training:
- Every order action
- Timestamps
- Actor (who did it)
- Event details (JSON)

---

## ✅ **Verification Checklist**

After setup, verify:

- [ ] All 4 tables exist in Table Editor
- [ ] `generate_order_id()` function works
- [ ] Can insert a test order
- [ ] Can query orders table
- [ ] RLS policies allow public reads
- [ ] Sample data visible (if you ran seed)

---

## 🚀 **Next Steps After Database Setup**

1. ✅ Database is ready
2. 📝 Update frontend HTML files to use these credentials
3. 🧪 Test order submission
4. 📱 Set up WhatsApp integration
5. 🌐 Deploy to production

---

## 📞 **Need Help?**

Run the test script to diagnose issues:
```bash
node scripts/test-db-connection.js
```

It will tell you exactly what's missing!

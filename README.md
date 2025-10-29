# 🚴 eRiders MVP - Complete Documentation

**A polished, single-brand delivery platform with manual dispatch and automated WhatsApp notifications.**

---

## 🎯 **Product Overview**

eRiders is a modern delivery platform where:
- **Clients** order via web or WhatsApp QR code
- **Admin** receives notifications, assigns riders manually
- **Riders** generate branded tracking links with live GPS
- **Clients** track deliveries in real-time
- All actions are logged in Supabase for future ML automation

---

## 📋 **Table of Contents**

1. [Tech Stack](#-tech-stack)
2. [Project Structure](#-project-structure)
3. [Quick Start](#-quick-start)
4. [Environment Setup](#-environment-setup)
5. [Database Setup](#-database-setup)
6. [WhatsApp Integration](#-whatsapp-integration)
7. [Deployment](#-deployment)
8. [Testing](#-testing)
9. [User Flows](#-user-flows)
10. [Future Automation](#-future-automation)

---

## 🛠️ **Tech Stack**

### Frontend
- **HTML5 + Tailwind CSS** - Mobile-first responsive design
- **Vanilla JavaScript (ES6 modules)** - Lightweight and fast
- **AOS Library** - Scroll animations
- **Google Fonts (Poppins)** - Modern typography

### Backend
- **Supabase** - Postgres database + Realtime + Auth + Edge Functions
- **Supabase Edge Functions (Deno)** - Serverless WhatsApp notifications

### Maps & Location
- **Google Maps Embed API** - Route visualization
- **Google Maps Directions API** - Live navigation
- **Geolocation API** - Rider GPS tracking

### WhatsApp Integration
- **Meta Cloud API** (Primary) - WhatsApp Business Platform
- **Twilio** (Fallback) - WhatsApp sandbox for development
- **wa.me links** - Manual fallback when APIs unavailable

### Hosting
- **Netlify** or **Vercel** - Static site hosting with CDN
- **Supabase** - Managed backend (free tier available)

---

## 📁 **Project Structure**

```
eriders/
├── public/                    # Frontend files
│   ├── index.html            # Landing page
│   ├── order.html            # Order form (TO BE CREATED)
│   ├── track.html            # Order tracking (TO BE CREATED)
│   ├── rider.html            # Rider panel (TO BE CREATED)
│   ├── admin.html            # Admin dashboard (TO BE CREATED)
│   ├── assets/
│   │   ├── logo.svg          # eRiders logo
│   │   └── qr-code.svg       # WhatsApp QR code
│   └── css/
│       └── styles.css        # Custom animations & styles
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql    # Database schema
│   └── functions/
│       ├── notify-admin/             # New order notifications
│       ├── notify-client/            # Delivery confirmations
│       └── whatsapp-meta/            # WhatsApp API integration
│
├── scripts/
│   ├── seed-data.sql                 # Sample data
│   ├── generate-order-id.js          # Order ID generator (TO BE CREATED)
│   └── short-url.js                  # URL shortener (TO BE CREATED)
│
├── tests/                            # Test files (TO BE CREATED)
│   ├── unit/
│   └── e2e/
│
├── .env.example                      # Environment variables template
├── package.json                      # Dependencies
└── README.md                         # This file
```

---

## 🚀 **Quick Start**

### Prerequisites
- Node.js 20+ installed
- Supabase account (free tier works)
- Google Maps API key
- WhatsApp Business API or Twilio account (optional for testing)

### 1. Clone & Install

```bash
cd eriders
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your credentials (see Environment Setup section)
```

### 3. Database Setup

```bash
# In Supabase Dashboard > SQL Editor, run:
supabase/migrations/001_initial_schema.sql

# Then run seed data:
scripts/seed-data.sql
```

### 4. Run Locally

```bash
npm run dev
# Opens http://localhost:8080
```

---

## 🔧 **Environment Setup**

Copy `.env.example` to `.env` and fill in these values:

### **Required**

```env
# Supabase (Get from: supabase.com > Project Settings > API)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...

# Google Maps (Get from: console.cloud.google.com)
GOOGLE_MAPS_KEY=AIzaSyXXX...

# Admin Contact
ADMIN_WA_NUMBER=+254712345678
SITE_URL=https://eriders.app
```

### **WhatsApp - Option 1: Meta Cloud API** (Recommended for Production)

```env
META_WHATSAPP_TOKEN=EAAxxxx...
META_PHONE_NUMBER_ID=123456789
```

**Setup Guide:**
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create App > WhatsApp > Get Started
3. Add phone number and verify
4. Get permanent access token
5. Copy Phone Number ID

### **WhatsApp - Option 2: Twilio** (Good for Development)

```env
TWILIO_ACCOUNT_SID=ACxxxx...
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Setup Guide:**
1. Sign up at [Twilio](https://www.twilio.com/)
2. Go to WhatsApp Sandbox
3. Send "join [code]" to sandbox number
4. Copy credentials

### **Service Key** (For Edge Functions)

```env
SUPABASE_SERVICE_KEY=eyJxxx...
# ⚠️ NEVER expose this in client-side code!
```

---

## 💾 **Database Setup**

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and region
4. Note down your project URL and keys

### Step 2: Run Migration

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Copy content from `supabase/migrations/001_initial_schema.sql`
4. Paste and click **Run**

This creates:
- ✅ `orders` table - All delivery orders
- ✅ `riders` table - Active delivery riders
- ✅ `admin` table - Admin users
- ✅ `events` table - Event log for ML training
- ✅ Order ID generator function (ER-2025-XXX)
- ✅ Triggers for auto-logging

### Step 3: Seed Sample Data

```sql
-- Run in SQL Editor:
-- Copy from scripts/seed-data.sql
```

Creates:
- 1 Admin user
- 3 Sample riders
- 1 Test order

### Step 4: Deploy Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy notify-admin
supabase functions deploy notify-client
```

---

## 📱 **WhatsApp Integration**

### How It Works

1. **New Order** → Edge function triggers → Admin gets WhatsApp
2. **Rider Assigned** → Optional notification to rider
3. **On Route** → Client gets tracking link via WhatsApp
4. **Delivered** → Auto thank-you message to client

### Message Templates

#### New Order (to Admin)
```
🚴 *eRiders New Order*

*Order:* ER-2025-001
*Client:* John Doe
*Contact:* +254712345678

*Shop:* Naivas Westlands
*Items:* 2kg rice, milk

*Delivery:* Kilimani, Yaya Centre

📋 Manage: https://eriders.app/admin.html?order=ER-2025-001
```

#### Tracking Link (to Client)
```
🚴 *eRiders Tracking*

Hi John! 👋

Your order *ER-2025-001* is on the way!

*Rider:* Mike Kamau
*Contact:* +254723456789

📍 Track live: https://eriders.app/track?order=ER-2025-001
```

#### Delivery Confirmation (to Client)
```
✅ *Delivery Complete*

Hi John!

Your order *ER-2025-001* has been delivered.

Thanks for ordering with eRiders — Enjoy! 🎉
```

### Testing Without API Keys

The system works **without WhatsApp API**:
- Edge functions return `wa.me` fallback links
- Admin can copy/paste messages manually
- All messages logged to console during development

---

## 🌐 **Deployment**

### Deploy to Netlify

#### Option 1: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=public
```

#### Option 2: Git Integration

1. Push code to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" > "Import from Git"
4. Select repository
5. Build settings:
   - Build command: (leave empty)
   - Publish directory: `public`
6. Add environment variables in Netlify dashboard

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Custom Domain

1. In Netlify/Vercel dashboard
2. Go to Domain settings
3. Add custom domain (e.g., eriders.app)
4. Update DNS records

### Environment Variables

Add these in hosting platform dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `GOOGLE_MAPS_KEY`
- etc.

---

## 🧪 **Testing**

### Manual Testing Checklist

- [ ] Landing page loads and animations work
- [ ] WhatsApp buttons open correct links
- [ ] Order form validates inputs
- [ ] Order creates entry in Supabase
- [ ] Admin receives order notification
- [ ] Rider can generate tracking link
- [ ] Tracking page shows order details
- [ ] Status updates in real-time
- [ ] Delivery confirmation sent

### Unit Tests (TO BE CREATED)

```bash
npm test
```

### E2E Tests (TO BE CREATED)

```bash
npm run test:e2e
```

### Load Testing (TO BE CREATED)

```bash
npm run load:test
```

---

## 👥 **User Flows**

### Client Flow

1. Visit landing page
2. Click "Order Now" or scan QR
3. Fill order form
4. Submit → WhatsApp confirmation opens
5. Receive tracking link via WhatsApp
6. Track order live
7. Receive delivery confirmation
8. Rate delivery (optional)

### Rider Flow

1. Admin assigns order
2. Open rider panel with order ID
3. Click "Generate eR Link"
4. System gets GPS location
5. Creates tracking URL
6. Opens WhatsApp to send to admin
7. Rider shares link with client
8. Update status as delivery progresses

### Admin Flow

1. Receive WhatsApp notification of new order
2. Open admin panel
3. View order details
4. Assign to available rider
5. Monitor delivery status
6. Mark as delivered when confirmed

---

## 🔮 **Future Automation Ideas**

### Phase 1: Auto-Assignment (Effort: 2 weeks)
- Implement algorithm to auto-assign nearest available rider
- Consider factors: distance, rider load, ratings
- Requires: Rider GPS tracking always-on

### Phase 2: AI Intent Parsing (Effort: 3 weeks)
- Parse WhatsApp messages to extract order details
- Use NLP to understand items, location, urgency
- Requires: Training data from `events` table

### Phase 3: Predictive Analytics (Effort: 4 weeks)
- Predict delivery times based on historical data
- Optimize routing for multiple orders
- Demand forecasting for rider scheduling
- Requires: Minimum 3 months of historical data

### Phase 4: Full Automation (Effort: 8 weeks)
- Zero-touch order processing
- Dynamic pricing based on demand
- Automatic rider dispatch
- Client preference learning

---

## 📞 **Support & Issues**

- **Technical Issues:** Check console logs and Supabase logs
- **WhatsApp Problems:** Verify API keys and phone number format
- **Database Errors:** Check RLS policies and migrations

---

## 📄 **License**

MIT License - Build freely!

---

## 🎉 **Credits**

Built with ❤️ for efficient delivery management.

- Supabase for backend infrastructure
- Tailwind CSS for beautiful UI
- Google Maps for location services
- Meta/Twilio for WhatsApp integration

---

**Ready to launch? Follow the Quick Start guide above!** 🚀

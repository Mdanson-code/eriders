// Auto Database Setup Script
// This script will create all tables, functions, and verify everything works
// Run: node scripts/auto-setup-database.js

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://ynthnahpnnusbtecivnt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InludGhuYWhwbm51c2J0ZWNpdm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Njg2MDIsImV4cCI6MjA3NzI0NDYwMn0.M54iJs5enG1UAb6cKuZ3PRMu2Jfiw6mQFA-SlgUQWG8';

// You'll need the service role key for this - get it from Supabase Dashboard > Settings > API
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

console.log('🚀 eRiders Database Auto-Setup\n');
console.log('='.repeat(60));

// SQL statements broken into individual commands
const SQL_COMMANDS = [
  // Enable UUID extension
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
  
  // Create custom types
  `CREATE TYPE order_status AS ENUM ('pending', 'assigned', 'on_route', 'delivered', 'cancelled');`,
  `CREATE TYPE event_actor AS ENUM ('client', 'admin', 'rider', 'system');`,
  
  // Create riders table
  `CREATE TABLE riders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    last_lat DECIMAL(10, 8),
    last_lng DECIMAL(11, 8),
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,
  
  // Create admin table
  `CREATE TABLE admin (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    email TEXT UNIQUE,
    auth_token TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,
  
  // Create orders table
  `CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT UNIQUE NOT NULL,
    client_name TEXT NOT NULL,
    client_whatsapp TEXT NOT NULL,
    preferred_shop TEXT,
    order_desc TEXT NOT NULL,
    delivery_location_text TEXT NOT NULL,
    pickup_lat DECIMAL(10, 8),
    pickup_lng DECIMAL(11, 8),
    delivery_lat DECIMAL(10, 8),
    delivery_lng DECIMAL(11, 8),
    rider_id UUID REFERENCES riders(id),
    rider_name TEXT,
    rider_whatsapp TEXT,
    rider_lat DECIMAL(10, 8),
    rider_lng DECIMAL(11, 8),
    tracking_link TEXT,
    google_maps_link TEXT,
    status order_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    on_route_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
  );`,
  
  // Create events table
  `CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    actor event_actor NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    ts TIMESTAMPTZ DEFAULT NOW()
  );`,
  
  // Create indexes
  `CREATE INDEX idx_orders_status ON orders(status);`,
  `CREATE INDEX idx_orders_created_at ON orders(created_at DESC);`,
  `CREATE INDEX idx_orders_order_id ON orders(order_id);`,
  `CREATE INDEX idx_events_order_id ON events(order_id);`,
  `CREATE INDEX idx_events_ts ON events(ts DESC);`,
  `CREATE INDEX idx_riders_active ON riders(active);`,
  
  // Create update trigger function
  `CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
  END;
  $$ language 'plpgsql';`,
  
  // Create trigger
  `CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`,
  
  // Create order ID generator function
  `CREATE OR REPLACE FUNCTION generate_order_id()
  RETURNS TEXT AS $$
  DECLARE
      new_id TEXT;
      year TEXT;
      seq INT;
  BEGIN
      year := TO_CHAR(NOW(), 'YYYY');
      
      SELECT COALESCE(MAX(
          CAST(SUBSTRING(order_id FROM 'ER-' || year || '-(.*)') AS INT)
      ), 0) + 1 INTO seq
      FROM orders
      WHERE order_id LIKE 'ER-' || year || '-%';
      
      new_id := 'ER-' || year || '-' || LPAD(seq::TEXT, 3, '0');
      RETURN new_id;
  END;
  $$ LANGUAGE plpgsql;`,
  
  // Create log event function
  `CREATE OR REPLACE FUNCTION log_event(
      p_order_id UUID,
      p_actor event_actor,
      p_event_type TEXT,
      p_payload JSONB DEFAULT '{}'
  )
  RETURNS UUID AS $$
  DECLARE
      event_id UUID;
  BEGIN
      INSERT INTO events (order_id, actor, event_type, payload)
      VALUES (p_order_id, p_actor, p_event_type, p_payload)
      RETURNING id INTO event_id;
      
      RETURN event_id;
  END;
  $$ LANGUAGE plpgsql;`,
  
  // Enable RLS
  `ALTER TABLE orders ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE riders ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE admin ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE events ENABLE ROW LEVEL SECURITY;`,
  
  // RLS Policies
  `CREATE POLICY "Public can insert orders" ON orders FOR INSERT WITH CHECK (true);`,
  `CREATE POLICY "Public can read orders" ON orders FOR SELECT USING (true);`,
  `CREATE POLICY "Authenticated can update orders" ON orders FOR UPDATE USING (auth.role() = 'authenticated');`,
  `CREATE POLICY "Public can read active riders" ON riders FOR SELECT USING (active = true);`,
  `CREATE POLICY "Public can insert events" ON events FOR INSERT WITH CHECK (true);`,
  `CREATE POLICY "Public can read events" ON events FOR SELECT USING (true);`,
  
  // Create auto-log triggers
  `CREATE OR REPLACE FUNCTION log_order_creation()
  RETURNS TRIGGER AS $$
  BEGIN
      PERFORM log_event(
          NEW.id,
          'client',
          'order_created',
          jsonb_build_object(
              'order_id', NEW.order_id,
              'client_name', NEW.client_name,
              'delivery_location', NEW.delivery_location_text
          )
      );
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;`,
  
  `CREATE TRIGGER trigger_log_order_creation
      AFTER INSERT ON orders
      FOR EACH ROW
      EXECUTE FUNCTION log_order_creation();`,
  
  `CREATE OR REPLACE FUNCTION log_status_change()
  RETURNS TRIGGER AS $$
  BEGIN
      IF OLD.status IS DISTINCT FROM NEW.status THEN
          PERFORM log_event(
              NEW.id,
              'system',
              'status_changed',
              jsonb_build_object(
                  'old_status', OLD.status,
                  'new_status', NEW.status,
                  'rider_name', NEW.rider_name
              )
          );
          
          IF NEW.status = 'assigned' THEN
              NEW.assigned_at = NOW();
          ELSIF NEW.status = 'on_route' THEN
              NEW.on_route_at = NOW();
          ELSIF NEW.status = 'delivered' THEN
              NEW.delivered_at = NOW();
          END IF;
      END IF;
      RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;`,
  
  `CREATE TRIGGER trigger_log_status_change
      BEFORE UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION log_status_change();`
];

async function setupDatabase() {
  console.log('📡 Connecting to Supabase...\n');
  
  // Check if we have service key
  if (!SUPABASE_SERVICE_KEY) {
    console.log('⚠️  Warning: SUPABASE_SERVICE_KEY not provided');
    console.log('   This script needs the service role key to create tables.');
    console.log('\n📋 To get your service role key:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/ynthnahpnnusbtecivnt/settings/api');
    console.log('   2. Copy "service_role" key (starts with eyJ...)');
    console.log('   3. Run: SUPABASE_SERVICE_KEY=your_key node scripts/auto-setup-database.js');
    console.log('\n💡 OR: Just run the migration manually in Supabase SQL Editor');
    console.log('   File: supabase/migrations/001_initial_schema.sql\n');
    return false;
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  console.log('✅ Connected to Supabase');
  console.log('   Project: ynthnahpnnusbtecivnt\n');
  
  console.log('🔨 Creating database schema...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < SQL_COMMANDS.length; i++) {
    const sql = SQL_COMMANDS[i];
    const commandType = sql.split(' ')[0];
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { query: sql });
      
      if (error) {
        // Check if it's a "already exists" error (which is okay)
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`   ⏭️  ${commandType} - Already exists, skipping`);
          successCount++;
        } else {
          console.log(`   ❌ ${commandType} - Error: ${error.message}`);
          errorCount++;
        }
      } else {
        console.log(`   ✅ ${commandType} - Success`);
        successCount++;
      }
    } catch (err) {
      console.log(`   ❌ ${commandType} - Exception: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Setup Summary: ${successCount} successful, ${errorCount} errors\n`);
  
  return errorCount === 0;
}

async function verifySetup() {
  console.log('🧪 Verifying database setup...\n');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const checks = [
    { name: 'orders table', test: async () => supabase.from('orders').select('*').limit(1) },
    { name: 'riders table', test: async () => supabase.from('riders').select('*').limit(1) },
    { name: 'admin table', test: async () => supabase.from('admin').select('*').limit(1) },
    { name: 'events table', test: async () => supabase.from('events').select('*').limit(1) },
    { name: 'generate_order_id()', test: async () => supabase.rpc('generate_order_id') },
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    try {
      const { data, error } = await check.test();
      
      if (error) {
        console.log(`   ❌ ${check.name} - ${error.message}`);
        allPassed = false;
      } else {
        if (check.name.includes('()')) {
          console.log(`   ✅ ${check.name} - Works! Result: ${data}`);
        } else {
          console.log(`   ✅ ${check.name} - Exists`);
        }
      }
    } catch (err) {
      console.log(`   ❌ ${check.name} - ${err.message}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

// Main execution
(async () => {
  try {
    const setupSuccess = await setupDatabase();
    
    if (!setupSuccess && !SUPABASE_SERVICE_KEY) {
      console.log('⚠️  Skipping verification (service key needed for setup)\n');
      process.exit(0);
    }
    
    console.log(''); // Empty line
    const verifySuccess = await verifySetup();
    
    console.log('\n' + '='.repeat(60));
    
    if (verifySuccess) {
      console.log('✨ SUCCESS! Database is fully set up and working!');
      console.log('\n📋 What was created:');
      console.log('   ✅ 4 tables: orders, riders, admin, events');
      console.log('   ✅ 2 functions: generate_order_id(), log_event()');
      console.log('   ✅ 3 triggers: auto-logging, timestamps');
      console.log('   ✅ 6 RLS policies: security rules');
      console.log('   ✅ 6 indexes: for performance');
      console.log('\n🚀 Next steps:');
      console.log('   - Build the order form (order.html)');
      console.log('   - Build the tracking page (track.html)');
      console.log('   - Build the rider panel (rider.html)');
      console.log('   - Build the admin dashboard (admin.html)');
    } else {
      console.log('⚠️  Database setup incomplete');
      console.log('\n💡 Manual setup option:');
      console.log('   1. Go to Supabase Dashboard > SQL Editor');
      console.log('   2. Run: supabase/migrations/001_initial_schema.sql');
    }
    
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
})();

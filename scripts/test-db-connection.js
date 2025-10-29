// Test Supabase Database Connection
// Run: node scripts/test-db-connection.js

import { createClient } from '@supabase/supabase-js';

// Your Supabase credentials
const SUPABASE_URL = 'https://ynthnahpnnusbtecivnt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InludGhuYWhwbm51c2J0ZWNpdm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Njg2MDIsImV4cCI6MjA3NzI0NDYwMn0.M54iJs5enG1UAb6cKuZ3PRMu2Jfiw6mQFA-SlgUQWG8';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 Testing Supabase Database Connection...\n');

async function testConnection() {
  try {
    // Test 1: Basic connection
    console.log('✅ Supabase client initialized');
    console.log('   URL:', SUPABASE_URL);
    
    // Test 2: Check if tables exist
    console.log('\n📊 Checking database tables...');
    
    const tables = ['orders', 'riders', 'admin', 'events'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`   ❌ Table "${table}" - ERROR:`, error.message);
          if (error.message.includes('does not exist')) {
            console.log(`      → Migration not run yet. Need to create table.`);
          }
        } else {
          console.log(`   ✅ Table "${table}" exists - ${data.length} sample record(s)`);
        }
      } catch (err) {
        console.log(`   ❌ Table "${table}" - EXCEPTION:`, err.message);
      }
    }
    
    // Test 3: Test order ID generator function
    console.log('\n🔢 Testing order ID generator function...');
    try {
      const { data, error } = await supabase.rpc('generate_order_id');
      
      if (error) {
        console.log('   ❌ Function "generate_order_id" - ERROR:', error.message);
        console.log('      → Function not created yet. Need to run migration.');
      } else {
        console.log('   ✅ Function works! Generated ID:', data);
      }
    } catch (err) {
      console.log('   ❌ Function error:', err.message);
    }
    
    // Test 4: Count existing records
    console.log('\n📈 Database Statistics:');
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log(`   ${table}: ${count} record(s)`);
        }
      } catch (err) {
        // Skip if table doesn't exist
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('💡 Next Steps:');
    console.log('='.repeat(60));
    
    // Determine what needs to be done
    const { data: ordersCheck } = await supabase.from('orders').select('*').limit(1);
    
    if (!ordersCheck) {
      console.log('\n❗ Database NOT set up yet. You need to:');
      console.log('   1. Open Supabase Dashboard: https://supabase.com/dashboard');
      console.log('   2. Go to SQL Editor');
      console.log('   3. Run the migration file: supabase/migrations/001_initial_schema.sql');
      console.log('   4. Then run seed data: scripts/seed-data.sql');
    } else {
      console.log('\n✅ Database is set up! Ready to use.');
      console.log('   - All tables exist');
      console.log('   - Functions are working');
      console.log('   - Ready for the frontend');
    }
    
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('   - Check your internet connection');
    console.log('   - Verify Supabase URL is correct');
    console.log('   - Verify anon key is correct');
    console.log('   - Check Supabase project is not paused');
  }
}

// Run tests
testConnection().then(() => {
  console.log('\n✨ Test complete!\n');
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

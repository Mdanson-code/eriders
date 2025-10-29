// eRiders Configuration
// This file contains your Supabase credentials for the frontend

export const CONFIG = {
  // Supabase Configuration
  supabase: {
    url: 'https://ynthnahpnnusbtecivnt.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InludGhuYWhwbm51c2J0ZWNpdm50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2Njg2MDIsImV4cCI6MjA3NzI0NDYwMn0.M54iJs5enG1UAb6cKuZ3PRMu2Jfiw6mQFA-SlgUQWG8'
  },
  
  // Admin Contact
  admin: {
    whatsapp: '0793476587', // Updated admin WhatsApp number
    email: 'admin@erdelivery.app'
  },
  
  // Google Maps API Key
  googleMaps: {
    apiKey: 'YOUR_GOOGLE_MAPS_API_KEY' // Get from: https://console.cloud.google.com
  },
  
  // Site URL
  siteUrl: window.location.origin, // Auto-detects current domain
  
  // Feature Flags
  features: {
    whatsappEnabled: false, // Set to true when you configure WhatsApp API
    gpsTrackingEnabled: true,
    ratingsEnabled: true
  }
};

// Initialize Supabase client (will be used in other files)
export function getSupabaseClient() {
  // This will be imported in other JS files
  // Usage: import { getSupabaseClient } from './config.js'
  
  if (typeof window.supabase === 'undefined') {
    console.error('❌ Supabase library not loaded! Add this to your HTML:');
    console.error('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
    return null;
  }
  
  return window.supabase.createClient(
    CONFIG.supabase.url,
    CONFIG.supabase.anonKey
  );
}

// Helper function to format WhatsApp number
export function formatWhatsAppNumber(phone) {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Add Kenya country code if not present
  if (!cleaned.startsWith('254') && cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  return cleaned;
}

// Helper function to generate WhatsApp link
export function getWhatsAppLink(phone, message = '') {
  const formattedPhone = formatWhatsAppNumber(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}${message ? `?text=${encodedMessage}` : ''}`;
}

// Helper function to show toast notifications
export function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 20px;">
        ${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}
      </span>
      <span>${message}</span>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Log configuration (for debugging)
console.log('🔧 eRiders Config loaded:', {
  supabaseUrl: CONFIG.supabase.url,
  features: CONFIG.features
});

// =========================================
// LABWATCH - SUPABASE CONFIGURATION
// =========================================

// GANTI DENGAN URL PROJECT SUPABASE KAMU
const SUPABASE_URL = "https://mulzgfylokqdbmjbpibg.supabase.co";

// GANTI DENGAN ANON/PUBLISHABLE KEY SUPABASE KAMU
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11bHpnZnlsb2txZGJtamJwaWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1ODY3NzgsImV4cCI6MjEwNjE2Mjc3OH0.7zp_wQby4418JM2LuvE9EkYCELYuV3o58Idt7LwD1w8";


// Membuat koneksi Supabase
const { createClient } = supabase;

const supabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);


// Supaya bisa digunakan oleh file JavaScript lainnya
window.supabaseClient = supabaseClient;
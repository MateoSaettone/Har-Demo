// Copy this file to web/js/config.js and fill in your Supabase project details.
// The anon key is safe to ship in the browser; we only use Realtime Broadcast
// (ephemeral pub/sub, no tables, no row-level data).

export const SUPABASE_URL = "https://YOUR-PROJECT-ref.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR-SUPABASE-ANON-KEY";

// All devices on the same channel name share predictions. Change per demo if
// you want isolated sessions (e.g. "har-demo-cis4930-apr-2026").
export const CHANNEL_NAME = "har-demo";

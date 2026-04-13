// Supabase project: har-demo-cis4930 (ref wzpjskbwqyqjdmadqztj)
// Created via CLI on 2026-04-13. The anon key below is safe to ship in the
// browser — we only use Realtime Broadcast (ephemeral pub/sub, no tables).
// This file is gitignored; edit web/js/config.example.js if you need to share
// a template with the team.

export const SUPABASE_URL = "https://wzpjskbwqyqjdmadqztj.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6cGpza2J3cXlxamRtYWRxenRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMDYzODcsImV4cCI6MjA5MTY4MjM4N30.stm0M-FqC3m0gbuFBuhRIIM5qXPg41BMUM1QK0JE05c";

// All devices on the same channel name share predictions. Change per demo if
// you want isolated sessions (e.g. "har-demo-cis4930-apr-2026").
export const CHANNEL_NAME = "har-demo";

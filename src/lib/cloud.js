import { createClient } from '@supabase/supabase-js';

// These come from your Supabase project settings (Project Settings > API).
// The "anon" key is DESIGNED to be public/shipped in client apps — it's not
// a secret. Real security comes from Row Level Security (RLS) rules on your
// tables, set up in the Supabase dashboard (see README "Cloud storage setup").
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export function isCloudConfigured() {
  return supabase !== null;
}

/** Sends a one-time magic link to the given email for passwordless sign-in. */
export async function signInWithEmail(email) {
  if (!supabase) throw new Error('Cloud storage is not configured yet — see README.');
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Saves one record (a subnet calc, scan result, etc.) tied to the signed-in user. */
export async function saveSession(kind, payload) {
  if (!supabase) throw new Error('Cloud storage is not configured yet — see README.');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in. Run: cloud login <email>');

  const { error } = await supabase
    .from('sessions')
    .insert({ user_id: user.id, kind, payload });
  if (error) throw error;
}

/** Lists saved records for the signed-in user, most recent first. */
export async function listSessions(kind) {
  if (!supabase) throw new Error('Cloud storage is not configured yet — see README.');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in. Run: cloud login <email>');

  let query = supabase
    .from('sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20);
  if (kind) query = query.eq('kind', kind);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

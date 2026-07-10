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

/** Creates a new team and returns its short invite code. */
export async function createTeam() {
  if (!supabase) throw new Error('Cloud storage is not configured yet — see README.');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in. Run: cloud login <email>');

  const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  const { data: team, error } = await supabase
    .from('teams')
    .insert({ invite_code: inviteCode, created_by: user.id })
    .select()
    .single();
  if (error) throw error;

  await supabase.from('team_members').insert({ team_id: team.id, user_id: user.id });
  return inviteCode;
}

/** Joins an existing team by its invite code. */
export async function joinTeam(inviteCode) {
  if (!supabase) throw new Error('Cloud storage is not configured yet — see README.');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in. Run: cloud login <email>');

  const { data: team, error: findError } = await supabase
    .from('teams')
    .select('id')
    .eq('invite_code', inviteCode.toUpperCase())
    .single();
  if (findError || !team) throw new Error('No team found with that invite code.');

  const { error } = await supabase.from('team_members').insert({ team_id: team.id, user_id: user.id });
  if (error && !error.message.includes('duplicate')) throw error;
  return team.id;
}

/** Returns the current user's team id, or null if they're not on one. */
async function getMyTeamId() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data } = await supabase.from('team_members').select('team_id').eq('user_id', user.id).limit(1).maybeSingle();
  return data?.team_id ?? null;
}

/** Saves one record. If the user has joined a team, it's shared with the team; otherwise it's private to them. */
export async function saveSession(kind, payload) {
  if (!supabase) throw new Error('Cloud storage is not configured yet — see README.');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in. Run: cloud login <email>');

  const teamId = await getMyTeamId();
  const { error } = await supabase
    .from('sessions')
    .insert({ user_id: user.id, team_id: teamId, kind, payload });
  if (error) throw error;
}

/** Lists sessions visible to the signed-in user — their own, plus their team's if they've joined one. */
export async function listSessions(kind) {
  if (!supabase) throw new Error('Cloud storage is not configured yet — see README.');
  const user = await getCurrentUser();
  if (!user) throw new Error('Not signed in. Run: cloud login <email>');

  let query = supabase
    .from('sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(30);
  if (kind) query = query.eq('kind', kind);

  const { data, error } = await query;
  if (error) throw error;
  return data; // RLS on the "sessions" table restricts this to own + team rows — see README setup
}

// Supabase Edge Function: send-team-invite
//
// Sends a team invite email via Resend. The Resend API key lives only in
// Supabase's server-side secrets (set via `supabase secrets set`), never in
// the app bundle — that's the whole point of this function existing instead
// of calling Resend directly from the client.
//
// This function REQUIRES the caller to be signed in (a valid Supabase auth
// session) so random people can't use your app as a spam relay. It also
// verifies the caller actually belongs to the team they're inviting people
// to, rather than trusting whatever team_id/invite_code the client sends.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// Defaults to Resend's shared sandbox sender so this works with zero domain
// setup. Once your domain is verified in Resend, set this secret instead:
//   supabase secrets set INVITE_FROM_EMAIL="Mnetto Team Invites <join.team@mnetto.com>"
const INVITE_FROM_EMAIL = Deno.env.get('INVITE_FROM_EMAIL') || 'onboarding@resend.dev';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set. Run: supabase secrets set RESEND_API_KEY=...');
    }

    // Verify the caller is actually signed in — this uses the caller's own
    // JWT (passed through from the client automatically), not a service key,
    // so it respects the same auth rules as everywhere else in the app.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Not authenticated.');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !user) throw new Error('Not authenticated.');

    const { toEmail } = await req.json();
    if (!toEmail || typeof toEmail !== 'string') {
      throw new Error('toEmail is required.');
    }

    // Look up the caller's own team — never trust a team_id/invite_code sent
    // by the client directly, since that would let anyone invite people to
    // teams they're not even a member of.
    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) throw new Error("You're not on a team yet. Run: cloud team create");

    const { data: team } = await supabase
      .from('teams')
      .select('invite_code')
      .eq('id', membership.team_id)
      .single();

    if (!team) throw new Error('Team not found.');

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: INVITE_FROM_EMAIL,
        to: [toEmail],
        subject: "You've been invited to a Mnetto team",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>You've been invited to join a team on Mnetto</h2>
            <p>${user.email} invited you to their team workspace.</p>
            <p>Open Mnetto and run:</p>
            <p style="font-size: 20px; font-weight: bold; background: #f4f4f4; padding: 12px; border-radius: 6px;">
              cloud team join ${team.invite_code}
            </p>
            <p style="color: #888; font-size: 13px;">If you don't have Mnetto yet, ask ${user.email} for a download link.</p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      throw new Error(`Resend API error: ${errBody}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

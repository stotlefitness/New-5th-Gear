import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Exchange code for session (OAuth flow)
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
    }
  }

  // Get authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(new URL('/login?error=not_authenticated', requestUrl.origin));
  }

  // Check if profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Profile lookup error:', profileError);
    return NextResponse.redirect(new URL('/login?error=profile_error', requestUrl.origin));
  }

  // No profile exists → send to complete account flow
  if (!profile) {
    return NextResponse.redirect(new URL('/complete-account', requestUrl.origin));
  }

  // Profile exists - validate role and route accordingly
  // CRITICAL: Only allow coach role if user is the configured coach
  const { data: coachSettings } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'single_coach')
    .maybeSingle();

  let isRealCoach = false;
  if (coachSettings?.value?.coach_id) {
    isRealCoach = coachSettings.value.coach_id === user.id;
  }

  // If profile says coach but they're not the real coach, fix it
  if (profile.role === 'coach' && !isRealCoach) {
    console.warn(`User ${user.id} has coach role but is not the configured coach. Updating to client.`);
    await supabase
      .from('profiles')
      .update({ role: 'client' })
      .eq('id', user.id);
    
    // Redirect to client portal
    return NextResponse.redirect(new URL('/book', requestUrl.origin));
  }

  // Route based on verified role
  if (profile.role === 'coach' && isRealCoach) {
    // Coach goes to coach portal
    return NextResponse.redirect(new URL('/availability', requestUrl.origin));
  } else {
    // Client goes to client portal (check if profile needs completion)
    // For now, just route to book page - profile completeness is checked elsewhere
    return NextResponse.redirect(new URL('/book', requestUrl.origin));
  }
}

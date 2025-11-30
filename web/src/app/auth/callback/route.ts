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

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
    }
  }

  // Check if user profile is complete and redirect accordingly
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(new URL('/login?error=not_authenticated', requestUrl.origin));
  }

  if (user) {
    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    // If profile doesn't exist, try to create it via RPC (in case trigger failed)
    if (profileError || !profile) {
      // First try RPC function (safer, handles edge cases)
      const { error: rpcError } = await supabase.rpc('ensure_profile_exists', {
        p_user_id: user.id
      });

      if (rpcError) {
        console.error('RPC failed, trying direct insert:', rpcError);
        // Fallback to direct insert
        const meta = user.user_metadata || {};
        const fullName = meta.full_name || user.email?.split("@")[0] || "User";
        const role = (meta.role || "client") as "coach" | "client";
        const accountType = (meta.account_type || "player") as "parent" | "player";

        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || "",
            full_name: fullName,
            role: role,
            account_type: accountType,
          });

        if (insertError) {
          console.error('Failed to create profile:', insertError);
          return NextResponse.redirect(new URL('/complete-account', requestUrl.origin));
        }
      }

      // Re-fetch profile after creation
      const { data: profileRetry } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profileRetry) {
        return NextResponse.redirect(new URL('/complete-account', requestUrl.origin));
      }

      // Validate that coach role is only for the actual coach
      const { data: coachSettings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'single_coach')
        .maybeSingle();
      
      let isRealCoach = false;
      if (coachSettings?.value?.coach_id) {
        const coachId = coachSettings.value.coach_id;
        isRealCoach = coachId === user.id;
      }

      // If profile was created with coach role but user is not the real coach, fix it
      if (profileRetry.role === 'coach' && !isRealCoach) {
        await supabase
          .from('profiles')
          .update({ role: 'client' })
          .eq('id', user.id);
        profileRetry.role = 'client';
      }

      // Profile created, redirect based on role
      const meta = user.user_metadata || {};
      if (profileRetry.role === 'coach' && isRealCoach) {
        return NextResponse.redirect(new URL('/availability', requestUrl.origin));
      }

      // For clients, check if profile is complete
      const isComplete = meta.account_type && meta.player_name;
      if (!isComplete) {
        return NextResponse.redirect(new URL('/complete-account', requestUrl.origin));
      }

      return NextResponse.redirect(new URL('/book', requestUrl.origin));
    }

    // Profile exists, check completeness
    if (profile) {
      // CRITICAL: Only allow coach role if email matches the configured coach email
      // This prevents clients from being incorrectly identified as coaches
      const { data: coachSettings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'single_coach')
        .maybeSingle();
      
      let isRealCoach = false;
      if (coachSettings?.value?.coach_id) {
        const coachId = coachSettings.value.coach_id;
        const { data: coachProfile } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('id', coachId)
          .maybeSingle();
        isRealCoach = coachProfile?.id === user.id;
      }

      // If profile says coach but they're not the real coach, fix the role
      if (profile.role === 'coach' && !isRealCoach) {
        // Update profile to client role
        await supabase
          .from('profiles')
          .update({ role: 'client' })
          .eq('id', user.id);
        profile.role = 'client';
      }

      // For coaches, profile existence is enough (no player_name needed)
      // But verify they're actually the coach by checking app_settings
      if (profile.role === 'coach' && isRealCoach) {
        return NextResponse.redirect(new URL('/availability', requestUrl.origin));
      }

      // For clients, check if profile is complete (account_type and player_name)
      const meta = user.user_metadata || {};
      const isComplete = meta.account_type && meta.player_name;

      if (!isComplete) {
        return NextResponse.redirect(new URL('/complete-account', requestUrl.origin));
      }

      // Client profile is complete - redirect to book page
      return NextResponse.redirect(new URL('/book', requestUrl.origin));
    } else {
      // No profile yet - redirect to complete account
      return NextResponse.redirect(new URL('/complete-account', requestUrl.origin));
    }
  }

  // Default redirect to login if something went wrong
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}

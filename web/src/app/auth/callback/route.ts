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
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Check if user profile is complete and redirect accordingly
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Check if profile is complete
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile) {
      const meta = user.user_metadata || {};
      const isComplete = meta.account_type && meta.player_name;

      if (!isComplete) {
        return NextResponse.redirect(new URL('/complete-account', requestUrl.origin));
      }

      // Redirect based on role
      if (profile.role === 'coach') {
        return NextResponse.redirect(new URL('/availability', requestUrl.origin));
      } else {
        return NextResponse.redirect(new URL('/book', requestUrl.origin));
      }
    }
  }

  // Default redirect to login if something went wrong
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}

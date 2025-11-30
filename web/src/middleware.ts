import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    // Not authenticated - let auth pages through, redirect others to login
    if (!request.nextUrl.pathname.startsWith('/login') && 
        !request.nextUrl.pathname.startsWith('/signup') &&
        !request.nextUrl.pathname.startsWith('/forgot-password') &&
        !request.nextUrl.pathname.startsWith('/reset-password') &&
        !request.nextUrl.pathname.startsWith('/complete-account') &&
        !request.nextUrl.pathname.startsWith('/auth/callback') &&
        !request.nextUrl.pathname.startsWith('/signup/complete') &&
        request.nextUrl.pathname !== '/') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  // Get user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  const role = profile?.role || 'client'
  const pathname = request.nextUrl.pathname

  // Shared routes that both roles can access
  const sharedRoutes = ['/settings', '/lessons', '/messages', '/requests']
  const isSharedRoute = sharedRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))

  // If it's a shared route, let it through (layouts will handle role-based rendering)
  if (isSharedRoute) {
    return response
  }

  // Coach-only routes
  if (pathname.startsWith('/availability') || pathname.startsWith('/availability/')) {
    if (role !== 'coach') {
      return NextResponse.redirect(new URL('/book', request.url))
    }
    return response
  }

  // Client-only routes
  if (pathname.startsWith('/book') || pathname.startsWith('/book/')) {
    if (role !== 'client') {
      return NextResponse.redirect(new URL('/availability', request.url))
    }
    return response
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}


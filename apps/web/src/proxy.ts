import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/decision')
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isConsentPage = pathname.startsWith('/consent')

  // Unauthenticated → login
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated but no consent → consent gate
  if (isProtected && user && !user.user_metadata?.consented_at) {
    const url = request.nextUrl.clone()
    url.pathname = '/consent'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Already consented — skip consent page
  if (isConsentPage && user?.user_metadata?.consented_at) {
    const url = request.nextUrl.clone()
    url.pathname = request.nextUrl.searchParams.get('next') ?? '/dashboard'
    url.searchParams.delete('next')
    return NextResponse.redirect(url)
  }

  // Already authenticated — skip auth pages
  if (isAuthPage && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/decision/:path*', '/login', '/signup', '/consent'],
}

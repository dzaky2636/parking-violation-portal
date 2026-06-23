import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const publicPaths = ['/login']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', encodeURIComponent(pathname))
    return NextResponse.redirect(redirectUrl)
  }

  const role = user.app_metadata?.role as string | undefined

  if (pathname.startsWith('/officer') && role !== 'officer') {
    return NextResponse.redirect(new URL('/member', request.url))
  }

  if (pathname.startsWith('/member') && role !== 'member') {
    return NextResponse.redirect(new URL('/officer', request.url))
  }

  if (pathname === '/') {
    if (role === 'officer') {
      return NextResponse.redirect(new URL('/officer', request.url))
    }
    if (role === 'member') {
      return NextResponse.redirect(new URL('/member', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
}

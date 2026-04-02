import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const authStorage = request.cookies.get('auth-storage')

  let isAuthenticated = false

  if (authStorage) {
    try {
      const parsed = JSON.parse(decodeURIComponent(authStorage.value))
      isAuthenticated = !!parsed?.state?.token
    } catch {
      isAuthenticated = false
    }
  }

  const { pathname } = request.nextUrl

  // Protect dashboard routes
  if (pathname.startsWith('/campaigns') ||
      pathname.startsWith('/sequences') ||
      pathname.startsWith('/target-groups') ||
      pathname.startsWith('/mailboxes') ||
      pathname.startsWith('/settings') ||
      pathname === '/') {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if ((pathname === '/login' || pathname === '/register' || pathname === '/pending-approval' || pathname.startsWith('/accept-invite')) && isAuthenticated) {
    return NextResponse.redirect(new URL('/campaigns', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}

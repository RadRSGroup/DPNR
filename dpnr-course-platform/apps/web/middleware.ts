import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/' || pathname === '') {
    const cookie = request.cookies.get('NEXT_LOCALE')?.value;
    const al = (request.headers.get('accept-language') || '').toLowerCase();
    const prefersHe = (cookie === 'he') || al.includes('he');
    const locale = cookie === 'he' || cookie === 'en' ? cookie! : (prefersHe ? 'he' : 'en');
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/'] };


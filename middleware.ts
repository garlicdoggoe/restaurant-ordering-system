import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/owner(.*)', '/customer(.*)']);
const isOwnerRoute = createRouteMatcher(['/owner(.*)']);
const isCustomerRoute = createRouteMatcher(['/customer(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Protect all routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
    
    // Get user from Clerk
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.redirect(new URL('/sign-in', req.url));
    }

    // Check role-based access
    const userRole = (sessionClaims?.metadata as any)?.role as string || 'customer';
    
    // Redirect customers away from owner routes
    if (isOwnerRoute(req) && userRole !== 'owner') {
      return NextResponse.redirect(new URL('/customer', req.url));
    }
    
    // Redirect owners away from customer routes (optional - you might want owners to access both)
    // if (isCustomerRoute(req) && userRole === 'owner') {
    //   return NextResponse.redirect(new URL('/owner', req.url));
    // }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
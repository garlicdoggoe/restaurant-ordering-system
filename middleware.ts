import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/owner(.*)', '/customer(.*)']);

export default clerkMiddleware(async (auth, req) => {
  // Check if the route requires authentication
  if (isProtectedRoute(req)) {
    // Get authentication status
    const { userId } = await auth();
    
    // If user is not authenticated, redirect to homepage instead of Clerk's sign-in page
    if (!userId) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    
    // If authenticated, allow the request to proceed
    // The page components will handle role-based redirects
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
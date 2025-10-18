// Clerk + Convex auth configuration for development.
// Create a Clerk JWT template named "Convex" in the Clerk dashboard and copy the Issuer URL.
// In development, you can also use the `.env.local` value NEXT_PUBLIC_CLERK_JWT_ISSUER or hardcode here.

export default {
  providers: [
    {
      // Replace this with your Clerk Convex JWT template Issuer (eg: https://<your-domain>.clerk.accounts.dev)
      domain: process.env.NEXT_PUBLIC_CLERK_JWT_ISSUER ?? "",
      applicationID: "convex",
    },
  ],
} satisfies {
  providers: { domain: string; applicationID: string }[]
}



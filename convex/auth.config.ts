export default {
  providers: [
    {
      domain:
        process.env.CLERK_JWT_ISSUER_DOMAIN ||
        "https://driving-mallard-7034.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};


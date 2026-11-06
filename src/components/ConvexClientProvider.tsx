"use client";

import { ReactNode, useMemo } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ForcePasswordUpdateModal } from "./ForcePasswordUpdateModal";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!;
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  const convex = useMemo(() => new ConvexReactClient(convexUrl), [convexUrl]);

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth as any}>
        {children}
        <ForcePasswordUpdateModal />
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

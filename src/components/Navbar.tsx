"use client";

import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Wrench, Repeat, ShieldCheck, PlusCircle } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function Navbar({ onOpenListModal }: { onOpenListModal?: () => void }) {
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser, {});

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:bg-brand-700 transition">
              <div className="relative">
                <Wrench className="w-5 h-5" />
                <Repeat className="w-3.5 h-3.5 absolute -bottom-1 -right-1 text-brand-200" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900">
                  Lend<span className="text-brand-600">Loop</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full">
                  Neighborhood Share
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Borrow what you need. Lend what you don&apos;t.
              </p>
            </div>
          </Link>

          {/* Navigation & Actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link
              href="/"
              className="text-sm font-medium text-slate-700 hover:text-brand-600 transition hidden sm:inline-block"
            >
              Public Tools
            </Link>

            <SignedIn>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-700 hover:text-brand-600 transition"
              >
                Dashboard
              </Link>

              {onOpenListModal && (
                <button
                  onClick={onOpenListModal}
                  className="inline-flex items-center space-x-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>List a Tool</span>
                </button>
              )}

              {currentUser?.isTrustedLender && (
                <span className="hidden lg:inline-flex items-center space-x-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Trusted Lender</span>
                </span>
              )}

              {currentUser?.role === "admin" && (
                <span className="hidden lg:inline-flex text-[11px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                  Admin
                </span>
              )}

              <UserButton afterSignOutUrl="/" />
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <button className="inline-flex items-center justify-center bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-sm hover:shadow transition">
                  Sign in to lend or borrow
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>
    </header>
  );
}

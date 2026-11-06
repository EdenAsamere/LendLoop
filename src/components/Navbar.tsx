"use client";

import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Search, Heart, Plus, Sparkles, LayoutDashboard, Shield } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UserRoleBadge } from "./UserRoleBadge";

import { ALL_CATEGORIES } from "../lib/constants";

interface NavbarProps {
  onOpenListModal?: () => void;
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function Navbar({
  onOpenListModal,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
}: NavbarProps) {
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser, user?.id ? { clerkId: user.id } : {});
  const incomingRequests = useQuery(api.requests.incomingRequests, user?.id ? { clerkId: user.id } : {});
  const favoriteIds = useQuery(api.favorites.listMyFavoriteToolIds, user?.id ? { clerkId: user.id } : {});
  const pendingCount = incomingRequests?.filter((r) => r.status === "pending").length || 0;
  const favoritesCount = favoriteIds?.length || 0;
  const isStewardOrAdmin = currentUser?.role === "moderator" || currentUser?.role === "admin";

  return (
    <header className="sticky top-0 z-50 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-[#EAE8E2] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Brand Logo - Editorial Aesthetic like Bliss / MOSS */}
          <Link href="/" className="flex items-center space-x-2 group shrink-0">
            <span className="font-serif text-2xl sm:text-3xl font-extrabold tracking-tight text-[#181816]">
              Lend<span className="italic font-normal">Loop</span>
            </span>
          </Link>

          {/* Center Pill Navigation (Bliss Inspo) */}
          <div className="hidden lg:flex items-center gap-1.5 bg-[#F3F1EC] p-1.5 rounded-full border border-[#EAE8E2]">
            {ALL_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat || (!selectedCategory && cat === "All");
              return onSelectCategory ? (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(cat)}
                  className={`text-xs font-medium px-4 py-1.5 rounded-full transition-all duration-200 ${
                    isActive
                      ? "bg-[#181816] text-white shadow-sm"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                  }`}
                >
                  {cat}
                </button>
              ) : (
                <Link
                  key={cat}
                  href={`/?category=${encodeURIComponent(cat)}`}
                  className={`text-xs font-medium px-4 py-1.5 rounded-full transition-all duration-200 ${
                    isActive
                      ? "bg-[#181816] text-white shadow-sm"
                      : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
                  }`}
                >
                  {cat}
                </Link>
              );
            })}
          </div>

          {/* Right Action Section */}
          <div className="flex items-center space-x-3 shrink-0">
            {/* Minimal Pill Search */}
            {onSearchChange !== undefined ? (
              <div className="relative hidden md:block">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery || ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search tools..."
                  className="w-44 lg:w-56 text-xs pl-9 pr-4 py-2 rounded-full bg-[#F3F1EC] border border-[#EAE8E2] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900 focus:bg-white transition"
                />
              </div>
            ) : (
              <Link
                href="/#tools"
                className="hidden md:flex items-center gap-2 text-xs px-4 py-2 rounded-full bg-[#F3F1EC] border border-[#EAE8E2] text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 transition"
              >
                <Search className="w-3.5 h-3.5 text-stone-400" />
                <span>Search</span>
              </Link>
            )}

            <SignedIn>
              {/* Saved Favorites Shortcut */}
              <Link
                href="/dashboard?tab=favorites"
                className="relative w-9 h-9 rounded-full bg-[#F3F1EC] border border-[#EAE8E2] flex items-center justify-center text-stone-700 hover:text-rose-600 hover:bg-stone-200/60 transition"
                title={`Saved Favorites (${favoritesCount})`}
              >
                <Heart
                  className={`w-4 h-4 transition ${
                    favoritesCount > 0 ? "fill-rose-500 text-rose-500" : ""
                  }`}
                />
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {favoritesCount}
                  </span>
                )}
              </Link>

              {/* Compliance & Safety Desk (Steward or Admin) */}
              {isStewardOrAdmin && (
                <Link
                  href="/dashboard?tab=compliance"
                  className="relative hidden md:inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition"
                  title="Compliance & Safety Desk"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Compliance Desk</span>
                </Link>
              )}

              {/* Dashboard & Requests */}
              <Link
                href="/dashboard"
                className="relative hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full border border-stone-200 bg-[#F3F1EC] hover:bg-stone-200/60 text-stone-800 transition"
                title="Member Dashboard"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
                {pendingCount > 0 && (
                  <span className="w-4 h-4 bg-[#181816] text-white text-[9px] font-bold rounded-full flex items-center justify-center ml-0.5">
                    {pendingCount}
                  </span>
                )}
              </Link>

              {/* List Tool Button */}
              {onOpenListModal ? (
                <button
                  onClick={onOpenListModal}
                  className="inline-flex items-center gap-1.5 bg-[#181816] hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-full shadow-sm hover:shadow transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">List Tool</span>
                </button>
              ) : null}

              {/* Verified RBAC Role Badge */}
              <UserRoleBadge />

              <div className="pl-1">
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "w-9 h-9 ring-1 ring-[#EAE8E2]",
                    },
                  }}
                />
              </div>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <button className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full border border-stone-300 text-stone-700 hover:bg-[#F3F1EC] transition">
                  <Plus className="w-3.5 h-3.5" />
                  <span>List Tool</span>
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="inline-flex items-center justify-center bg-[#181816] hover:bg-black text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-sm hover:shadow transition">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>
    </header>
  );
}



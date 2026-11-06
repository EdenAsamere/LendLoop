"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Navbar } from "../components/Navbar";
import { ToolCard, PublicTool } from "../components/ToolCard";
import { BorrowModal } from "../components/BorrowModal";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, useUser } from "@clerk/nextjs";
import {
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Columns,
  Search,
  X,
  ArrowUpRight,
  Wrench,
} from "lucide-react";
import { ALL_CATEGORIES } from "../lib/constants";

export default function HomePage() {
  const { user } = useUser();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"carousel" | "grid">("carousel");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [borrowTool, setBorrowTool] = useState<PublicTool | null>(null);

  const carouselRef = useRef<HTMLDivElement>(null);

  // Query Convex public endpoint (enforces strict data-minimization: name and category only!)
  const liveTools = useQuery(api.tools.listPublic, {
    category: selectedCategory === "All" ? undefined : selectedCategory,
    search: searchQuery || undefined,
  });

  const favoriteIds = useQuery(
    api.favorites.listMyFavoriteToolIds,
    user?.id ? { clerkId: user.id } : {}
  );
  const activeRequestedIds = useQuery(
    api.requests.myActiveRequestedToolIds,
    user?.id ? { clerkId: user.id } : {}
  );
  const toggleFavorite = useMutation(api.favorites.toggle);

  const handleToggleFavorite = async (toolId: string) => {
    if (!user) return;
    try {
      await toggleFavorite({ toolId: toolId as any, clerkId: user.id });
    } catch (err: any) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const isLoading = liveTools === undefined;
  const displayedTools: PublicTool[] = liveTools || [];

  // Scroll handlers for Bliss carousel navigation
  const handleScroll = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const cardWidth = 320; // approximate card width + gap
    const scrollAmount = direction === "left" ? -cardWidth : cardWidth;
    carouselRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });

    // Update active index indicator
    setActiveCardIndex((prev) => {
      if (direction === "right") {
        return Math.min(prev + 1, Math.max(0, displayedTools.length - 1));
      } else {
        return Math.max(prev - 1, 0);
      }
    });
  };

  const handleScrollEvent = () => {
    if (!carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const cardWidth = 320;
    const index = Math.round(scrollLeft / cardWidth);
    setActiveCardIndex(Math.min(index, Math.max(0, displayedTools.length - 1)));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#181816]">
      <Navbar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Breadcrumb Row (Bliss Inspo) */}
        <div className="flex items-center space-x-2 text-xs text-stone-500 mb-6">
          <Link href="/" className="hover:text-stone-900 transition">
            Home
          </Link>
          <span>/</span>
          <span className="text-stone-400">Library</span>
          <span>/</span>
          <span className="text-stone-900 font-medium">
            {selectedCategory === "All" ? "Collection" : selectedCategory}
          </span>
        </div>

        {/* Minimalist Editorial Headline (MOSS Inspo) */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-[#181816] max-w-3xl leading-[1.1]">
              DISCOVER TOOLS IN YOUR NEIGHBORHOOD
            </h1>
            <p className="mt-4 text-stone-600 text-sm sm:text-base max-w-xl font-normal">
              Borrow what you need. Lend what you don&apos;t. High-grade equipment shared safely with verified neighbors.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <SignedIn>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 bg-[#181816] hover:bg-black text-white text-xs font-semibold px-5 py-3 rounded-full shadow-sm hover:shadow transition"
              >
                <span>Explore Dashboard</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 bg-[#181816] hover:bg-black text-white text-xs font-semibold px-5 py-3 rounded-full shadow-sm hover:shadow transition"
                >
                  <span>Explore Dashboard</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>

        {/* Secondary Subcategory / Filter Row (Bliss Inspo) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EAE8E2] pb-4 mb-8">
          {/* Category Tabs with active indicator dot (like Bliss "New collection •") */}
          {/* Category Tabs with active indicator dot (like Bliss "New collection •") */}
          <div className="flex items-center space-x-6 overflow-x-auto no-scrollbar py-1">
            {ALL_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs sm:text-sm font-medium whitespace-nowrap transition-colors relative py-1 flex flex-col items-center ${
                    isActive ? "text-[#181816] font-semibold" : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  <span>{cat}</span>
                  {isActive && (
                    <span className="w-1 h-1 rounded-full bg-[#181816] mt-1" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Action Controls: View switcher & Bliss Filter pill */}
          <div className="flex items-center space-x-3 shrink-0 self-end sm:self-auto">
            {/* View Mode Switcher */}
            <div className="hidden sm:flex items-center space-x-1 border border-[#EAE8E2] rounded-full p-1 bg-[#F3F1EC]">
              <button
                onClick={() => setViewMode("carousel")}
                className={`p-1.5 rounded-full transition ${
                  viewMode === "carousel"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-400 hover:text-stone-700"
                }`}
                title="Carousel View"
              >
                <Columns className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-full transition ${
                  viewMode === "grid"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-400 hover:text-stone-700"
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Bliss Black Filter Pill Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full transition ${
                showFilters
                  ? "bg-[#181816] text-white"
                  : "bg-[#181816] hover:bg-black text-white shadow-sm"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Collapsible Filter Bar */}
        {showFilters && (
          <div className="mb-8 p-4 rounded-2xl bg-[#F3F1EC] border border-[#EAE8E2] flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools by name..."
                className="w-full text-xs pl-10 pr-4 py-2.5 rounded-full border border-[#EAE8E2] bg-white text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-full bg-white border border-[#EAE8E2]"
                >
                  <X className="w-3 h-3" />
                  <span>Clear Search</span>
                </button>
              )}
              <span className="text-xs text-stone-500">
                Showing {displayedTools.length} {displayedTools.length === 1 ? "tool" : "tools"}
              </span>
            </div>
          </div>
        )}

        {/* LOADING SKELETONS */}
        {isLoading ? (
          <div className="flex items-stretch gap-6 overflow-hidden pb-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="w-[270px] sm:w-[300px] lg:w-[320px] shrink-0 animate-pulse"
              >
                <div className="aspect-[3/4.2] sm:aspect-[3/4.4] w-full rounded-[2.2rem] bg-[#ECEAE3]" />
                <div className="mt-3.5 flex items-center justify-between gap-2 px-1">
                  <div className="w-24 h-8 rounded-full bg-[#ECEAE3]" />
                  <div className="w-20 h-8 rounded-full bg-[#ECEAE3]" />
                </div>
              </div>
            ))}
          </div>
        ) : viewMode === "carousel" ? (
          /* CAROUSEL VIEW (Bliss 5-Card Layout) */
          <div className="relative">
            <div
              ref={carouselRef}
              onScroll={handleScrollEvent}
              className="flex items-stretch gap-6 overflow-x-auto no-scrollbar pb-6 scroll-smooth snap-x snap-mandatory"
            >
              {displayedTools.map((tool) => (
                <div
                  key={tool._id}
                  className="w-[270px] sm:w-[300px] lg:w-[320px] shrink-0 snap-start"
                >
                  <ToolCard
                    tool={tool}
                    isPublicOnly={true}
                    onRequestBorrow={(t) => setBorrowTool(t)}
                    isFavorited={favoriteIds?.includes(tool._id as any)}
                    onToggleFavorite={handleToggleFavorite}
                    hasPendingRequest={activeRequestedIds?.includes(tool._id as any)}
                  />
                </div>
              ))}
            </div>

            {displayedTools.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[2rem] border border-[#EAE8E2] p-8 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-[#F3F1EC] flex items-center justify-center mx-auto mb-3 text-stone-500">
                  <Wrench className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-900">No tools found</h3>
                <p className="text-xs text-stone-500 mt-1 mb-5">
                  {searchQuery
                    ? `No equipment matching "${searchQuery}".`
                    : selectedCategory !== "All"
                    ? `No tools currently listed under "${selectedCategory}".`
                    : "The neighborhood tool catalog is currently empty. Be the first to share!"}
                </p>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-5 py-2.5 rounded-full text-white bg-[#181816] hover:bg-black transition shadow-sm"
                >
                  <span>List a Tool</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Bliss Bottom Controls: Index Counter (1/5) & Navigation Arrows */}
            {displayedTools.length > 0 && (
              <div className="flex items-center justify-between mt-8 pt-4 border-t border-[#EAE8E2]">
                <div className="text-sm font-medium text-stone-600 tracking-wider">
                  {Math.min(activeCardIndex + 1, displayedTools.length)} / {displayedTools.length}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleScroll("left")}
                    className="w-10 h-10 rounded-full border border-[#EAE8E2] bg-white hover:bg-stone-100 flex items-center justify-center text-stone-700 transition active:scale-95 shadow-xs"
                    aria-label="Previous items"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleScroll("right")}
                    className="w-10 h-10 rounded-full border border-[#EAE8E2] bg-white hover:bg-stone-100 flex items-center justify-center text-stone-700 transition active:scale-95 shadow-xs"
                    aria-label="Next items"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* GRID VIEW */
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayedTools.map((tool) => (
                <ToolCard
                  key={tool._id}
                  tool={tool}
                  isPublicOnly={true}
                  onRequestBorrow={(t) => setBorrowTool(t)}
                  isFavorited={favoriteIds?.includes(tool._id as any)}
                  onToggleFavorite={handleToggleFavorite}
                  hasPendingRequest={activeRequestedIds?.includes(tool._id as any)}
                />
              ))}
            </div>

            {displayedTools.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[2rem] border border-[#EAE8E2] p-8 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-[#F3F1EC] flex items-center justify-center mx-auto mb-3 text-stone-500">
                  <Wrench className="w-5 h-5" />
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-900">No tools found</h3>
                <p className="text-xs text-stone-500 mt-1 mb-5">
                  {searchQuery
                    ? `No equipment matching "${searchQuery}".`
                    : selectedCategory !== "All"
                    ? `No tools currently listed under "${selectedCategory}".`
                    : "The neighborhood tool catalog is currently empty. Be the first to share!"}
                </p>
                <SignedIn>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-5 py-2.5 rounded-full text-white bg-[#181816] hover:bg-black transition shadow-sm"
                  >
                    <span>List a Tool</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </SignedIn>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-5 py-2.5 rounded-full text-white bg-[#181816] hover:bg-black transition shadow-sm"
                    >
                      <span>List a Tool</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </SignInButton>
                </SignedOut>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Editorial Footer */}
      <footer className="mt-16 border-t border-[#EAE8E2] py-10 bg-[#FAF9F6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <div className="flex items-center space-x-2">
            <span className="font-serif font-bold text-[#181816] text-base">
              Lend<span className="italic font-normal">Loop</span>
            </span>
            <span>&bull;</span>
            <span>Neighborhood Tool Library</span>
          </div>

          <div className="flex items-center space-x-6">
            <Link href="/" className="hover:text-stone-900 transition">
              Catalog
            </Link>
            <Link href="/dashboard" className="hover:text-stone-900 transition">
              Dashboard
            </Link>
            <span>&copy; {new Date().getFullYear()} LendLoop Inc.</span>
          </div>
        </div>
      </footer>

      {/* Direct Borrow Modal on Catalog */}
      {borrowTool && (
        <BorrowModal
          tool={borrowTool}
          onClose={() => setBorrowTool(null)}
          onSuccess={() => setBorrowTool(null)}
        />
      )}
    </div>
  );
}




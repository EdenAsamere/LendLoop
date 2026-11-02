"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Navbar } from "../components/Navbar";
import { ToolCard, PublicTool } from "../components/ToolCard";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import {
  Search,
  Wrench,
  ShieldCheck,
  Leaf,
  Users,
  ArrowRight,
  Filter,
} from "lucide-react";

const CATEGORIES = [
  "All",
  "Power Tools",
  "Hand Tools",
  "Gardening",
  "Woodworking",
  "Automotive",
  "Outdoor & Camping",
  "Cleaning & Maintenance",
];

// Fallback mock tools for pristine rendering when Convex backend is starting up
const FALLBACK_PUBLIC_TOOLS: PublicTool[] = [
  { _id: "1", name: "DeWalt 20V Cordless Drill & Impact Driver", category: "Power Tools", isAvailable: true },
  { _id: "2", name: "Ryobi Electric Pressure Washer 2000 PSI", category: "Cleaning & Maintenance", isAvailable: true },
  { _id: "3", name: "Fiskars Telescopic Tree Pruner", category: "Gardening", isAvailable: true },
  { _id: "4", name: "Bosch Laser Level & Tripod", category: "Power Tools", isAvailable: true },
  { _id: "5", name: "Craftsman 150-Piece Mechanics Tool Set", category: "Hand Tools", isAvailable: true },
  { _id: "6", name: "Kreg Pocket-Hole Jig K4 Master System", category: "Woodworking", isAvailable: true },
  { _id: "7", name: "Coleman 4-Person Instant Cabin Tent", category: "Outdoor & Camping", isAvailable: true },
  { _id: "8", name: "Automotive OBD2 Bluetooth Diagnostic Scanner", category: "Automotive", isAvailable: true },
];

export default function HomePage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Query Convex public endpoint (enforces strict data-minimization: name and category only!)
  const liveTools = useQuery(api.tools.listPublic, {
    category: selectedCategory === "All" ? undefined : selectedCategory,
    search: searchQuery || undefined,
  });

  // Use live tools if loaded; fallback to initial catalog if Convex is initializing
  const displayedTools: PublicTool[] =
    liveTools && liveTools.length > 0
      ? liveTools
      : FALLBACK_PUBLIC_TOOLS.filter((tool) => {
          if (selectedCategory !== "All" && tool.category !== selectedCategory) return false;
          if (searchQuery && !tool.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
          return true;
        });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 via-white to-slate-50/50 py-16 sm:py-24 border-b border-slate-200/60">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
            {/* Tagline Pill */}
            <div className="inline-flex items-center space-x-2 bg-brand-100/80 border border-brand-200/60 px-4 py-1.5 rounded-full text-brand-900 text-xs sm:text-sm font-semibold mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              <span>Neighborhood Tool-Lending Board</span>
            </div>

            {/* Fictional Company Name & Tagline */}
            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight text-balance">
              Lend<span className="text-brand-600">Loop</span>
            </h1>
            <p className="mt-4 text-xl sm:text-2xl text-slate-700 font-medium max-w-2xl mx-auto text-balance">
              Borrow what you need. Lend what you don&apos;t.
            </p>
            <p className="mt-3 text-sm sm:text-base text-slate-500 max-w-xl mx-auto">
              Save money, reduce neighborhood clutter, and share high-quality tools with trusted neighbors powered by automated workflows.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-base px-6 py-3.5 rounded-2xl shadow-lg shadow-brand-600/20 hover:shadow-xl transition">
                    <span>Sign in to lend or borrow</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </SignInButton>
              </SignedOut>

              <SignedIn>
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-base px-6 py-3.5 rounded-2xl shadow-lg shadow-brand-600/20 hover:shadow-xl transition"
                >
                  <span>Go to My Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </SignedIn>

              <a
                href="#tools"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-2xl border border-slate-200 transition"
              >
                Browse Available Tools
              </a>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              <div className="bg-white/80 backdrop-blur p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-start space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Zero Waste</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Why buy a drill used 12 minutes a year? Share locally.
                  </p>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-start space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Data-Minimized</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Public listings expose only tool name and category.
                  </p>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-start space-x-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">n8n Automation</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Automated request alerts & daily overdue reminders.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Public Tool Catalog Section */}
        <section id="tools" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center space-x-1.5 text-xs font-semibold text-brand-700 bg-brand-50 px-3 py-1 rounded-full mb-2">
                <Wrench className="w-3.5 h-3.5" />
                <span>Public Inventory</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Available Neighborhood Tools
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Read-only view showing tool names and categories. Sign in to view owner details and submit a borrow request.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tools by name..."
                className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0 pl-1">
              <Filter className="w-3.5 h-3.5" /> Category:
            </span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-full shrink-0 transition ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Tools Grid (Data-Minimized Public View) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedTools.map((tool) => (
              <ToolCard key={tool._id} tool={tool} isPublicOnly={true} />
            ))}
          </div>

          {displayedTools.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
              <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">No tools found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try selecting a different category or clearing your search.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-slate-900">
              Lend<span className="text-brand-600">Loop</span>
            </span>
            <span>&bull; Neighborhood Tool-Lending Board</span>
          </div>
          <div>
            Built with Next.js (App Router), Clerk, Convex &amp; n8n
          </div>
        </div>
      </footer>
    </div>
  );
}


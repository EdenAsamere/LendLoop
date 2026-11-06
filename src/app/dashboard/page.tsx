"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser, SignInButton } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Navbar } from "../../components/Navbar";
import { ToolCard, AuthenticatedTool } from "../../components/ToolCard";
import { ToolModal } from "../../components/ToolModal";
import { BorrowModal } from "../../components/BorrowModal";
import { RequestList } from "../../components/RequestList";
import { AdminPanel } from "../../components/AdminPanel";
import { ComplianceDesk } from "../../components/ComplianceDesk";
import {
  Wrench,
  Inbox,
  Send,
  PlusCircle,
  ShieldAlert,
  Search,
  Filter,
  Lock,
  Heart,
  Shield,
} from "lucide-react";
import { ALL_CATEGORIES } from "../../lib/constants";
import { getCleanErrorMessage } from "../../lib/utils";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<
    "browse" | "favorites" | "my-listings" | "incoming" | "outgoing" | "admin" | "compliance"
  >("browse");

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [toolToEdit, setToolToEdit] = useState<AuthenticatedTool | null>(null);
  const [borrowTool, setBorrowTool] = useState<AuthenticatedTool | null>(null);

  // Convex Queries & Mutations
  const currentUser = useQuery(api.users.getCurrentUser, user?.id ? { clerkId: user.id } : {});
  const syncUser = useMutation(api.users.syncUser);
  const allTools = useQuery(api.tools.listAll, {
    category: selectedCategory === "All" ? undefined : selectedCategory,
    search: searchQuery || undefined,
  });
  const myTools = useQuery(api.tools.myTools, user?.id ? { clerkId: user.id } : {});
  const myFavorites = useQuery(api.favorites.listMyFavorites, user?.id ? { clerkId: user.id } : {});
  const favoriteIds = useQuery(api.favorites.listMyFavoriteToolIds, user?.id ? { clerkId: user.id } : {});
  const activeRequestedIds = useQuery(api.requests.myActiveRequestedToolIds, user?.id ? { clerkId: user.id } : {});
  const toggleFavorite = useMutation(api.favorites.toggle);
  const incomingRequests = useQuery(api.requests.incomingRequests, user?.id ? { clerkId: user.id } : {});
  const myRequests = useQuery(api.requests.myRequests, user?.id ? { clerkId: user.id } : {});
  const removeTool = useMutation(api.tools.remove);

  const handleToggleFavorite = async (toolId: string) => {
    if (!user) return;
    try {
      await toggleFavorite({ toolId: toolId as any, clerkId: user.id });
    } catch (err: any) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  // Sync tab with ?tab= query parameter if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (
        tab === "browse" ||
        tab === "favorites" ||
        tab === "my-listings" ||
        tab === "incoming" ||
        tab === "outgoing" ||
        tab === "admin" ||
        tab === "compliance"
      ) {
        setActiveTab(tab as any);
      }
    }
  }, []);

  // Sync Clerk profile to Convex
  useEffect(() => {
    if (isLoaded && user) {
      const email = user.primaryEmailAddress?.emailAddress || "";
      const name = user.fullName || user.firstName || email.split("@")[0] || "Neighbor";
      syncUser({
        clerkId: user.id,
        name,
        email,
        imageUrl: user.imageUrl || undefined,
      }).catch(console.error);
    }
  }, [isLoaded, user, syncUser]);

  const handleEditTool = (tool: AuthenticatedTool) => {
    setToolToEdit(tool);
    setIsToolModalOpen(true);
  };

  const handleDeleteTool = async (toolId: string) => {
    if (window.confirm("Are you sure you want to remove this tool listing?")) {
      try {
        await removeTool({ toolId: toolId as any, clerkId: user?.id });
      } catch (err: any) {
        alert(getCleanErrorMessage(err));
      }
    }
  };

  const handleCloseToolModal = () => {
    setIsToolModalOpen(false);
    setToolToEdit(null);
  };

  if (isLoaded && !user) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#181816]">
        <Navbar />
        <main className="flex-1 max-w-lg mx-auto px-4 py-24 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#F3F1EC] border border-[#EAE8E2] flex items-center justify-center mb-6 text-stone-800 shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-2 block">
            Member Access Only
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-stone-900 tracking-tight mb-3">
            Sign In to LendLoop
          </h1>
          <p className="text-sm text-stone-600 mb-8 max-w-sm leading-relaxed">
            Please sign in to list a tool, manage your incoming and outgoing borrow requests, and access the neighborhood library.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
            <SignInButton mode="modal">
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#181816] hover:bg-black text-white text-xs font-semibold px-6 py-3 rounded-full shadow-sm hover:shadow transition">
                <span>Sign In to Continue</span>
              </button>
            </SignInButton>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center text-xs font-medium px-5 py-3 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100 transition"
            >
              Browse Public Catalog
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#181816]">
      <Navbar onOpenListModal={() => setIsToolModalOpen(true)} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-stone-400 block mb-1">
              Member Workspace
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#181816] tracking-tight">
              Neighborhood Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Welcome back,{" "}
              <span className="font-semibold text-stone-800">
                {currentUser?.name || user?.fullName || "Neighbor"}
              </span>
              {currentUser?.isTrustedLender && (
                <span className="ml-2 inline-flex items-center text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2.5 py-0.5 rounded-full">
                  ★ Trusted Lender
                </span>
              )}
            </p>
          </div>

          <button
            onClick={() => {
              setToolToEdit(null);
              setIsToolModalOpen(true);
            }}
            className="inline-flex items-center justify-center space-x-2 bg-[#181816] hover:bg-black text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-sm hover:shadow transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List a Tool</span>
          </button>
        </div>

        {/* Navigation Tabs (Bliss Pill Styling) */}
        <div className="flex items-center space-x-2 border-b border-[#EAE8E2] pb-4 mb-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("browse")}
            className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-medium px-4 py-2 rounded-full transition-all shrink-0 ${
              activeTab === "browse"
                ? "bg-[#181816] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-[#F3F1EC]"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Browse Library</span>
          </button>

          <button
            onClick={() => setActiveTab("favorites")}
            className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-medium px-4 py-2 rounded-full transition-all shrink-0 ${
              activeTab === "favorites"
                ? "bg-[#181816] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-[#F3F1EC]"
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                activeTab === "favorites"
                  ? "fill-white text-white"
                  : "text-rose-500 fill-rose-500"
              }`}
            />
            <span>Favorites ({myFavorites?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("my-listings")}
            className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-medium px-4 py-2 rounded-full transition-all shrink-0 ${
              activeTab === "my-listings"
                ? "bg-[#181816] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-[#F3F1EC]"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>My Listings ({myTools?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("incoming")}
            className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-medium px-4 py-2 rounded-full transition-all shrink-0 ${
              activeTab === "incoming"
                ? "bg-[#181816] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-[#F3F1EC]"
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Incoming Requests ({incomingRequests?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("outgoing")}
            className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-medium px-4 py-2 rounded-full transition-all shrink-0 ${
              activeTab === "outgoing"
                ? "bg-[#181816] text-white shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-[#F3F1EC]"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>My Requests ({myRequests?.length || 0})</span>
          </button>

          {(currentUser?.role === "moderator" || currentUser?.role === "admin") && (
            <button
              onClick={() => setActiveTab("compliance")}
              className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-full transition-all shrink-0 ${
                activeTab === "compliance"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Compliance & Safety Desk</span>
            </button>
          )}

          {currentUser?.role === "admin" && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-full transition-all shrink-0 ${
                activeTab === "admin"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Center</span>
            </button>
          )}
        </div>

        {/* TAB 1: BROWSE TOOLS (AUTHENTICATED) */}
        {activeTab === "browse" && (
          <div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
              {/* Category Pills */}
              <div className="flex items-center space-x-2 overflow-x-auto w-full pb-2 no-scrollbar">
                {ALL_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs font-medium px-4 py-1.5 rounded-full shrink-0 transition ${
                      selectedCategory === cat
                        ? "bg-[#181816] text-white shadow-sm"
                        : "bg-white text-stone-600 border border-[#EAE8E2] hover:bg-stone-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-72 shrink-0">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tools..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-full border border-[#EAE8E2] bg-white text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>
            </div>

            {/* Authenticated Tool Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {allTools?.map((tool: any) => (
                <ToolCard
                  key={tool._id}
                  tool={tool as AuthenticatedTool}
                  isPublicOnly={false}
                  onRequestBorrow={(t) => setBorrowTool(t)}
                  onEdit={handleEditTool}
                  onDelete={handleDeleteTool}
                  isOwner={tool.owner?._id === currentUser?._id}
                  isAdmin={currentUser?.role === "admin"}
                  isFavorited={favoriteIds?.includes(tool._id as any)}
                  onToggleFavorite={handleToggleFavorite}
                  hasPendingRequest={activeRequestedIds?.includes(tool._id as any)}
                />
              ))}
            </div>

            {allTools && allTools.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-[#EAE8E2] p-8">
                <p className="text-sm font-semibold text-stone-800">No tools found</p>
                <p className="text-xs text-stone-500 mt-1">
                  Be the first to list a tool in this category!
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB: SAVED FAVORITES */}
        {activeTab === "favorites" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-stone-900">Your Saved Favorites</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Tools you&apos;ve saved for quick access and upcoming neighborhood projects.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {myFavorites?.map((tool: any) => (
                <ToolCard
                  key={tool._id}
                  tool={tool as AuthenticatedTool}
                  isPublicOnly={false}
                  onRequestBorrow={(t) => setBorrowTool(t)}
                  onEdit={handleEditTool}
                  onDelete={handleDeleteTool}
                  isOwner={tool.owner?._id === currentUser?._id}
                  isAdmin={currentUser?.role === "admin"}
                  isFavorited={true}
                  onToggleFavorite={handleToggleFavorite}
                  hasPendingRequest={activeRequestedIds?.includes(tool._id as any)}
                />
              ))}
            </div>

            {myFavorites && myFavorites.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-[#EAE8E2] p-8 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-3 text-rose-500">
                  <Heart className="w-5 h-5 fill-rose-500 text-rose-500" />
                </div>
                <p className="text-sm font-semibold text-stone-800">No favorite tools saved yet</p>
                <p className="text-xs text-stone-500 mt-1 mb-5">
                  Click the heart icon on any tool card in the catalog or library to save it here.
                </p>
                <button
                  onClick={() => setActiveTab("browse")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-5 py-2.5 rounded-full text-white bg-[#181816] hover:bg-black transition shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Explore Library</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY LISTINGS */}
        {activeTab === "my-listings" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif text-xl font-bold text-stone-900">Tools You Are Lending</h3>
              <button
                onClick={() => {
                  setToolToEdit(null);
                  setIsToolModalOpen(true);
                }}
                className="text-xs font-semibold text-stone-900 bg-[#F3F1EC] hover:bg-stone-200 px-4 py-2 rounded-full transition"
              >
                + Add Another Tool
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {myTools?.map((tool: any) => (
                <ToolCard
                  key={tool._id}
                  tool={{
                    ...tool,
                    owner: {
                      _id: currentUser?._id || "",
                      name: currentUser?.name || "You",
                      imageUrl: currentUser?.imageUrl,
                      isTrustedLender: currentUser?.isTrustedLender,
                    },
                  } as AuthenticatedTool}
                  isPublicOnly={false}
                  onEdit={handleEditTool}
                  onDelete={handleDeleteTool}
                  isOwner={true}
                  isFavorited={favoriteIds?.includes(tool._id as any)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>

            {myTools && myTools.length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl border border-[#EAE8E2] p-8">
                <p className="text-sm font-bold text-stone-800">
                  You haven&apos;t listed any tools yet
                </p>
                <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto mb-5">
                  Help out your neighborhood! List power tools, lawn mowers, ladders, or camping gear.
                </p>
                <button
                  onClick={() => setIsToolModalOpen(true)}
                  className="px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-[#181816] hover:bg-black transition shadow-sm"
                >
                  List Your First Tool
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: INCOMING REQUESTS */}
        {activeTab === "incoming" && (
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-6">
              Requests from Neighbors for Your Tools
            </h3>
            <RequestList requests={incomingRequests as any} type="incoming" />
          </div>
        )}

        {/* TAB 4: MY REQUESTS (OUTGOING) */}
        {activeTab === "outgoing" && (
          <div>
            <h3 className="font-serif text-xl font-bold text-stone-900 mb-6">
              Your Borrow Requests
            </h3>
            <RequestList requests={myRequests as any} type="outgoing" />
          </div>
        )}

        {/* TAB 5: ADMIN CENTER */}
        {activeTab === "admin" && currentUser?.role === "admin" && (
          <div>
            <AdminPanel />
          </div>
        )}

        {/* TAB 6: COMPLIANCE & SAFETY DESK */}
        {activeTab === "compliance" &&
          (currentUser?.role === "moderator" || currentUser?.role === "admin") && (
            <div>
              <ComplianceDesk />
            </div>
          )}
      </main>

      {/* Tool Listing / Edit Modal */}
      {isToolModalOpen && (
        <ToolModal
          toolToEdit={toolToEdit}
          onClose={handleCloseToolModal}
        />
      )}

      {/* Borrow Request Modal */}
      {borrowTool && (
        <BorrowModal
          tool={borrowTool}
          onClose={() => setBorrowTool(null)}
          onSuccess={() => setActiveTab("outgoing")}
        />
      )}
    </div>
  );
}


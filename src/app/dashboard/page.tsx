"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Navbar } from "../../components/Navbar";
import { ToolCard, AuthenticatedTool } from "../../components/ToolCard";
import { ToolModal } from "../../components/ToolModal";
import { BorrowModal } from "../../components/BorrowModal";
import { RequestList } from "../../components/RequestList";
import { AdminPanel } from "../../components/AdminPanel";
import {
  Wrench,
  Inbox,
  Send,
  PlusCircle,
  ShieldAlert,
  Search,
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

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<
    "browse" | "my-listings" | "incoming" | "outgoing" | "admin"
  >("browse");

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [toolToEdit, setToolToEdit] = useState<AuthenticatedTool | null>(null);
  const [borrowTool, setBorrowTool] = useState<AuthenticatedTool | null>(null);

  // Convex Queries & Mutations
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const syncUser = useMutation(api.users.syncUser);
  const allTools = useQuery(api.tools.listAll, {
    category: selectedCategory === "All" ? undefined : selectedCategory,
    search: searchQuery || undefined,
  });
  const myTools = useQuery(api.tools.myTools, {});
  const incomingRequests = useQuery(api.requests.incomingRequests, {});
  const myRequests = useQuery(api.requests.myRequests, {});
  const removeTool = useMutation(api.tools.remove);

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
        await removeTool({ toolId: toolId as any });
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleCloseToolModal = () => {
    setIsToolModalOpen(false);
    setToolToEdit(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <Navbar onOpenListModal={() => setIsToolModalOpen(true)} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Neighborhood Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Welcome back,{" "}
              <span className="font-semibold text-slate-800">
                {currentUser?.name || user?.fullName || "Neighbor"}
              </span>
              {currentUser?.isTrustedLender && (
                <span className="ml-2 inline-flex items-center text-xs font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full">
                  Trusted Lender
                </span>
              )}
            </p>
          </div>

          <button
            onClick={() => {
              setToolToEdit(null);
              setIsToolModalOpen(true);
            }}
            className="inline-flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>List a Tool to Lend</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 sm:space-x-2 border-b border-slate-200 pb-3 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("browse")}
            className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition shrink-0 ${
              activeTab === "browse"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Browse All Tools</span>
          </button>

          <button
            onClick={() => setActiveTab("my-listings")}
            className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition shrink-0 ${
              activeTab === "my-listings"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>My Listings ({myTools?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("incoming")}
            className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition shrink-0 ${
              activeTab === "incoming"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Incoming Requests ({incomingRequests?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab("outgoing")}
            className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition shrink-0 ${
              activeTab === "outgoing"
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Send className="w-4 h-4" />
            <span>My Requests ({myRequests?.length || 0})</span>
          </button>

          {currentUser?.role === "admin" && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition shrink-0 ${
                activeTab === "admin"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200"
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Admin Center</span>
            </button>
          )}
        </div>

        {/* TAB 1: BROWSE TOOLS (AUTHENTICATED) */}
        {activeTab === "browse" && (
          <div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
              {/* Category Pills */}
              <div className="flex items-center space-x-2 overflow-x-auto w-full pb-2 scrollbar-none">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                  <Filter className="w-3.5 h-3.5" /> Category:
                </span>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full shrink-0 transition ${
                      selectedCategory === cat
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tools..."
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                />
              ))}
            </div>

            {allTools && allTools.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
                <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No tools found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Be the first to list a tool in this category!
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY LISTINGS */}
        {activeTab === "my-listings" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-slate-900">Tools You Are Lending</h3>
              <button
                onClick={() => {
                  setToolToEdit(null);
                  setIsToolModalOpen(true);
                }}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1.5 rounded-lg border border-brand-200"
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
                />
              ))}
            </div>

            {myTools && myTools.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
                <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">
                  You haven&apos;t listed any tools yet
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
                  Help out your neighborhood! List power tools, lawn mowers, ladders, or camping gear.
                </p>
                <button
                  onClick={() => setIsToolModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 transition"
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
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Requests from Neighbors for Your Tools
            </h3>
            <RequestList requests={incomingRequests as any} type="incoming" />
          </div>
        )}

        {/* TAB 4: MY REQUESTS (OUTGOING) */}
        {activeTab === "outgoing" && (
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-4">
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

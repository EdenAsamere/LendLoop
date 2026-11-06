"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Heart, Clock, Wrench, ShieldCheck, AlertTriangle } from "lucide-react";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";

export interface PublicTool {
  _id: string;
  name: string;
  category: string;
  isAvailable: boolean;
  imageUrl?: string;
  isCertified?: boolean;
}

export interface AuthenticatedTool extends PublicTool {
  condition?: "Brand New" | "Like New" | "Good" | "Fair";
  description?: string;
  isCertified?: boolean;
  certifiedBy?: string;
  certifiedAt?: number;
  safetyNotes?: string;
  isFlagged?: boolean;
  flagReason?: string;
  owner?: {
    _id: string;
    name: string;
    imageUrl?: string;
    isTrustedLender?: boolean;
  } | null;
  createdAt?: number;
}

interface ToolCardProps {
  tool: AuthenticatedTool | PublicTool;
  isPublicOnly?: boolean;
  onRequestBorrow?: (tool: AuthenticatedTool | PublicTool) => void;
  onEdit?: (tool: AuthenticatedTool) => void;
  onDelete?: (toolId: string) => void;
  isOwner?: boolean;
  isAdmin?: boolean;
  isFavorited?: boolean;
  onToggleFavorite?: (toolId: string) => void;
  hasPendingRequest?: boolean;
}

export function ToolCard({
  tool,
  isPublicOnly = false,
  onRequestBorrow,
  onEdit,
  onDelete,
  isOwner = false,
  isAdmin = false,
  isFavorited = false,
  onToggleFavorite,
  hasPendingRequest = false,
}: ToolCardProps) {
  const fullTool = tool as AuthenticatedTool;
  const imageUrl = tool.imageUrl?.trim();

  return (
    <div className="flex flex-col group select-none">
      {/* Tall Vertical Rounded Showcase Card (Bliss Inspo) */}
      <div className="relative aspect-[3/4.2] sm:aspect-[3/4.4] w-full rounded-[2.2rem] overflow-hidden bg-[#ECEAE3] shadow-[0_4px_20px_rgba(0,0,0,0.03)] group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.08)] transition-all duration-500">
        {/* Dynamic Image or Minimalist Architectural Placeholder */}
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={tool.name}
            fill
            unoptimized={true}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover w-full h-full transform group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#ECEAE3] via-[#E4E1D7] to-[#DDD8CD] p-6 text-center select-none">
            <div className="w-16 h-16 rounded-full bg-white/80 backdrop-blur-sm border border-white/60 flex items-center justify-center text-stone-700 shadow-xs mb-3 group-hover:scale-105 transition-transform duration-500">
              <Wrench className="w-7 h-7 text-stone-600 stroke-[1.5]" />
            </div>
            <span className="font-serif text-stone-800 text-sm font-semibold tracking-wide line-clamp-2 px-2">
              {tool.name}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 mt-1">
              {tool.category}
            </span>
          </div>
        )}

        {/* Subtle Top-Left Category & Safety Badges */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1 items-start">
          <span className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md text-white text-[11px] font-medium tracking-wide border border-white/10">
            {tool.category}
          </span>
          {fullTool.isCertified && (
            <span
              className="px-2.5 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-[10px] font-bold tracking-wide border border-emerald-400/30 flex items-center gap-1 shadow-xs"
              title={fullTool.safetyNotes ? `Safety Guidelines: ${fullTool.safetyNotes}` : "Certified Safe for Community Lending"}
            >
              <ShieldCheck className="w-3 h-3 text-white" />
              <span>Safety Certified</span>
            </span>
          )}
          {fullTool.isFlagged && (
            <span
              className="px-2.5 py-1 rounded-full bg-rose-600/90 backdrop-blur-md text-white text-[10px] font-bold tracking-wide border border-rose-400/30 flex items-center gap-1 shadow-xs"
              title={fullTool.flagReason ? `Reason: ${fullTool.flagReason}` : "Safety inspection pending"}
            >
              <AlertTriangle className="w-3 h-3 text-white" />
              <span>Safety Freeze</span>
            </span>
          )}
        </div>

        {/* Top-Right Circular Button */}
        <div className="absolute top-4 right-4 z-10">
          <SignedIn>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite && onToggleFavorite(tool._id);
              }}
              className={`w-10 h-10 rounded-full backdrop-blur-md shadow-sm flex items-center justify-center transition-all duration-200 active:scale-90 ${
                isFavorited
                  ? "bg-white text-rose-500 shadow-md ring-1 ring-rose-200"
                  : "bg-white/80 text-stone-700 hover:bg-white hover:text-rose-500 hover:scale-105"
              }`}
              aria-label={isFavorited ? "Remove from favorites" : "Save to favorites"}
              title={isFavorited ? "Remove from favorites" : "Save to favorites"}
            >
              <Heart
                className={`w-4 h-4 transition-transform duration-200 ${
                  isFavorited
                    ? "fill-rose-500 text-rose-500 scale-110"
                    : "text-stone-700 hover:text-rose-500"
                }`}
              />
            </button>
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <button
                type="button"
                className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md text-stone-700 shadow-sm flex items-center justify-center hover:bg-white hover:text-rose-500 hover:scale-105 transition active:scale-90"
                aria-label="Save to favorites"
                title="Sign in to save to favorites"
              >
                <Heart className="w-4 h-4 text-stone-700 hover:text-rose-500 transition-colors" />
              </button>
            </SignInButton>
          </SignedOut>
        </div>

        {/* Bottom Frosted Glass Overlay Card (Identical to Bliss Card 2) */}
        <div className="absolute bottom-3 inset-x-3 z-10 rounded-[1.6rem] bg-white/80 backdrop-blur-md p-4 border border-white/60 shadow-lg flex items-center justify-between gap-3 transition-transform group-hover:-translate-y-1 duration-300">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-stone-900 text-sm sm:text-base leading-tight truncate">
              {tool.name}
            </h3>
            <p className="text-xs text-stone-500 truncate mt-1">
              {isPublicOnly
                ? `${tool.category} • Neighborhood Share`
                : fullTool.owner?.name
                ? `Lender: ${fullTool.owner.name} ${fullTool.owner.isTrustedLender ? "★" : ""}`
                : `${fullTool.condition || "Good"} condition`}
            </p>
          </div>

          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite && onToggleFavorite(tool._id);
            }}
            className={`w-8 h-8 rounded-full bg-white shadow-xs flex items-center justify-center cursor-pointer transition active:scale-90 ${
              isFavorited ? "text-rose-500 ring-1 ring-rose-200" : "text-stone-400 hover:text-rose-500"
            }`}
            title={isFavorited ? "Saved to favorites" : "Save to favorites"}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isFavorited ? "fill-rose-500 text-rose-500 scale-110" : "text-stone-400"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Bottom Action Bar (Identical to Bliss below-card row) */}
      <div className="mt-3.5 flex items-center justify-between gap-2 px-1">
        {/* Left: Action Pill Button with Diagonal Arrow */}
        {isPublicOnly ? (
          <>
            {fullTool.isFlagged ? (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold px-4 py-2.5 rounded-full cursor-not-allowed shadow-2xs"
                title={`Safety Review Pending: ${fullTool.flagReason || "Under review by Compliance Steward"}`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Safety Review</span>
              </button>
            ) : hasPendingRequest ? (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 bg-[#F3F1EC] text-amber-700 border border-amber-200 text-xs font-semibold px-4 py-2.5 rounded-full cursor-not-allowed shadow-2xs"
                title="You already have a pending or active request for this tool"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Requested</span>
              </button>
            ) : (
              <SignedIn>
                <button
                  type="button"
                  onClick={() => onRequestBorrow && onRequestBorrow(tool)}
                  className="inline-flex items-center gap-2 bg-[#181816] hover:bg-black text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-sm hover:shadow transition group/btn"
                >
                  <span>Borrow</span>
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              </SignedIn>
            )}
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 bg-[#181816] hover:bg-black text-white text-xs font-semibold px-5 py-2.5 rounded-full shadow-sm hover:shadow transition group/btn"
                >
                  <span>Borrow</span>
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </button>
              </SignInButton>
            </SignedOut>
          </>
        ) : isOwner || isAdmin ? (
          <div className="flex items-center gap-1.5">
            {onEdit && (
              <button
                onClick={() => onEdit(fullTool)}
                className="text-xs font-medium bg-[#F3F1EC] hover:bg-stone-200 text-stone-800 px-3.5 py-2 rounded-full transition"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(tool._id)}
                className="text-xs font-medium text-rose-600 hover:bg-rose-50 px-3.5 py-2 rounded-full transition"
              >
                Delete
              </button>
            )}
          </div>
        ) : fullTool.isFlagged ? (
          <button
            disabled
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 cursor-not-allowed shadow-2xs"
            title={`Under Safety Review: ${fullTool.flagReason || "Frozen for safety check"}`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>Safety Review</span>
          </button>
        ) : hasPendingRequest ? (
          <button
            disabled
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-full bg-[#F3F1EC] text-amber-700 border border-amber-200 cursor-not-allowed shadow-2xs"
            title="You already have an active or pending request for this tool"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Requested</span>
          </button>
        ) : (
          <button
            disabled={!tool.isAvailable}
            onClick={() => onRequestBorrow && onRequestBorrow(fullTool)}
            className={`inline-flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-full shadow-sm transition group/btn ${
              tool.isAvailable
                ? "bg-[#181816] hover:bg-black text-white"
                : "bg-stone-200 text-stone-400 cursor-not-allowed"
            }`}
          >
            <span>{tool.isAvailable ? "Request" : "On Loan"}</span>
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </button>
        )}

        {/* Right: Status / Price Pill (like Bliss £55 / £133 pill) */}
        <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#EAE8E2] bg-white text-stone-800 text-xs font-semibold shadow-xs">
          {tool.isAvailable ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Available</span>
            </>
          ) : (
            <>
              <Clock className="w-3 h-3 text-stone-400" />
              <span>On Loan</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}



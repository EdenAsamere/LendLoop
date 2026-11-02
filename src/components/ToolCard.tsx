"use client";

import { Wrench, ShieldCheck, Calendar, Lock } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";

export interface PublicTool {
  _id: string;
  name: string;
  category: string;
  isAvailable: boolean;
}

export interface AuthenticatedTool extends PublicTool {
  condition?: "Brand New" | "Like New" | "Good" | "Fair";
  description?: string;
  imageUrl?: string;
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
  onRequestBorrow?: (tool: AuthenticatedTool) => void;
  onEdit?: (tool: AuthenticatedTool) => void;
  onDelete?: (toolId: string) => void;
  isOwner?: boolean;
  isAdmin?: boolean;
}

export function ToolCard({
  tool,
  isPublicOnly = false,
  onRequestBorrow,
  onEdit,
  onDelete,
  isOwner = false,
  isAdmin = false,
}: ToolCardProps) {
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "power tools":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "gardening":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "woodworking":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "hand tools":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "automotive":
        return "bg-slate-100 text-slate-800 border-slate-200";
      case "outdoor & camping":
        return "bg-teal-100 text-teal-800 border-teal-200";
      default:
        return "bg-purple-100 text-purple-800 border-purple-200";
    }
  };

  const fullTool = tool as AuthenticatedTool;

  // ---------------------------------------------------------------------------
  // PUBLIC VIEW: Strictly Data-Minimized
  // "Show a read-only list of available tools (name and category only, no owner details)"
  // ---------------------------------------------------------------------------
  if (isPublicOnly) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group">
        <div>
          <div className="flex items-start justify-between gap-2 mb-3">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getCategoryColor(
                tool.category
              )}`}
            >
              {tool.category}
            </span>
            <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Available
            </span>
          </div>

          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition">
              <Wrench className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg line-clamp-1">
              {tool.name}
            </h3>
          </div>
        </div>

        {/* Data-Minimization Notice & Sign In CTA */}
        <div className="pt-4 border-t border-slate-100 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Owner hidden
            </span>
            <SignInButton mode="modal">
              <button className="text-xs font-semibold text-brand-600 hover:text-brand-700 hover:underline">
                Sign in to borrow &rarr;
              </button>
            </SignInButton>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // AUTHENTICATED VIEW: Full tool details, owner profile, badges, and actions
  // ---------------------------------------------------------------------------
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
      <div>
        {/* Top Badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getCategoryColor(
              tool.category
            )}`}
          >
            {tool.category}
          </span>
          <div className="flex items-center gap-1.5">
            {fullTool.condition && (
              <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                {fullTool.condition}
              </span>
            )}
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                tool.isAvailable
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {tool.isAvailable ? "Available" : "On Loan"}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-900 text-lg mb-2">{tool.name}</h3>

        {/* Description */}
        {fullTool.description && (
          <p className="text-xs text-slate-600 line-clamp-2 mb-4">
            {fullTool.description}
          </p>
        )}

        {/* Owner Details */}
        {fullTool.owner && (
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs">
                {fullTool.owner.name.charAt(0)}
              </div>
              <div className="text-left">
                <span className="text-xs font-medium text-slate-800 block leading-tight">
                  {fullTool.owner.name}
                </span>
                <span className="text-[10px] text-slate-400">Neighbor</span>
              </div>
            </div>
            {fullTool.owner.isTrustedLender && (
              <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 mr-0.5" /> Trusted
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {isOwner || isAdmin ? (
          <div className="flex items-center space-x-2 w-full">
            {onEdit && (
              <button
                onClick={() => onEdit(fullTool)}
                className="flex-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 rounded-lg transition"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(tool._id)}
                className="text-xs font-medium text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition"
              >
                Delete
              </button>
            )}
          </div>
        ) : (
          <button
            disabled={!tool.isAvailable}
            onClick={() => onRequestBorrow && onRequestBorrow(fullTool)}
            className={`w-full text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-1.5 transition shadow-sm ${
              tool.isAvailable
                ? "bg-brand-600 hover:bg-brand-700 text-white"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{tool.isAvailable ? "Request to Borrow" : "Currently Borrowed"}</span>
          </button>
        )}
      </div>
    </div>
  );
}


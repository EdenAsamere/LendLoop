"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthenticatedTool, PublicTool } from "./ToolCard";
import { useUser, SignInButton } from "@clerk/nextjs";
import { X, Calendar, MessageSquare, AlertCircle, CheckCircle2, Lock, Clock } from "lucide-react";
import { getCleanErrorMessage } from "../lib/utils";

interface BorrowModalProps {
  tool: AuthenticatedTool | PublicTool | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BorrowModal({ tool, onClose, onSuccess }: BorrowModalProps) {
  const { user } = useUser();
  const syncUser = useMutation(api.users.syncUser);
  const createBorrowRequest = useMutation(api.requests.create);
  const activeRequestedIds = useQuery(
    api.requests.myActiveRequestedToolIds,
    user?.id ? { clerkId: user.id } : {}
  );
  const alreadyRequested = !!(
    activeRequestedIds &&
    tool &&
    activeRequestedIds.includes(tool._id as any)
  );

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultStart = tomorrow.toISOString().split("T")[0];

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 4);
  const defaultEnd = nextWeek.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!tool) return null;

  const calculateDays = () => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff + 1 : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("Please sign in to request to borrow this item.");
      return;
    }

    if (alreadyRequested) {
      setError("You already have an active or pending request for this item.");
      return;
    }

    const s = new Date(startDate);
    const eDate = new Date(endDate);

    if (eDate < s) {
      setError("Return date must be on or after start date.");
      return;
    }

    try {
      setIsSubmitting(true);
      const email = user.primaryEmailAddress?.emailAddress || "";
      const userName = user.fullName || user.firstName || email.split("@")[0] || "Neighbor";
      await syncUser({
        clerkId: user.id,
        name: userName,
        email,
        imageUrl: user.imageUrl || undefined,
      }).catch(console.error);

      await createBorrowRequest({
        toolId: tool._id as any,
        startDate,
        endDate,
        notes: notes || undefined,
        clerkId: user.id,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(getCleanErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = calculateDays();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
      <div className="bg-[#FAF9F6] rounded-[2rem] max-w-lg w-full p-8 shadow-2xl border border-[#EAE8E2] relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-stone-400 hover:text-stone-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400 block mb-1">
            Community Loan Request
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#181816]">
            Request &ldquo;{tool.name}&rdquo;
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            {"owner" in tool && (tool as any).owner?.name
              ? `Offered by ${(tool as any).owner.name}`
              : `Category: ${tool.category} • Neighborhood Share`}
          </p>
        </div>

        {!user ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#F3F1EC] border border-[#EAE8E2] flex items-center justify-center mx-auto text-stone-800">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-serif text-xl font-bold text-stone-900">
                Sign In Required
              </h3>
              <p className="text-xs text-stone-500 max-w-xs mx-auto mt-1 leading-relaxed">
                Please sign in to your LendLoop account to request to borrow{" "}
                <span className="font-semibold text-stone-800">&ldquo;{tool.name}&rdquo;</span>.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#181816] hover:bg-black text-white text-xs font-semibold px-6 py-3 rounded-full shadow-sm hover:shadow transition"
                >
                  <span>Sign In to Request</span>
                </button>
              </SignInButton>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto text-xs font-medium px-5 py-3 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-100 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : isSuccess ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3 animate-bounce" />
            <h3 className="font-serif text-xl font-bold text-stone-900">Request Dispatched</h3>
            <p className="text-xs text-stone-500 mt-1">
              The lender has been notified via automated workflow.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {alreadyRequested && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>You already have a pending or active borrow request for this item.</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="flex-1 font-medium">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    disabled={alreadyRequested}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs border border-[#EAE8E2] rounded-full px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Return Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    disabled={alreadyRequested}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs border border-[#EAE8E2] rounded-full px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#F3F1EC] rounded-2xl p-4 flex items-center justify-between text-xs text-stone-700 border border-[#EAE8E2]">
              <span className="flex items-center gap-2 font-medium">
                <Calendar className="w-4 h-4 text-stone-700" /> Loan Duration:
              </span>
              <span className="font-bold text-stone-900">
                {days} {days === 1 ? "day" : "days"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Note for the Lender (Optional)
              </label>
              <textarea
                rows={3}
                disabled={alreadyRequested}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Hi! What project are you tackling? When can you pick it up?"
                className="w-full text-xs border border-[#EAE8E2] rounded-2xl p-3.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 resize-none bg-white disabled:opacity-60"
              />
            </div>

            <div className="pt-3 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-stone-600 hover:bg-[#F3F1EC] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || alreadyRequested}
                className="px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-[#181816] hover:bg-black disabled:opacity-50 transition shadow-sm"
              >
                {isSubmitting
                  ? "Submitting..."
                  : alreadyRequested
                  ? "Already Requested"
                  : "Send Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}



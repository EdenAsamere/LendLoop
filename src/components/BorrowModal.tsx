"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthenticatedTool } from "./ToolCard";
import { X, Calendar, MessageSquare, AlertCircle, CheckCircle2 } from "lucide-react";

interface BorrowModalProps {
  tool: AuthenticatedTool | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BorrowModal({ tool, onClose, onSuccess }: BorrowModalProps) {
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

  const createBorrowRequest = useMutation(api.requests.create);

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

    const s = new Date(startDate);
    const eDate = new Date(endDate);

    if (eDate < s) {
      setError("Return date must be on or after start date.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createBorrowRequest({
        toolId: tool._id as any,
        startDate,
        endDate,
        notes: notes || undefined,
      });

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to submit borrow request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const days = calculateDays();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
            Borrow Request
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-2">
            Request to Borrow &ldquo;{tool.name}&rdquo;
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Owned by {tool.owner?.name || "a neighbor"}
          </p>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 animate-bounce" />
            <h3 className="text-lg font-bold text-slate-900">Request Sent!</h3>
            <p className="text-xs text-slate-500 mt-1">
              The owner has been notified via automated workflow.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Start Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Return Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Calendar className="w-4 h-4 text-brand-600" /> Loan Duration:
              </span>
              <span className="font-bold text-slate-900">
                {days} {days === 1 ? "day" : "days"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Note for the Owner (Optional)
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Hi! What project are you working on? When can you pick it up?"
                className="w-full text-xs border border-slate-300 rounded-xl p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 transition shadow-sm"
              >
                {isSubmitting ? "Submitting..." : "Send Borrow Request"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


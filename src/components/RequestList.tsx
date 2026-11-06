"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { formatDate, isOverdue, getDaysOverdue, getCleanErrorMessage } from "../lib/utils";
import {
  Calendar,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Clock,
  User,
} from "lucide-react";

interface RequestItem {
  _id: string;
  toolId: string;
  toolName: string;
  toolCategory: string;
  borrowerName: string;
  borrowerEmail: string;
  ownerName: string;
  ownerEmail: string;
  startDate: string;
  endDate: string;
  status: "pending" | "approved" | "rejected" | "returned" | "cancelled";
  notes?: string;
  lastRemindedAt?: number;
  reminderCount?: number;
  createdAt: number;
}

interface RequestListProps {
  requests: RequestItem[] | undefined;
  type: "incoming" | "outgoing";
  onRefetch?: () => void;
}

export function RequestList({ requests, type }: RequestListProps) {
  const { user } = useUser();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const updateStatus = useMutation(api.requests.updateStatus);

  const handleAction = async (requestId: string, status: "approved" | "rejected" | "returned" | "cancelled") => {
    try {
      setProcessingId(requestId);
      await updateStatus({
        requestId: requestId as any,
        status,
        clerkId: user?.id,
      });
    } catch (err: any) {
      alert(getCleanErrorMessage(err));
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string, endDate: string) => {
    const overdue = isOverdue(endDate, status);

    if (overdue) {
      const days = getDaysOverdue(endDate);
      return (
        <span className="inline-flex items-center space-x-1 text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-1 rounded-full animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Overdue ({days}d)</span>
        </span>
      );
    }

    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Active Loan</span>
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Approval</span>
          </span>
        );
      case "returned":
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-1 rounded-full">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Returned</span>
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 px-2.5 py-1 rounded-full">
            <XCircle className="w-3.5 h-3.5" />
            <span>Declined</span>
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-full">
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] border border-[#EAE8E2] p-12 text-center">
        <Clock className="w-10 h-10 text-stone-300 mx-auto mb-3" />
        <h3 className="font-serif text-lg font-bold text-stone-800">
          {type === "incoming" ? "No incoming borrow requests" : "No active borrow requests"}
        </h3>
        <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
          {type === "incoming"
            ? "When neighbors request to borrow your listed tools, they will appear here with approve/decline controls."
            : "Browse available neighborhood tools and submit a request to start borrowing."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((req) => {
        const isCurrentlyProcessing = processingId === req._id;
        const overdue = isOverdue(req.endDate, req.status);

        return (
          <div
            key={req._id}
            className={`bg-white rounded-[1.8rem] border p-6 shadow-xs transition ${
              overdue ? "border-rose-300 bg-rose-50/20" : "border-[#EAE8E2]"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EAE8E2]">
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-serif font-bold text-stone-900 text-lg">{req.toolName}</h4>
                  <span className="text-[11px] font-medium bg-[#F3F1EC] text-stone-700 px-2.5 py-0.5 rounded-full">
                    {req.toolCategory}
                  </span>
                </div>
                <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-1">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  {type === "incoming" ? (
                    <>
                      Borrower: <span className="font-medium text-stone-800">{req.borrowerName}</span>
                    </>
                  ) : (
                    <>
                      Lender: <span className="font-medium text-stone-800">{req.ownerName}</span>
                    </>
                  )}
                </p>
              </div>

              <div>{getStatusBadge(req.status, req.endDate)}</div>
            </div>

            {/* Details Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4 text-xs text-stone-600">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-stone-700 shrink-0" />
                <span>
                  <strong>Loan Period:</strong> {formatDate(req.startDate)} &rarr;{" "}
                  {formatDate(req.endDate)}
                </span>
              </div>

              {req.reminderCount && req.reminderCount > 0 ? (
                <div className="text-xs text-amber-800 font-medium bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  Automated Overdue Reminders: <strong>{req.reminderCount} sent</strong>
                </div>
              ) : null}
            </div>

            {req.notes && (
              <div className="p-3.5 bg-[#FAF9F6] rounded-2xl text-xs text-stone-700 mb-3 border border-[#EAE8E2]">
                <span className="font-semibold text-stone-900">Note: </span>
                {req.notes}
              </div>
            )}

            {/* Actions for Owners & Borrowers */}
            <div className="pt-2 flex items-center justify-end space-x-2">
              {type === "incoming" && req.status === "pending" && (
                <>
                  <button
                    disabled={isCurrentlyProcessing}
                    onClick={() => handleAction(req._id, "rejected")}
                    className="text-xs font-semibold px-4 py-2 rounded-full text-stone-700 bg-[#F3F1EC] hover:bg-stone-200 transition"
                  >
                    Decline
                  </button>
                  <button
                    disabled={isCurrentlyProcessing}
                    onClick={() => handleAction(req._id, "approved")}
                    className="text-xs font-semibold px-5 py-2 rounded-full text-white bg-[#181816] hover:bg-black shadow-sm transition"
                  >
                    Approve Request
                  </button>
                </>
              )}

              {type === "incoming" && req.status === "approved" && (
                <button
                  disabled={isCurrentlyProcessing}
                  onClick={() => handleAction(req._id, "returned")}
                  className="text-xs font-semibold px-5 py-2 rounded-full text-white bg-stone-900 hover:bg-black shadow-sm transition flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Mark as Returned</span>
                </button>
              )}

              {type === "outgoing" && req.status === "pending" && (
                <button
                  disabled={isCurrentlyProcessing}
                  onClick={() => handleAction(req._id, "cancelled")}
                  className="text-xs font-semibold px-4 py-2 rounded-full text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                >
                  Cancel Request
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}



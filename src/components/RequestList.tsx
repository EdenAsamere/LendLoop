"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatDate, isOverdue, getDaysOverdue } from "../lib/utils";
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
  const [processingId, setProcessingId] = useState<string | null>(null);
  const updateStatus = useMutation(api.requests.updateStatus);

  const handleAction = async (requestId: string, status: "approved" | "rejected" | "returned" | "cancelled") => {
    try {
      setProcessingId(requestId);
      await updateStatus({
        requestId: requestId as any,
        status,
      });
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
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
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800">
          {type === "incoming" ? "No incoming borrow requests" : "No active borrow requests"}
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
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
            className={`bg-white rounded-2xl border p-5 shadow-sm transition ${
              overdue ? "border-rose-300 bg-rose-50/20" : "border-slate-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-slate-900 text-base">{req.toolName}</h4>
                  <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                    {req.toolCategory}
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {type === "incoming" ? (
                    <>
                      Borrower: <span className="font-medium text-slate-700">{req.borrowerName}</span>
                    </>
                  ) : (
                    <>
                      Owner: <span className="font-medium text-slate-700">{req.ownerName}</span>
                    </>
                  )}
                </p>
              </div>

              <div>{getStatusBadge(req.status, req.endDate)}</div>
            </div>

            {/* Details Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3 text-xs text-slate-600">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-brand-600 shrink-0" />
                <span>
                  <strong>Loan Period:</strong> {formatDate(req.startDate)} &rarr;{" "}
                  {formatDate(req.endDate)}
                </span>
              </div>

              {req.reminderCount && req.reminderCount > 0 ? (
                <div className="text-xs text-amber-700 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  Automated Overdue Reminders: <strong>{req.reminderCount} sent</strong>
                </div>
              ) : null}
            </div>

            {req.notes && (
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-700 mb-3 border border-slate-100">
                <span className="font-semibold text-slate-900">Note: </span>
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
                    className="text-xs font-semibold px-3.5 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                  >
                    Decline
                  </button>
                  <button
                    disabled={isCurrentlyProcessing}
                    onClick={() => handleAction(req._id, "approved")}
                    className="text-xs font-semibold px-4 py-2 rounded-xl text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition"
                  >
                    Approve Request
                  </button>
                </>
              )}

              {type === "incoming" && req.status === "approved" && (
                <button
                  disabled={isCurrentlyProcessing}
                  onClick={() => handleAction(req._id, "returned")}
                  className="text-xs font-semibold px-4 py-2 rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition flex items-center space-x-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Mark as Returned</span>
                </button>
              )}

              {type === "outgoing" && req.status === "pending" && (
                <button
                  disabled={isCurrentlyProcessing}
                  onClick={() => handleAction(req._id, "cancelled")}
                  className="text-xs font-semibold px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
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

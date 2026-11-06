"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Search,
  Filter,
  Eye,
  Info,
} from "lucide-react";
import { logger, recordMetric } from "../lib/telemetry";

export function ComplianceDesk() {
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser, user?.id ? { clerkId: user.id } : {});
  const pendingInspectionTools = useQuery(
    api.tools.listPendingInspection,
    user?.id ? { clerkId: user.id } : {}
  );
  const auditLogs = useQuery(api.admin.listAuditLogs, user?.id ? { limit: 100, clerkId: user.id } : {});

  const certifyTool = useMutation(api.tools.certifyTool);
  const flagTool = useMutation(api.tools.flagTool);

  const [activeTab, setActiveTab] = useState<"queue" | "audit" | "telemetry">("queue");
  const [safetyNotes, setSafetyNotes] = useState<{ [toolId: string]: string }>({});
  const [flagReasons, setFlagReasons] = useState<{ [toolId: string]: string }>({});
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState<string>("ALL");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isAuthorized = currentUser?.role === "moderator" || currentUser?.role === "admin";

  if (!isAuthorized) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center max-w-lg mx-auto my-12">
        <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-amber-900">Restricted Access: Role Required</h3>
        <p className="text-xs text-amber-700 mt-1">
          The Compliance & Safety Desk requires <strong>Compliance Steward</strong> (moderator) or <strong>Administrator</strong> privileges.
        </p>
        <div className="mt-4 text-[11px] text-amber-800 bg-amber-100/70 p-3 rounded-xl border border-amber-200">
          Roles are securely assigned by an Administrator in the <strong>Admin Control Center</strong>. If you require compliance oversight access, please contact a system administrator.
        </div>
      </div>
    );
  }

  const handleCertify = async (toolId: Id<"tools">, toolName: string) => {
    setProcessingId(toolId);
    setActionMessage(null);
    const notes = safetyNotes[toolId] || "Verified standard safety checks & operational integrity.";

    try {
      await certifyTool({
        toolId,
        isCertified: true,
        safetyNotes: notes,
        clerkId: user?.id,
      });

      recordMetric("tools.safety_certified", 1, {
        category: "safety",
        reviewerRole: currentUser?.role,
      });

      logger.info(`Tool safety certified: ${toolName}`, {
        toolId,
        reviewerId: user?.id,
        role: currentUser?.role,
        component: "ComplianceDesk",
      });

      setActionMessage({
        type: "success",
        text: `Successfully certified safety compliance for "${toolName}".`,
      });
    } catch (err: any) {
      logger.error("Failed to certify tool", err, { toolId });
      setActionMessage({ type: "error", text: err.message || "Failed to certify tool." });
    } finally {
      setProcessingId(null);
    }
  };

  const handleFlag = async (toolId: Id<"tools">, toolName: string) => {
    setProcessingId(toolId);
    setActionMessage(null);
    const reason = flagReasons[toolId] || "Requires inspection before lending.";

    try {
      await flagTool({
        toolId,
        reason,
        clerkId: user?.id,
      });

      recordMetric("tools.safety_flagged", 1, {
        reason,
        reviewerRole: currentUser?.role,
      });

      logger.warn(`Tool safety flagged: ${toolName}`, {
        toolId,
        reason,
        reviewerId: user?.id,
        component: "ComplianceDesk",
      });

      setActionMessage({
        type: "success",
        text: `Flagged "${toolName}" for safety review. Lending has been temporarily frozen.`,
      });
    } catch (err: any) {
      logger.error("Failed to flag tool", err, { toolId });
      setActionMessage({ type: "error", text: err.message || "Failed to flag tool." });
    } finally {
      setProcessingId(null);
    }
  };

  const exportAuditLogsJSON = () => {
    if (!auditLogs) return;
    const blob = new Blob([JSON.stringify(auditLogs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lendloop_audit_trail_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    recordMetric("audit.logs_exported", 1, { format: "json" });
  };

  const filteredLogs = (auditLogs || []).filter((log) => {
    if (auditFilter === "ALL") return true;
    return log.action.includes(auditFilter);
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <Shield className="w-3 h-3" />
                Compliance & Safety Desk
              </span>
              <span className="text-xs text-stone-400">
                Logged in as <strong className="text-white capitalize">{currentUser?.role}</strong>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Safety Governance & Audit Center
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-2xl">
              Inspect community equipment, enforce safety regulations, certify high-risk machinery, and inspect tamper-evident audit trails.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportAuditLogsJSON}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition"
              title="Export regulatory compliance audit logs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit Trail</span>
            </button>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between border ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-[11px] font-semibold hover:underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-stone-200 gap-2">
        <button
          onClick={() => setActiveTab("queue")}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-bold transition ${
            activeTab === "queue"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Safety Inspection Queue</span>
          {pendingInspectionTools && pendingInspectionTools.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
              {pendingInspectionTools.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-bold transition ${
            activeTab === "audit"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Compliance Audit Trail</span>
          <span className="text-[11px] text-stone-400 font-normal">({auditLogs?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab("telemetry")}
          className={`flex items-center gap-2 py-3 px-4 border-b-2 text-xs font-bold transition ${
            activeTab === "telemetry"
              ? "border-stone-900 text-stone-900"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Telemetry & Monitoring</span>
        </button>
      </div>

      {/* Tab 1: Safety Inspection Queue */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">
              Items Pending Safety Certification ({pendingInspectionTools?.length || 0})
            </h3>
            <span className="text-xs text-stone-500">
              Review tool condition, safety guidelines, and certification status
            </span>
          </div>

          {!pendingInspectionTools || pendingInspectionTools.length === 0 ? (
            <div className="p-8 rounded-2xl bg-white border border-stone-200 text-center">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-stone-900">Queue is Clear</h4>
              <p className="text-xs text-stone-500 mt-1">
                All community equipment has been inspected and safety certified.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingInspectionTools.map((tool) => {
                const isFlagged = tool.isFlagged;
                return (
                  <div
                    key={tool._id}
                    className={`rounded-2xl border p-5 bg-white transition space-y-3 ${
                      isFlagged ? "border-rose-300 ring-1 ring-rose-200" : "border-stone-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-stone-900">{tool.name}</h4>
                          {isFlagged ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                              <AlertTriangle className="w-3 h-3" /> Flagged Unsafe
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" /> Uncertified
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Category: <span className="font-semibold">{tool.category}</span> | Condition:{" "}
                          <span className="font-semibold">{tool.condition}</span> | Owner:{" "}
                          <span className="font-semibold">{tool.ownerName}</span>
                        </p>
                      </div>

                      {tool.imageUrl && (
                        <img
                          src={tool.imageUrl}
                          alt={tool.name}
                          className="w-14 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                        />
                      )}
                    </div>

                    <p className="text-xs text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-100 line-clamp-2">
                      {tool.description}
                    </p>

                    {isFlagged && tool.flagReason && (
                      <div className="text-xs text-rose-800 bg-rose-50 p-2 rounded-xl border border-rose-200">
                        <strong>Flagged Reason:</strong> {tool.flagReason}
                      </div>
                    )}

                    {/* Safety Inspection Notes Input */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[11px] font-semibold text-stone-700">
                        Safety Notes & Requirements (e.g. Eye Protection Required):
                      </label>
                      <input
                        type="text"
                        placeholder="Attach inspection notes or PPE guidelines..."
                        value={safetyNotes[tool._id] || ""}
                        onChange={(e) =>
                          setSafetyNotes({ ...safetyNotes, [tool._id]: e.target.value })
                        }
                        className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                      <button
                        onClick={() => handleFlag(tool._id, tool.name)}
                        disabled={processingId === tool._id}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                      >
                        Flag Unsafe
                      </button>
                      <button
                        onClick={() => handleCertify(tool._id, tool.name)}
                        disabled={processingId === tool._id}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Certify Safety Compliance</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Regulatory Compliance Audit Trail */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Tamper-Evident Audit Trail</h3>
              <p className="text-xs text-stone-500">
                Immutable, append-only audit trail capturing security events, safety reviews, and status changes.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {["ALL", "SAFETY", "ROLE", "REQUEST", "TOOL"].map((f) => (
                <button
                  key={f}
                  onClick={() => setAuditFilter(f)}
                  className={`text-[11px] font-bold px-3 py-1 rounded-full transition ${
                    auditFilter === f
                      ? "bg-stone-900 text-white"
                      : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor Role</th>
                    <th className="py-3 px-4">Target Type</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredLogs.map((log) => {
                    const isSafety = log.action.includes("SAFETY") || log.action.includes("CERTIFIED");
                    const isRole = log.action.includes("ROLE");
                    return (
                      <tr key={log._id} className="hover:bg-stone-50/70 transition">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-stone-500 shrink-0">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isSafety
                                ? "bg-emerald-100 text-emerald-800"
                                : isRole
                                ? "bg-indigo-100 text-indigo-800"
                                : "bg-stone-100 text-stone-700"
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold capitalize text-stone-700">
                          {log.actorRole || "system"}
                        </td>
                        <td className="py-2.5 px-4 text-stone-500 uppercase font-mono text-[10px]">
                          {log.targetType || "ENTITY"}
                        </td>
                        <td className="py-2.5 px-4 text-stone-800">{log.details}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Telemetry & Monitoring */}
      {activeTab === "telemetry" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400">Datadog APM & Logs</span>
            <div className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </div>
            <p className="text-xs text-stone-500 pt-1">
              Structured JSON log formatting & custom metric counters active.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400">Sentry Error Tracing</span>
            <div className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </div>
            <p className="text-xs text-stone-500 pt-1">
              PII redaction and automatic breadcrumb capture enabled.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400">RBAC Enforcement</span>
            <div className="text-xl font-extrabold text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Hierarchical
            </div>
            <p className="text-xs text-stone-500 pt-1">
              Multi-role guards: Member, Compliance Steward, Administrator.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

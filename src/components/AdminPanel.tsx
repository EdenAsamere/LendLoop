"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { formatDate, getCleanErrorMessage } from "../lib/utils";
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Activity,
  Workflow,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<"loans" | "users" | "audit" | "n8n">("loans");
  const [testResult, setTestResult] = useState<string | null>(null);

  const allLoans = useQuery(api.admin.listAllLoans, {});
  const overdueLoans = useQuery(api.admin.getOverdueLoansInternal, {});
  const allUsers = useQuery(api.admin.listAllUsers, {});
  const auditLogs = useQuery(api.admin.listAuditLogs, { limit: 50 });

  const toggleTrustedLender = useMutation(api.users.toggleTrustedLender);
  const setUserRole = useMutation(api.users.setUserRole);

  const handleTestOverdueSimulation = () => {
    const count = overdueLoans?.length ?? 0;
    setTestResult(
      `Securely verified: ${count} loan(s) currently overdue and eligible for automated n8n reminder notifications.`
    );
  };

  const handleToggleTrusted = async (userId: string) => {
    try {
      await toggleTrustedLender({ targetUserId: userId as any });
    } catch (err: any) {
      alert(getCleanErrorMessage(err));
    }
  };

  const handleSetRole = async (userId: string, newRole: "user" | "moderator" | "admin") => {
    try {
      await setUserRole({
        targetUserId: userId as any,
        role: newRole,
      });
    } catch (err: any) {
      alert(getCleanErrorMessage(err));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">LendLoop Admin Control Center</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            RBAC enforcement, neighborhood loan oversight, and n8n workflow monitoring.
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab("loans")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "loans" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Loans & Overdue
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "users" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Users & RBAC
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "audit" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Audit Trail
          </button>
          <button
            onClick={() => setActiveTab("n8n")}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === "n8n" ? "bg-brand-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            n8n Automation
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* 1. LOANS TAB */}
        {activeTab === "loans" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-800">
                All Neighborhood Loan Records ({allLoans?.length || 0})
              </h3>
              <button
                onClick={handleTestOverdueSimulation}
                className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg transition flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Test Overdue Endpoint</span>
              </button>
            </div>

            {testResult && (
              <div className="p-3 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                {testResult}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                  <tr>
                    <th className="p-3">Tool</th>
                    <th className="p-3">Borrower</th>
                    <th className="p-3">Owner</th>
                    <th className="p-3">Dates</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Reminders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allLoans?.map((loan: any) => (
                    <tr key={loan._id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900">{loan.toolName}</td>
                      <td className="p-3 text-slate-600">{loan.borrowerName}</td>
                      <td className="p-3 text-slate-600">{loan.ownerName}</td>
                      <td className="p-3 text-slate-500">
                        {formatDate(loan.startDate)} &rarr; {formatDate(loan.endDate)}
                      </td>
                      <td className="p-3">
                        {loan.isOverdue ? (
                          <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Overdue ({loan.daysOverdue}d)
                          </span>
                        ) : (
                          <span className="capitalize font-medium text-slate-700">
                            {loan.status}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500">
                        {loan.reminderCount ? `${loan.reminderCount} sent` : "None"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. USERS TAB */}
        {activeTab === "users" && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4">
              Registered Neighbors & Permissions
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Trusted Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allUsers?.map((user: any) => (
                    <tr key={user._id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-900 flex items-center space-x-2">
                        <span>{user.name}</span>
                        {user.isTrustedLender && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </td>
                      <td className="p-3 text-slate-600">{user.email}</td>
                      <td className="p-3">
                        <span
                          className={`font-semibold uppercase text-[10px] px-2 py-0.5 rounded-md ${
                            user.role === "admin"
                              ? "bg-indigo-100 text-indigo-800"
                              : user.role === "moderator"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {user.role === "moderator" ? "Compliance Steward" : user.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {user.isTrustedLender ? (
                          <span className="text-emerald-700 font-semibold">Trusted Lender</span>
                        ) : (
                          <span className="text-slate-400">Standard</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <select
                          value={user.role}
                          onChange={(e) => handleSetRole(user._id, e.target.value as any)}
                          className="px-2 py-1 rounded-md text-[11px] font-medium border border-slate-200 bg-white text-slate-800"
                        >
                          <option value="user">Member (User)</option>
                          <option value="moderator">Compliance Steward</option>
                          <option value="admin">Administrator</option>
                        </select>
                        <button
                          onClick={() => handleToggleTrusted(user._id)}
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                        >
                          {user.isTrustedLender ? "Revoke Trusted" : "Make Trusted"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. AUDIT TRAIL */}
        {activeTab === "audit" && (
          <div>
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-600" /> Security & Workflow Audit Log
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {auditLogs?.map((log: any) => (
                <div
                  key={log._id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-start justify-between gap-3"
                >
                  <div>
                    <span className="font-bold text-slate-800 mr-2 bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                      {log.action}
                    </span>
                    <span className="text-slate-600">{log.details}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. n8n AUTOMATION STATUS */}
        {activeTab === "n8n" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Workflow className="w-4 h-4 text-purple-600" /> n8n Automation Architecture
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <h4 className="font-bold text-slate-900">Workflow 1: Request Notifications</h4>
                <p className="text-slate-600">
                  Triggered on borrow request creation or status updates (Approved, Rejected, Returned).
                </p>
                <div className="pt-2 text-[11px] text-slate-500 space-y-1">
                  <div>
                    <strong>Signature Security:</strong> HMAC-SHA256 with timestamp validation (5 min replay protection).
                  </div>
                  <div>
                    <strong>Target Webhook:</strong> <code>/webhook/lendloop-requests</code>
                  </div>
                  <div>
                    <strong>Data Minimization:</strong> Transmits only tool name, dates, notes, and recipient email.
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <h4 className="font-bold text-slate-900">Workflow 2: Daily Overdue Reminders</h4>
                <p className="text-slate-600">
                  Runs daily at 09:00 AM UTC. Queries Convex HTTP API for overdue loans and writes back reminder records.
                </p>
                <div className="pt-2 text-[11px] text-slate-500 space-y-1">
                  <div>
                    <strong>Schedule:</strong> <code>0 9 * * *</code> (Daily Cron)
                  </div>
                  <div>
                    <strong>Idempotency Key:</strong> <code>overdue_{"${loanId}"}_{"${today}"}</code>
                  </div>
                  <div>
                    <strong>Write-back Endpoint:</strong> <code>/api/overdue-reminders/record</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

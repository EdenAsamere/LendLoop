"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Lock, ShieldAlert, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { logger } from "../lib/telemetry";

export function ForcePasswordUpdateModal() {
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser, user?.id ? { clerkId: user.id } : {});
  const completePasswordChange = useMutation(api.users.completePasswordChange);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Only render if user is flagged with mandatory initial password change
  if (!currentUser || !currentUser.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Update password in Clerk identity directory via backend route
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update password.");
      }

      // 2. Acknowledge in Convex database to clear mustChangePassword flag
      await completePasswordChange({ clerkId: user?.id });

      logger.info("Admin completed mandatory initial password update", {
        userId: user?.id,
        component: "ForcePasswordUpdateModal",
      });

      setSuccess(true);
    } catch (err: any) {
      logger.error("Failed mandatory password reset", err);
      setErrorMessage(err.message || "Failed to update password. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
              <ShieldAlert className="w-3 h-3" /> Security Policy Enforced
            </div>
            <h3 className="text-lg font-bold text-stone-900 mt-1">Update Initial Password</h3>
          </div>
        </div>

        <p className="text-xs text-stone-600 mb-6 leading-relaxed">
          Your administrator account was provisioned with a <strong>temporary initial password</strong>. For security and regulatory compliance, you must set a permanent password before accessing the system.
        </p>

        {success ? (
          <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-bold text-emerald-950">Password Secured!</h4>
            <p className="text-xs text-emerald-700">
              Your permanent administrator credentials are active. Welcome to LendLoop!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {errorMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700">New Permanent Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700">Confirm New Password</label>
              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                required
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-stone-900 hover:bg-black transition shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? "Securing Account..." : "Save Permanent Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

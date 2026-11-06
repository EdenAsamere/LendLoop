"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Shield, Zap, UserCheck } from "lucide-react";

const ROLE_STYLES = {
  user: {
    label: "Member",
    color: "bg-stone-100 text-stone-700 border-stone-200",
    icon: UserCheck,
    title: "Standard Community Member (Lender & Borrower)",
  },
  moderator: {
    label: "Compliance Steward",
    color: "bg-emerald-50 text-emerald-800 border-emerald-300",
    icon: Shield,
    title: "Authorized Compliance Steward (Equipment Safety Inspector)",
  },
  admin: {
    label: "Administrator",
    color: "bg-indigo-50 text-indigo-800 border-indigo-300",
    icon: Zap,
    title: "Platform Administrator (Full System Governance)",
  },
};

export function UserRoleBadge() {
  const { user } = useUser();
  const currentUser = useQuery(api.users.getCurrentUser, user?.id ? { clerkId: user.id } : {});

  if (!currentUser) return null;

  const role = (currentUser.role as "user" | "moderator" | "admin") || "user";
  const config = ROLE_STYLES[role] || ROLE_STYLES.user;
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-2xs select-none ${config.color}`}
      title={config.title}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{config.label}</span>
    </div>
  );
}

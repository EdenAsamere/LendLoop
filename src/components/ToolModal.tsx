"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuthenticatedTool } from "./ToolCard";
import { X, AlertCircle, CheckCircle2 } from "lucide-react";

interface ToolModalProps {
  toolToEdit?: AuthenticatedTool | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES = [
  "Power Tools",
  "Hand Tools",
  "Gardening",
  "Woodworking",
  "Automotive",
  "Outdoor & Camping",
  "Cleaning & Maintenance",
  "Other",
];

const CONDITIONS = ["Brand New", "Like New", "Good", "Fair"] as const;

export function ToolModal({ toolToEdit, onClose, onSuccess }: ToolModalProps) {
  const isEditing = !!toolToEdit;

  const [name, setName] = useState(toolToEdit?.name || "");
  const [category, setCategory] = useState(toolToEdit?.category || "Power Tools");
  const [condition, setCondition] = useState<"Brand New" | "Like New" | "Good" | "Fair">(
    toolToEdit?.condition || "Good"
  );
  const [description, setDescription] = useState(toolToEdit?.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const createTool = useMutation(api.tools.create);
  const updateTool = useMutation(api.tools.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please provide a tool name.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditing) {
        await updateTool({
          toolId: toolToEdit._id as any,
          name: name.trim(),
          category,
          condition,
          description: description.trim(),
        });
      } else {
        await createTool({
          name: name.trim(),
          category,
          condition,
          description: description.trim(),
        });
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Failed to save tool.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            {isEditing ? "Edit Tool" : "New Neighborhood Listing"}
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-2">
            {isEditing ? "Update Tool Details" : "List a Tool to Lend"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Share your tools with verified neighbors and foster local community.
          </p>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 animate-bounce" />
            <h3 className="text-lg font-bold text-slate-900">
              {isEditing ? "Tool Updated!" : "Tool Listed Successfully!"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Your neighbors can now discover and request to borrow it.
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tool Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cordless Brushless Drill Set"
                className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  {CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description & Inclusions
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details about the tool, safety notes, accessories included (e.g. battery charger, case, bit set)..."
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
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Publish Listing"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


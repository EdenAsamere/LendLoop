"use client";

import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { useUser, SignInButton } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { AuthenticatedTool } from "./ToolCard";
import { TOOL_CATEGORIES } from "../lib/constants";
import {
  X,
  AlertCircle,
  CheckCircle2,
  Upload,
  Link as LinkIcon,
  Camera,
  Trash2,
  Info,
  Lock,
} from "lucide-react";
import { getCleanErrorMessage } from "../lib/utils";

interface ToolModalProps {
  toolToEdit?: AuthenticatedTool | null;
  onClose: () => void;
  onSuccess?: () => void;
}

const CONDITIONS = ["Brand New", "Like New", "Good", "Fair"] as const;

export function ToolModal({ toolToEdit, onClose, onSuccess }: ToolModalProps) {
  const { user } = useUser();
  const isEditing = !!toolToEdit;

  const [name, setName] = useState(toolToEdit?.name || "");
  const [category, setCategory] = useState(toolToEdit?.category || "Power Tools");
  const [condition, setCondition] = useState<"Brand New" | "Like New" | "Good" | "Fair">(
    toolToEdit?.condition || "Good"
  );
  const [description, setDescription] = useState(toolToEdit?.description || "");
  const [imageUrl, setImageUrl] = useState(toolToEdit?.imageUrl || "");
  const [imageMode, setImageMode] = useState<"upload" | "url">("upload");
  const [imageError, setImageError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const syncUser = useMutation(api.users.syncUser);
  const createTool = useMutation(api.tools.create);
  const updateTool = useMutation(api.tools.update);

  // Handle client-side file upload with automatic compression
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Please select an image file (JPEG, PNG, WebP).");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setImageError("File is too large. Please select an image under 8MB.");
      return;
    }

    setImageError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        // Resize / compress on HTML5 canvas to keep lightweight (~50-80KB)
        const canvas = document.createElement("canvas");
        const maxDim = 900;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        setImageUrl(compressed);
      };
      img.onerror = () => {
        setImageError("Could not process this image file.");
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Handle URL change with detection of Unsplash webpage links
  const handleUrlChange = (val: string) => {
    setImageUrl(val);
    setImageError(null);

    // If user pasted an Unsplash webpage link instead of an image link
    if (val.includes("unsplash.com/photos/")) {
      setImageError(
        "You pasted an Unsplash webpage link. To use this photo: right-click the image on Unsplash and choose 'Copy Image Address', or use the 'Upload from Device' tab."
      );
    }
  };

  const handleClearImage = () => {
    setImageUrl("");
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("Please sign in to list or edit a tool.");
      return;
    }

    if (!name.trim()) {
      setError("Please provide a tool name.");
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

      if (isEditing) {
        await updateTool({
          toolId: toolToEdit._id as any,
          name: name.trim(),
          category,
          condition,
          description: description.trim(),
          imageUrl: imageUrl.trim() || undefined,
          clerkId: user.id,
        });
      } else {
        await createTool({
          name: name.trim(),
          category,
          condition,
          description: description.trim(),
          imageUrl: imageUrl.trim() || undefined,
          clerkId: user.id,
        });
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        if (onSuccess) onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      if (err.message?.includes("Authentication required") || err.message?.includes("Unauthorized")) {
        setError(
          "Authentication failed: Please sign in or re-authenticate to publish tools."
        );
      } else {
        setError(getCleanErrorMessage(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-[#FAF9F6] rounded-[2rem] max-w-lg w-full p-8 shadow-2xl border border-[#EAE8E2] relative my-auto max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-stone-400 hover:text-stone-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <span className="text-[11px] font-bold uppercase tracking-widest text-stone-400 block mb-1">
            {isEditing ? "Edit Tool" : "New Community Listing"}
          </span>
          <h2 className="font-serif text-2xl font-bold text-[#181816]">
            {isEditing ? "Update Tool Details" : "List a Tool to Share"}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Share equipment with trusted neighbors and reduce local consumption.
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
                You need to be signed in to your LendLoop account before you can list a tool or access neighbor equipment.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#181816] hover:bg-black text-white text-xs font-semibold px-6 py-3 rounded-full shadow-sm hover:shadow transition"
                >
                  <span>Sign In to Continue</span>
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
            <h3 className="font-serif text-xl font-bold text-stone-900">
              {isEditing ? "Tool Updated" : "Tool Published"}
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Your tool is now visible in the catalog.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="flex-1 font-medium">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tool Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Cordless Brushless Drill Set"
                className="w-full text-xs border border-[#EAE8E2] rounded-full px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-xs border border-[#EAE8E2] rounded-full px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
                >
                  {TOOL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full text-xs border border-[#EAE8E2] rounded-full px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
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
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Description & Inclusions
              </label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details about the tool, safety notes, accessories included (e.g. battery charger, case, bit set)..."
                className="w-full text-xs border border-[#EAE8E2] rounded-2xl p-3.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 resize-none bg-white"
              />
            </div>

            {/* Photo Section with Upload & URL options */}
            <div className="border border-[#EAE8E2] rounded-2xl p-4 bg-white/70">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-semibold text-stone-800">
                  Tool Photo (Optional)
                </label>

                {/* Mode Selector Pills */}
                <div className="flex items-center bg-[#F3F1EC] p-0.5 rounded-full border border-[#EAE8E2] text-[11px]">
                  <button
                    type="button"
                    onClick={() => setImageMode("upload")}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full transition font-medium ${
                      imageMode === "upload"
                        ? "bg-[#181816] text-white shadow-xs"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode("url")}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full transition font-medium ${
                      imageMode === "url"
                        ? "bg-[#181816] text-white shadow-xs"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span>Paste Link</span>
                  </button>
                </div>
              </div>

              {/* Mode 1: Direct File Upload */}
              {imageMode === "upload" && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="tool-file-upload"
                  />
                  <label
                    htmlFor="tool-file-upload"
                    className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#EAE8E2] hover:border-stone-400 rounded-2xl cursor-pointer bg-[#FAF9F6] transition group"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#F3F1EC] flex items-center justify-center text-stone-600 mb-2 group-hover:scale-105 transition-transform">
                      <Camera className="w-5 h-5 text-stone-700" />
                    </div>
                    <span className="text-xs font-semibold text-stone-800">
                      Click to choose photo from device
                    </span>
                    <span className="text-[11px] text-stone-400 mt-0.5">
                      JPEG, PNG, WebP up to 8MB (auto-optimized)
                    </span>
                  </label>
                </div>
              )}

              {/* Mode 2: Paste URL */}
              {imageMode === "url" && (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={imageUrl.startsWith("data:") ? "" : imageUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://images.unsplash.com/... or public image address"
                    className="w-full text-xs border border-[#EAE8E2] rounded-full px-4 py-2.5 text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900 bg-white"
                  />
                  <p className="text-[11px] text-stone-500 flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                    <span>
                      Must be a direct image link (e.g. from an image host or right-click photo &rarr; <em>Copy Image Address</em>).
                    </span>
                  </p>
                </div>
              )}

              {/* Specific Warning / Guidance for Unsplash or other image errors */}
              {imageError && (
                <div className="mt-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{imageError}</span>
                </div>
              )}

              {/* Live Preview Card */}
              {imageUrl && (
                <div className="mt-3 flex items-center justify-between p-2.5 bg-[#FAF9F6] rounded-2xl border border-[#EAE8E2]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-stone-200 shrink-0 border border-white shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Tool preview"
                        className="w-full h-full object-cover"
                        onError={() =>
                          setImageError(
                            "Cannot display this URL. Please verify it points directly to an image, or use the 'Upload File' tab."
                          )
                        }
                      />
                    </div>
                    <div className="min-w-0 text-xs">
                      <p className="font-semibold text-stone-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Photo Attached</span>
                      </p>
                      <p className="text-[11px] text-stone-400 truncate max-w-[200px]">
                        {imageUrl.startsWith("data:") ? "Uploaded from your device" : imageUrl}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-full transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              )}
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
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-[#181816] hover:bg-black disabled:opacity-50 transition shadow-sm"
              >
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Publish Tool"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export const TOOL_CATEGORIES = [
  "Power Tools",
  "Hand Tools",
  "Gardening",
  "Woodworking",
  "Automotive",
  "Outdoor & Camping",
  "Cleaning & Maintenance",
  "Other",
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

export const ALL_CATEGORIES = ["All", ...TOOL_CATEGORIES] as const;

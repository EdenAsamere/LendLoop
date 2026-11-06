import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized: Authentication required." }, { status: 401 });
    }

    const body = await req.json();
    const { newPassword } = body;

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Validation Error: Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const client = await clerkClient();
    await client.users.updateUser(userId, {
      password: newPassword,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Update Password Error]:", err);
    return NextResponse.json(
      { error: err.errors?.[0]?.message || err.message || "Failed to update password." },
      { status: 500 }
    );
  }
}

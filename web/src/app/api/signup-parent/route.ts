import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { parentId, parentEmail, parentName, playerName } = await request.json();

    if (!parentId || !parentEmail || !parentName || !playerName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create auth user for player
    const playerEmail = `player+${parentId.slice(0, 8)}@${parentEmail.split("@")[1]}`;
    const playerPassword = randomUUID(); // Random password, won't be used for login

    const { data: playerAuthData, error: playerAuthErr } = await supabaseAdmin.auth.admin.createUser({
      email: playerEmail,
      password: playerPassword,
      email_confirm: true,
    });

    if (playerAuthErr) {
      return NextResponse.json({ error: playerAuthErr.message }, { status: 400 });
    }

    const playerUserId = playerAuthData.user?.id;
    if (!playerUserId) {
      return NextResponse.json({ error: "Failed to create player account" }, { status: 500 });
    }

    // Create player profile
    const { error: playerProfileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: playerUserId,
        email: playerEmail,
        full_name: playerName.trim(),
        role: "client",
        account_type: "player",
      });

    if (playerProfileErr) {
      return NextResponse.json({ error: playerProfileErr.message }, { status: 400 });
    }

    // Create parent profile linked to player
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: parentId,
        email: parentEmail,
        full_name: parentName,
        role: "client",
        account_type: "parent",
        player_id: playerUserId,
      });

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, playerId: playerUserId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import supabaseAdmin from "@/app/lib/supabaseClient"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"

// GET /api/notifications
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // Fetch raw notifications
  const { data: notifs, error: notifErr } = await supabaseAdmin
    .from("notifications")
    .select("id, history_id, is_read, created_at")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
  if (notifErr) {
    return NextResponse.json({ error: notifErr.message }, { status: 500 })
  }
  // Attach history to each notification
  const results = await Promise.all(
    (notifs ?? []).map(async (n) => {
      const { data: hist, error: histErr } = await supabaseAdmin
        .from("feedback_status_history")
        .select("feedback_id, old_status, new_status, changed_by, reason, changed_at")
        .eq("id", n.history_id)
        .single()
      if (histErr || !hist) return null
      return { ...n, feedback_status_history: [hist] }
    })
  )
  return NextResponse.json(results.filter((r) => r !== null))
}

// DELETE /api/notifications?id=<id> or DELETE /api/notifications to clear all
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  let query = supabaseAdmin.from("notifications").delete()
  if (id) {
    query = query.eq("id", id)
  } else {
    query = query.eq("user_id", session.user.id)
  }
  query = query.eq("user_id", session.user.id)
  const { error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

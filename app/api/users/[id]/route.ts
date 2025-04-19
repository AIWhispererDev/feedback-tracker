import { NextResponse } from "next/server";
import { updateUserRole } from "@/app/lib/user";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// PUT /api/users/[id] - update user role (admin-only)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { role } = await request.json();
  if (!["admin", "moderator", "user"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Await the dynamic param before use
  const id = await params.id;
  const user = await updateUserRole(id, role as any);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role };
  return NextResponse.json(safeUser);
}

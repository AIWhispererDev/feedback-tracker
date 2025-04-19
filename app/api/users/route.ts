import { NextResponse } from "next/server";
import { getAllUsers } from "@/app/lib/user";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// GET /api/users - return list of users (admin only)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const users = await getAllUsers();
  const safeUsers = users.map(({ id, name, email, role }) => ({ id, name, email, role }));
  return NextResponse.json(safeUsers);
}

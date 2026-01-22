import { NextRequest } from "next/server";
import { getSession, getUserById } from "@/lib/mockUsers";

export async function getSessionUser(request: NextRequest) {
  const sessionToken =
    request.cookies.get("sessionToken")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  if (!sessionToken) {
    return { error: "Authentication required.", status: 401 };
  }

  const session = await getSession(sessionToken);
  if (!session) {
    return { error: "Invalid or expired session.", status: 401 };
  }

  const user = await getUserById(session.userId);
  if (!user) {
    return { error: "User not found.", status: 404 };
  }

  return { user };
}

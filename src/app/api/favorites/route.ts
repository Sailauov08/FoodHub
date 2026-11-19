import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertUser } from "@/lib/session";
import { handleRouteError } from "@/server/http";

export async function GET() {
  try {
    const user = await assertUser();
    const favs = await db.favorite.findMany({ where: { userId: user.id }, select: { productId: true } });
    return NextResponse.json({ ids: favs.map((f) => f.productId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleRouteError(err, "favorites.get");
  }
}

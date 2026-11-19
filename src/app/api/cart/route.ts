import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { cartLinesSchema } from "@/lib/validation";
import { assertUser } from "@/lib/session";
import { lineKey, MAX_LINE_QUANTITY_HARD_CAP } from "@/lib/domain/pricing";
import { handleRouteError, isSameOrigin, jsonError } from "@/server/http";

/** Server-side cart for signed-in customers, so the cart follows the account across devices. */

async function readLines(userId: string) {
  const cart = await db.cart.findUnique({ where: { userId }, include: { items: { orderBy: { id: "asc" } } } });
  return (cart?.items ?? []).map((i) => ({
    productId: i.productId,
    variantId: i.variantId,
    modifierOptionIds: i.modifierOptionIds,
    quantity: i.quantity,
  }));
}

export async function GET() {
  try {
    const user = await assertUser();
    return NextResponse.json({ ok: true, lines: await readLines(user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleRouteError(err, "cart.get");
  }
}

const putSchema = z.object({ mode: z.enum(["replace", "merge"]), lines: cartLinesSchema });

export async function PUT(req: Request) {
  if (!isSameOrigin(req)) return jsonError("FORBIDDEN_ORIGIN", 403);
  try {
    const user = await assertUser();
    const { mode, lines } = putSchema.parse(await req.json());

    const merged = new Map<string, { productId: string; variantId: string | null; modifierOptionIds: string[]; quantity: number }>();
    const add = (l: { productId: string; variantId?: string | null; modifierOptionIds: string[]; quantity: number }) => {
      const key = lineKey(l.productId, l.variantId, l.modifierOptionIds);
      const prev = merged.get(key);
      merged.set(key, {
        productId: l.productId,
        variantId: l.variantId ?? null,
        modifierOptionIds: [...new Set(l.modifierOptionIds)].sort(),
        quantity: Math.min((prev?.quantity ?? 0) + l.quantity, MAX_LINE_QUANTITY_HARD_CAP),
      });
    };
    if (mode === "merge") (await readLines(user.id)).forEach(add);
    lines.forEach(add);

    // Drop lines whose product/variant no longer exists (FK safety); availability is checked by the quote.
    const productIds = [...new Set([...merged.values()].map((l) => l.productId))];
    const variantIds = [...merged.values()].map((l) => l.variantId).filter((v): v is string => !!v);
    const [products, variants] = await Promise.all([
      db.product.findMany({ where: { id: { in: productIds } }, select: { id: true } }),
      db.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true } }),
    ]);
    const pSet = new Set(products.map((p) => p.id));
    const vSet = new Set(variants.map((v) => v.id));
    const valid = [...merged.entries()]
      .filter(([, l]) => pSet.has(l.productId) && (!l.variantId || vSet.has(l.variantId)))
      .slice(0, 50);

    await db.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      if (valid.length) {
        await tx.cartItem.createMany({
          data: valid.map(([key, l]) => ({
            cartId: cart.id,
            lineKey: key,
            productId: l.productId,
            variantId: l.variantId,
            modifierOptionIds: l.modifierOptionIds,
            quantity: l.quantity,
          })),
        });
      }
    });
    return NextResponse.json({ ok: true, lines: valid.map(([, l]) => l) });
  } catch (err) {
    return handleRouteError(err, "cart.put");
  }
}

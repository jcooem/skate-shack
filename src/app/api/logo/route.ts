import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const row = await prisma.settings.findUnique({
    where: { id: 1 },
    select: { logo: true, logoMime: true },
  });
  if (!row?.logo || !row.logoMime) return new Response("No logo", { status: 404 });

  // URLs carry ?v=<updated timestamp>, so a versioned URL can be cached forever.
  const versioned = new URL(request.url).searchParams.has("v");
  return new Response(new Uint8Array(row.logo), {
    headers: {
      "Content-Type": row.logoMime,
      "Cache-Control": versioned ? "public, max-age=31536000, immutable" : "public, max-age=60",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}

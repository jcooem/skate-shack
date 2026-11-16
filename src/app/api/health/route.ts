// Render health check. Deliberately does NOT touch the database so that the
// frequent health checks don't keep the (free, auto-suspending) Neon database awake.
export function GET() {
  return Response.json({ ok: true });
}

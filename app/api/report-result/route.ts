const PLATFORM_ORIGIN = process.env.NEXT_PUBLIC_REVANCHE_ORIGIN || "https://revanchegames-production.up.railway.app";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ ok: false, reason: "invalid body" }, { status: 400 });

  const { roomCode, playerId, rgToken, outcome, score } = body;
  if (typeof roomCode !== "string" || !/^ENR-[A-Z0-9]{4}$/.test(roomCode) ||
      typeof playerId !== "string" || !/^[A-Za-z0-9_-]{1,96}$/.test(playerId) ||
      (outcome !== "win" && outcome !== "loss")) {
    return Response.json({ ok: false, reason: "invalid payload" }, { status: 400 });
  }
  if (typeof rgToken !== "string" || !/^[A-Za-z0-9_.-]{1,4096}$/.test(rgToken)) {
    return Response.json({ ok: true, reported: false });
  }

  try {
    const result = await fetch(new URL("/api/report-result", PLATFORM_ORIGIN), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameSlug: "kilomax",
        idempotencyKey: `kilomax:${roomCode}:${playerId}`,
        roomCode,
        rgToken,
        outcome,
        score,
      }),
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (result.ok) {
      const { skipped } = await result.json();
      return Response.json({ ok: true, reported: !skipped });
    }
  } catch {
    // Central reporting is optional for the race.
  }
  return Response.json({ ok: false }, { status: 502 });
}

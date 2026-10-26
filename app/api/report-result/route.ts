import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Déclare le résultat d'une partie terminée au projet Supabase central de
 * Revanche Game (comptes, profils, statistiques). KILOMAX n'a pas de serveur
 * de partie autoritaire — l'état vit dans son propre Supabase (voir
 * game/lib/online/) — donc chaque appareil déclare ici sa propre ligne, une
 * seule fois par partie (idempotence sur gameSlug:roomCode:playerId). Voir
 * docs/PLATFORM.md (dépôt revanche-games-web) pour le contrat complet.
 *
 * Optionnel : sans ces variables d'environnement, KILOMAX fonctionne
 * exactement comme avant, en jeu autonome.
 */

interface PlatformIdentity {
  uid: string;
  username: string;
}

function verifyPlatformToken(token: unknown, secret: string): PlatformIdentity | null {
  if (typeof token !== "string") return null;

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = createHmac("sha256", secret).update(payloadB64).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      uid?: unknown;
      username?: unknown;
      exp?: unknown;
    };
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.uid !== "string" || typeof payload.username !== "string") return null;
    return { uid: payload.uid, username: payload.username };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const secret = process.env.PLATFORM_SHARED_SECRET;
  const supabaseUrl = process.env.PLATFORM_SUPABASE_URL;
  const serviceKey = process.env.PLATFORM_SUPABASE_SERVICE_ROLE_KEY;

  if (!secret || !supabaseUrl || !serviceKey) {
    return NextResponse.json({ ok: false, reason: "platform reporting disabled" }, { status: 200 });
  }

  let body: {
    roomCode?: unknown;
    playerId?: unknown;
    rgToken?: unknown;
    outcome?: unknown;
    score?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid body" }, { status: 400 });
  }

  const identity = verifyPlatformToken(body.rgToken, secret);
  if (!identity) {
    // Jeton absent ou invalide : joueur invité, rien à attribuer — pas une erreur.
    return NextResponse.json({ ok: true, reported: false });
  }

  if (
    typeof body.roomCode !== "string" ||
    typeof body.playerId !== "string" ||
    (body.outcome !== "win" && body.outcome !== "loss")
  ) {
    return NextResponse.json({ ok: false, reason: "invalid payload" }, { status: 400 });
  }

  const score = typeof body.score === "number" ? body.score : null;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/record_game_result`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_game_slug: "kilomax",
        p_idempotency_key: `kilomax:${body.roomCode}:${body.playerId}`,
        p_room_code: body.roomCode,
        p_raw_payload: { outcome: body.outcome, score },
        p_players: [
          {
            user_id: identity.uid,
            guest_label: null,
            outcome: body.outcome,
            score,
            position: body.outcome === "win" ? 0 : null,
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("[platform] record_game_result failed", response.status, text);
      return NextResponse.json({ ok: false }, { status: 502 });
    }
  } catch (error) {
    // Une panne de la plateforme centrale ne doit jamais interrompre une partie en cours.
    console.error("[platform] record_game_result error", error);
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  return NextResponse.json({ ok: true, reported: true });
}

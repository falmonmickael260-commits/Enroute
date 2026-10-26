"use client";

import { use, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { normalizeCode, type Seat } from "@/game/lib/online/api";
import { getOnlineSession, getOnlineSessionServer, subscribeOnlineSession } from "@/game/lib/online/session";
import { getIncomingPlatformToken } from "@/game/lib/online/platformToken";
import { useOnlineRoom } from "@/game/hooks/useOnlineRoom";
import { JoinGate } from "@/game/components/online/JoinGate";
import { OnlineLobby } from "@/game/components/online/OnlineLobby";
import { OnlineGame } from "@/game/components/online/OnlineGame";
import { InnerPage } from "@/game/components/ui/InnerPage";

export default function OnlineRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode(decodeURIComponent(use(params).code));
  const session = useSyncExternalStore(subscribeOnlineSession, getOnlineSession, getOnlineSessionServer);

  const secret = session?.rooms[code]?.secret;
  const playerId = session?.playerId;
  const seat = useMemo<Seat | null>(() => (playerId && secret ? { playerId, secret } : null), [playerId, secret]);

  if (!session) {
    return (
      <InnerPage backHref="/" backLabel="Accueil" title="En ligne">
        <p className="text-center font-hud text-white/60">Chargement…</p>
      </InnerPage>
    );
  }
  if (!seat) return <JoinGate code={code} defaultName={session.name} />;
  return <OnlineRoom code={code} seat={seat} />;
}

function OnlineRoom({ code, seat }: { code: string; seat: Seat }) {
  const router = useRouter();
  const room = useOnlineRoom(code, seat);
  const { meta, game } = room;

  // Ce device ne connaît avec certitude que son propre résultat (son jeton
  // prouve sa seule identité) : il déclare donc sa propre ligne, une seule
  // fois par partie — voir app/api/report-result.
  const reportedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (game?.phase !== "gameover" || reportedRef.current.has(code)) return;
    reportedRef.current.add(code);

    const rgToken = getIncomingPlatformToken();
    if (!rgToken) return; // joueur invité : rien à attribuer

    const me = game.players.find((p) => p.id === seat.playerId);
    if (!me) return;

    fetch("/api/report-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomCode: code,
        playerId: seat.playerId,
        rgToken,
        outcome: game.winnerId === seat.playerId ? "win" : "loss",
        score: me.distance,
      }),
    }).catch(() => {
      /* une panne de la plateforme centrale ne doit jamais perturber la partie */
    });
  }, [code, game, seat.playerId]);

  if (room.lost) {
    return (
      <InnerPage backHref="/" backLabel="Accueil" title="Partie perdue">
        <p className="text-center text-white/70">{room.lost}</p>
        <Link href="/play/join" className="btn-enroute-primary">
          Rejoindre une partie
        </Link>
        <Link href="/play/create" className="btn-enroute-ghost">
          Créer une partie
        </Link>
      </InnerPage>
    );
  }

  if (!meta) {
    return (
      <InnerPage backHref="/" backLabel="Accueil" title="En ligne">
        <p className="text-center font-hud text-white/60">
          {room.connection === "reconnecting" ? "Connexion impossible pour le moment, nouvel essai…" : `Connexion à la partie ${code}…`}
        </p>
      </InnerPage>
    );
  }

  if (meta.status === "lobby" || !game) {
    return (
      <OnlineLobby
        meta={meta}
        playerId={seat.playerId}
        error={room.error}
        onReady={room.toggleReady}
        onStart={room.deal}
        onCar={room.chooseCar}
        onLeave={async () => {
          await room.leave();
          router.push("/");
        }}
      />
    );
  }

  return (
    <OnlineGame
      game={game}
      meta={meta}
      playerId={seat.playerId}
      connection={room.connection}
      error={room.error}
      dispatch={room.dispatch}
      onClearError={room.clearError}
      onReplay={room.deal}
      onExit={() => router.push("/")}
      onNewGame={() => router.push("/play/create")}
    />
  );
}

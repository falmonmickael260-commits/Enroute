"use client";

import { use, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { normalizeCode, type Seat } from "@/game/lib/online/api";
import { getOnlineSession, getOnlineSessionServer, subscribeOnlineSession } from "@/game/lib/online/session";
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

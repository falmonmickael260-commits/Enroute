import type {
  AnimationEvent,
  CardInstance,
  DistributiveOmit,
  AmbianceId,
  GameState,
  HazardType,
  PlayerColor,
  PlayerState,
} from "@/game/types/game";
import { buildDeck, DEFAULT_TARGET, HAND_LIMIT } from "./deck";
import { getCardDef, HAZARD_TO_DEFENSE } from "./cardCatalog";
import {
  canPlayAttack,
  canPlayDefenseReactive,
  canPlayDefenseShield,
  canPlayDistance,
  canPlaySpecial,
} from "./rules";
import { uid } from "@/game/utils/array";

export interface NewGameOptions {
  id: string;
  players: { id: string; name: string; color: PlayerColor; isBot?: boolean }[];
  target?: number;
  ambiance?: AmbianceId;
}

export function createGame(options: NewGameOptions): GameState {
  const deck = buildDeck();
  const players: PlayerState[] = options.players.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    isBot: p.isBot,
    hand: [],
    distance: 0,
    hazard: null,
    limited: false,
    shields: [],
    turboUsed: false,
    extraTurn: false,
    attacksSurvived: 0,
    cardsPlayed: 0,
    shieldsPlayed: 0,
    attacksSent: 0,
    finished: false,
    finishTurn: null,
    connected: true,
    ready: true,
  }));

  for (const player of players) {
    player.hand = deck.splice(0, HAND_LIMIT);
  }

  return {
    id: options.id,
    target: options.target ?? DEFAULT_TARGET,
    players,
    currentPlayerIndex: 0,
    deck,
    discard: [],
    phase: "draw",
    turn: 1,
    winnerId: null,
    log: [
      {
        id: uid("log-"),
        turn: 1,
        actorId: "system",
        message: `La partie commence — direction ${options.target ?? DEFAULT_TARGET} km !`,
        kind: "system",
      },
    ],
    ambiance: options.ambiance ?? "jour",
    startedAt: Date.now(),
    animationQueue: [],
  };
}

function pushAnim(state: GameState, event: DistributiveOmit<AnimationEvent, "id">): void {
  state.animationQueue.push({ ...event, id: uid("anim-") } as AnimationEvent);
}

export type GameAction =
  | { type: "DRAW_CARD" }
  | { type: "PLAY_DISTANCE"; cardUid: string }
  | { type: "PLAY_ATTACK"; cardUid: string; targetId: string }
  | { type: "PLAY_DEFENSE"; cardUid: string }
  | { type: "PLAY_SPECIAL"; cardUid: string; targetId?: string }
  | { type: "DISCARD_CARD"; cardUid: string }
  | { type: "SKIP_TURN" }
  | { type: "CLEAR_ANIMATION" }
  | { type: "NEW_GAME"; options: NewGameOptions };

function log(state: GameState, actorId: string, message: string, kind: GameState["log"][number]["kind"]): void {
  state.log.push({ id: uid("log-"), turn: state.turn, actorId, message, kind });
  if (state.log.length > 60) state.log.shift();
}

function drawOne(state: GameState): CardInstance | null {
  if (state.deck.length === 0) {
    if (state.discard.length === 0) return null;
    // reshuffle discard pile back into the draw pile
    const reshuffled = [...state.discard];
    state.discard = [];
    state.deck = reshuffled.sort(() => Math.random() - 0.5);
    log(state, "system", "La pioche est reconstituée à partir de la défausse.", "system");
  }
  return state.deck.shift() ?? null;
}

function removeFromHand(player: PlayerState, cardUid: string): CardInstance {
  const idx = player.hand.findIndex((c) => c.uid === cardUid);
  if (idx === -1) throw new Error("Card not in hand");
  return player.hand.splice(idx, 1)[0];
}

function checkVictory(state: GameState, player: PlayerState): void {
  if (player.distance >= state.target) {
    player.distance = state.target;
    player.finished = true;
    player.finishTurn = state.turn;
    if (!state.winnerId) {
      state.winnerId = player.id;
      state.phase = "gameover";
      log(state, player.id, `${player.name} franchit la ligne d'arrivée et remporte la partie !`, "victory");
      pushAnim(state, { kind: "victory", playerId: player.id });
    }
  }
}

function endTurnIfNeeded(state: GameState, currentPlayer: PlayerState): void {
  if (state.phase === "gameover") return;
  if (currentPlayer.extraTurn) {
    currentPlayer.extraTurn = false;
    state.phase = "draw";
    return;
  }
  advanceTurn(state);
}

function advanceTurn(state: GameState): void {
  const n = state.players.length;
  let next = state.currentPlayerIndex;
  for (let i = 0; i < n; i++) {
    next = (next + 1) % n;
    if (!state.players[next].finished) break;
  }
  state.currentPlayerIndex = next;
  state.turn += 1;
  state.phase = "draw";
  pushAnim(state, { kind: "turnChange", playerId: state.players[next].id });
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "NEW_GAME") {
    return createGame(action.options);
  }

  // Work on a structurally-cloned draft for simplicity/safety.
  const draft: GameState = structuredCloneSafe(state);
  if (draft.phase === "gameover" && action.type !== "CLEAR_ANIMATION") return draft;

  const player = draft.players[draft.currentPlayerIndex];

  switch (action.type) {
    case "DRAW_CARD": {
      if (draft.phase !== "draw") return draft;
      const card = drawOne(draft);
      if (card) {
        player.hand.push(card);
        pushAnim(draft, { kind: "draw", playerId: player.id });
      }
      draft.phase = "action";
      return draft;
    }

    case "PLAY_DISTANCE": {
      if (draft.phase !== "action") return draft;
      const card = player.hand.find((c) => c.uid === action.cardUid);
      if (!card) return draft;
      const def = getCardDef(card.defId);
      if (def.category !== "distance") return draft;
      if (!canPlayDistance(player, def, draft.target)) return draft;

      removeFromHand(player, action.cardUid);
      draft.discard.push(card);
      const from = player.distance;
      player.distance = Math.min(draft.target, player.distance + (def.value ?? 0));
      player.cardsPlayed += 1;
      log(draft, player.id, `${player.name} joue ${def.title} (+${def.value} km).`, "distance");
      pushAnim(draft, { kind: "move", playerId: player.id, from, to: player.distance });
      checkVictory(draft, player);
      endTurnIfNeeded(draft, player);
      return draft;
    }

    case "PLAY_ATTACK": {
      if (draft.phase !== "action") return draft;
      const card = player.hand.find((c) => c.uid === action.cardUid);
      const victim = draft.players.find((p) => p.id === action.targetId);
      if (!card || !victim) return draft;
      const def = getCardDef(card.defId);
      if (def.category !== "attaque" || !def.hazard) return draft;
      if (!canPlayAttack(player, victim, def, draft.target)) return draft;

      removeFromHand(player, action.cardUid);
      draft.discard.push(card);
      if (def.hazard === "radar") {
        // RADAR is a speed cap, not a full stop — it must not block distance
        // play outright (that's what the `hazard` field does elsewhere).
        victim.limited = true;
      } else {
        victim.hazard = def.hazard;
      }
      player.cardsPlayed += 1;
      player.attacksSent += 1;
      victim.attacksSurvived += 1;
      log(draft, player.id, `${player.name} envoie ${def.title} à ${victim.name} !`, "attack");
      pushAnim(draft, { kind: "hazard", playerId: victim.id, hazard: def.hazard });
      endTurnIfNeeded(draft, player);
      return draft;
    }

    case "PLAY_DEFENSE": {
      if (draft.phase !== "action") return draft;
      const card = player.hand.find((c) => c.uid === action.cardUid);
      if (!card) return draft;
      const def = getCardDef(card.defId);
      if (def.category !== "defense" || !def.defense || !def.counters) return draft;

      const reactive = canPlayDefenseReactive(player, def);
      const shield = !reactive && canPlayDefenseShield(player, def);
      if (!reactive && !shield) return draft;

      removeFromHand(player, action.cardUid);
      draft.discard.push(card);
      player.cardsPlayed += 1;

      if (reactive) {
        player.hazard = null;
        if (def.counters === "radar") player.limited = false;
        log(draft, player.id, `${player.name} répare : ${def.title}.`, "defense");
        pushAnim(draft, { kind: "shield", playerId: player.id, defense: def.defense });
        endTurnIfNeeded(draft, player);
      } else {
        player.shields.push(def.defense);
        player.shieldsPlayed += 1;
        player.extraTurn = true;
        log(draft, player.id, `${player.name} s'équipe de ${def.title} — immunité et tour bonus !`, "defense");
        pushAnim(draft, { kind: "shield", playerId: player.id, defense: def.defense });
        endTurnIfNeeded(draft, player);
      }
      return draft;
    }

    case "PLAY_SPECIAL": {
      if (draft.phase !== "action") return draft;
      const card = player.hand.find((c) => c.uid === action.cardUid);
      if (!card) return draft;
      const def = getCardDef(card.defId);
      if (def.category !== "special" || !def.special) return draft;
      if (!canPlaySpecial(player, def, draft, action.targetId)) return draft;

      switch (def.special) {
        case "turbo":
        case "raccourci":
        case "derniereLigneDroite": {
          removeFromHand(player, action.cardUid);
          draft.discard.push(card);
          const from = player.distance;
          player.distance = Math.min(draft.target, player.distance + (def.value ?? 0));
          player.cardsPlayed += 1;
          log(draft, player.id, `${player.name} joue ${def.title} (+${def.value} km) !`, "special");
          pushAnim(draft, { kind: "move", playerId: player.id, from, to: player.distance });
          checkVictory(draft, player);
          endTurnIfNeeded(draft, player);
          return draft;
        }
        case "depassement": {
          const targetId = action.targetId;
          const victim = targetId ? draft.players.find((p) => p.id === targetId) : undefined;
          if (!victim || victim.distance <= player.distance) return draft;
          removeFromHand(player, action.cardUid);
          draft.discard.push(card);
          const from = player.distance;
          player.distance = Math.min(draft.target, victim.distance + 10);
          player.cardsPlayed += 1;
          log(draft, player.id, `${player.name} double ${victim.name} avec DÉPASSEMENT !`, "special");
          pushAnim(draft, { kind: "move", playerId: player.id, from, to: player.distance });
          checkVictory(draft, player);
          endTurnIfNeeded(draft, player);
          return draft;
        }
        case "gpsStrategique": {
          removeFromHand(player, action.cardUid);
          draft.discard.push(card);
          player.cardsPlayed += 1;
          if (player.hazard || player.limited) {
            const clearedHazard: HazardType = player.hazard ?? "radar";
            player.hazard = null;
            player.limited = false;
            log(draft, player.id, `${player.name} utilise le GPS STRATÉGIQUE pour repartir aussitôt.`, "special");
            pushAnim(draft, { kind: "shield", playerId: player.id, defense: HAZARD_TO_DEFENSE[clearedHazard] });
            endTurnIfNeeded(draft, player);
          } else {
            player.extraTurn = true;
            log(draft, player.id, `${player.name} garde l'avantage grâce au GPS STRATÉGIQUE.`, "special");
            endTurnIfNeeded(draft, player);
          }
          return draft;
        }
      }
      return draft;
    }

    case "DISCARD_CARD": {
      if (draft.phase !== "action") return draft;
      const card = player.hand.find((c) => c.uid === action.cardUid);
      if (!card) return draft;
      removeFromHand(player, action.cardUid);
      draft.discard.push(card);
      log(draft, player.id, `${player.name} défausse une carte.`, "info");
      pushAnim(draft, { kind: "discard", playerId: player.id, cardUid: card.uid });
      endTurnIfNeeded(draft, player);
      return draft;
    }

    case "SKIP_TURN": {
      // Online only: an absent player's turn is passed. If they had already
      // drawn, the extra card goes to the discard so the hand stays at 7.
      if (draft.phase === "action" && player.hand.length > HAND_LIMIT) {
        draft.discard.push(player.hand.pop()!);
      }
      player.extraTurn = false;
      log(draft, "system", `${player.name} est absent — son tour est passé.`, "system");
      advanceTurn(draft);
      return draft;
    }

    case "CLEAR_ANIMATION": {
      draft.animationQueue.shift();
      return draft;
    }

    default:
      return draft;
  }
}

function structuredCloneSafe<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

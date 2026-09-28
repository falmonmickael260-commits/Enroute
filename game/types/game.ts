export type DistanceValue = 25 | 50 | 75 | 100 | 200;

export type HazardType = 'collision' | 'crevaison' | 'panne' | 'radar' | 'barrage';

export type DefenseType = 'reparation' | 'roueSecours' | 'pleinEssence' | 'gps' | 'passageLibre';

export type SpecialType = 'turbo' | 'raccourci' | 'depassement' | 'gpsStrategique' | 'derniereLigneDroite';

export type CardCategory = 'distance' | 'attaque' | 'defense' | 'special';

export interface CardDef {
  category: CardCategory;
  id: string;
  title: string;
  subtitle: string;
  /** Distance cards, and special cards with a fixed distance effect */
  value?: number;
  /** Attack cards only */
  hazard?: HazardType;
  /** Defense cards only */
  defense?: DefenseType;
  /** Counters this hazard */
  counters?: HazardType;
  /** Special cards only */
  special?: SpecialType;
}

export interface CardInstance {
  uid: string;
  defId: string;
}

export type PlayerColor = 'crimson' | 'azure' | 'amber' | 'emerald';

export interface PlayerState {
  id: string;
  name: string;
  color: PlayerColor;
  isBot?: boolean;
  hand: CardInstance[];
  distance: number;
  hazard: HazardType | null;
  limited: boolean;
  shields: DefenseType[];
  turboUsed: boolean;
  extraTurn: boolean;
  attacksSurvived: number;
  cardsPlayed: number;
  shieldsPlayed: number;
  attacksSent: number;
  finished: boolean;
  finishTurn: number | null;
  connected: boolean;
  ready: boolean;
}

export type GamePhase = 'draw' | 'action' | 'gameover';

export interface LogEntry {
  id: string;
  turn: number;
  actorId: string;
  message: string;
  kind: 'info' | 'attack' | 'defense' | 'special' | 'distance' | 'system' | 'victory';
}

export type PendingSelection =
  | { type: 'target'; cardUid: string }
  | null;

export interface GameState {
  id: string;
  target: number;
  players: PlayerState[];
  currentPlayerIndex: number;
  deck: CardInstance[];
  discard: CardInstance[];
  phase: GamePhase;
  turn: number;
  winnerId: string | null;
  log: LogEntry[];
  ambiance: AmbianceId;
  startedAt: number;
  animationQueue: AnimationEvent[];
}

/** Lighting mood of the board. The route itself always crosses every zone
 * (campagne, ville, montagne, côte…). */
export type AmbianceId = 'jour' | 'crepuscule' | 'nuit';

export type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;

export type AnimationEvent = { id: string } & (
  | { kind: 'draw'; playerId: string }
  | { kind: 'discard'; playerId: string; cardUid: string }
  | { kind: 'move'; playerId: string; from: number; to: number }
  | { kind: 'hazard'; playerId: string; hazard: HazardType }
  | { kind: 'shield'; playerId: string; defense: DefenseType }
  | { kind: 'turnChange'; playerId: string }
  | { kind: 'victory'; playerId: string }
);

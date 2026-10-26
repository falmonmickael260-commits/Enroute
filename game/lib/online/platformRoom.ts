"use client";

/**
 * Code de salle reçu en paramètre d'URL `rg_room`, quand la coquille Revanche
 * Games ouvre ce jeu à la suite d'une invitation acceptée.
 *
 * Même principe que `rg_token` (voir platformToken.ts) : lu une fois à
 * l'ouverture, mis en cache en `sessionStorage`, puis retiré de l'URL
 * visible. Le cache couvre un rechargement avant d'avoir rejoint ; il est
 * consommé dès qu'on arrive sur l'écran de la salle, pour qu'une invitation
 * ancienne ne ramène pas le joueur vers une partie déjà finie.
 *
 * Aucune confiance accordée à cette valeur : `normalizeCode` ne fait que
 * mettre en forme, et c'est `roomInfo`/`joinOnlineRoom` (voir
 * game/components/online/JoinGate.tsx) qui diront si la salle existe encore
 * et accepte un pilote de plus.
 */

import { normalizeCode } from "./api";

const STORAGE_KEY = "rg_room";
let cached: string | null | undefined;

export function getIncomingRoomCode(): string | null {
  if (typeof window === "undefined") return null;
  if (cached !== undefined) return cached;

  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("rg_room");

  if (fromUrl) {
    const code = normalizeCode(fromUrl);
    // Le paramètre est retiré même s'il est illisible : il n'a rien à faire
    // dans la barre d'adresse, ni dans un lien partagé ensuite.
    params.delete("rg_room");
    const clean = window.location.pathname + (params.size ? `?${params}` : "");
    window.history.replaceState({}, "", clean);

    // `normalizeCode` renvoie toujours "ENR-XXXX" même à partir d'une entrée
    // vide ("ENR-") : un suffixe trop court dit qu'il n'y avait rien à lire.
    if (code.length === 8) {
      try {
        sessionStorage.setItem(STORAGE_KEY, code);
      } catch {
        /* navigation privée — valeur gardée en mémoire */
      }
      cached = code;
      return cached;
    }

    cached = null;
    return null;
  }

  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    cached = stored && stored.length === 8 ? stored : null;
  } catch {
    cached = null;
  }
  return cached;
}

/** Oublie l'invitation, une fois le joueur arrivé sur l'écran de la salle. */
export function clearIncomingRoomCode(): void {
  cached = null;
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* rien à nettoyer */
  }
}

'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { connectPlatform } from '../../../platform-connector/browser.js';
import { getOnlineSession, adoptOnlineSeat } from '@/game/lib/online/session';
export function PlatformConnector() {
  const router = useRouter();
  useEffect(() => connectPlatform({ game: 'kilomax', session: () => {
    const code = location.pathname.match(/^\/play\/online\/([A-Za-z0-9_-]+)/)?.[1];
    if (!code) return null;
    const s = getOnlineSession(), seat = s.rooms[code];
    return seat ? { code, playerId: s.playerId, secret: seat.secret } : null;
  }, adopt: async s => {
    if (!s.playerId || !s.secret) throw new Error('Session invalide.');
    adoptOnlineSeat(s.code, s.playerId, s.secret);
    router.replace(`/play/online/${encodeURIComponent(s.code)}`);
  } }), [router]);
  return null;
}

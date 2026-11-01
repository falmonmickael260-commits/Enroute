import { contextResponse } from '../../../../platform-connector/server.mjs';
import { platformAdapter } from '@/game/lib/server/platformConnector';
export async function POST(request: Request) { return contextResponse(request, 'kilomax', platformAdapter); }

import { connectorResponse } from '../../../../platform-connector/server.mjs';
import { platformAdapter } from '@/game/lib/server/platformConnector';
export async function POST(request: Request) { return connectorResponse(request, 'kilomax', platformAdapter); }

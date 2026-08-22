import { AccessToken } from 'livekit-server-sdk';
import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase'; // Assuming you need this to verify auth

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');
  const username = req.nextUrl.searchParams.get('username');
  
  if (!room) {
    return Response.json({ error: 'Missing "room" query parameter' }, { status: 400 });
  } else if (!username) {
    return Response.json({ error: 'Missing "username" query parameter' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return Response.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, { identity: username, name: username });
  at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });

  return Response.json({ token: await at.toJwt() });
}

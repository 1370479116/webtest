import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

const USERS_SET_KEY = 'webtest:visitors:set';

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const userId = String(body?.userId || '').trim();
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }

    // Unique visitors
    await kv.sadd(USERS_SET_KEY, userId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const detail = e instanceof Error ? (e.stack || e.message) : String(e);
    return NextResponse.json({ ok: false, error: 'server_error', detail }, { status: 500 });
  }
}

export async function GET() {
  try {
    const uniqueVisitors = await kv.scard(USERS_SET_KEY);
    return NextResponse.json({ ok: true, uniqueVisitors });
  } catch (e) {
    const detail = e instanceof Error ? (e.stack || e.message) : String(e);
    return NextResponse.json({ ok: false, error: 'server_error', detail }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

type FeedbackItem = {
  id: string;
  userId: string;
  qKey: string;
  type: string;
  suggest: string;
  existing?: string;
  at: number;
  ua?: string;
  ref?: string;
};

const LIST_KEY = 'webtest:feedback:list';

function getAdminToken(req: Request) {
  const h = req.headers.get('authorization') || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || '';
}

function requireAdmin(req: Request) {
  const expected = process.env.ADMIN_TOKEN || '';
  if (!expected) return false;
  const got = getAdminToken(req);
  return got && got === expected;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<FeedbackItem>;
    const item: FeedbackItem = {
      id: String(body.id || ''),
      userId: String(body.userId || ''),
      qKey: String(body.qKey || ''),
      type: String(body.type || ''),
      suggest: String(body.suggest || ''),
      existing: body.existing ? String(body.existing) : undefined,
      at: Number(body.at || Date.now()),
      ua: body.ua ? String(body.ua) : undefined,
      ref: body.ref ? String(body.ref) : undefined
    };

    if (!item.id || !item.userId || !item.qKey || !item.type || !item.suggest) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }

    await kv.lpush(LIST_KEY, JSON.stringify(item));
    await kv.ltrim(LIST_KEY, 0, 4999);

    return NextResponse.json({ ok: true });
  } catch (e) {
    const detail = e instanceof Error
      ? (e.stack || e.message)
      : String(e);
    return NextResponse.json({ ok: false, error: 'server_error', detail }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(2000, Math.max(1, Number(searchParams.get('limit') || '500')));

  const rows = (await kv.lrange<string>(LIST_KEY, 0, limit - 1)) || [];
  const items: FeedbackItem[] = [];
  for (const r of rows) {
    try {
      items.push(JSON.parse(r));
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ ok: true, items });
}

export async function DELETE(req: Request) {
  if (!requireAdmin(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  await kv.del(LIST_KEY);
  return NextResponse.json({ ok: true });
}

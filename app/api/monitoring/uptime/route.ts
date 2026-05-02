import { NextResponse } from 'next/server';
import { getSessionToken, getSessionUser } from '@/lib/auth-server';
import { addDocument } from '@/lib/firestore-edge';
import { getRuntimeEnv } from '@/lib/cloudflare-env';

export const runtime = 'nodejs';

function normalizeUrl(value: string) {
  const url = new URL(value.startsWith('http') ? value : `https://${value}`);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Nur HTTP/HTTPS URLs koennen geprueft werden');
  }
  return url;
}

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase();
  const parts = host.split('.').map((part) => Number(part));
  const isPrivate172 = parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31;
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '0.0.0.0' ||
    host.startsWith('127.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    isPrivate172 ||
    host.startsWith('169.254.')
  );
}

async function fetchUptime(url: URL) {
  const startedAt = Date.now();
  try {
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    });

    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
      });
    }

    return {
      status: response.status >= 200 && response.status < 500 ? 'up' as const : 'down' as const,
      statusCode: response.status,
      responseTimeMs: Date.now() - startedAt,
    };
  } catch {
    return {
      status: 'down' as const,
      responseTimeMs: Date.now() - startedAt,
    };
  }
}

export async function POST(req: Request) {
  const env = getRuntimeEnv();
  const user = await getSessionUser();
  const token = await getSessionToken();
  if (!user || !token) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  try {
    const body = await req.json();
    const projectId = body.projectId;
    const target = normalizeUrl(String(body.url || ''));

    if (!projectId) {
      return NextResponse.json({ error: 'projectId fehlt' }, { status: 400 });
    }

    if (isPrivateHost(target.hostname)) {
      return NextResponse.json({ error: 'Private oder lokale Hosts koennen nicht geprueft werden' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const result = await fetchUptime(target);
    const check = await addDocument('uptimeChecks', {
      projectId,
      userId: user.uid,
      url: target.toString(),
      status: result.status,
      statusCode: result.statusCode || null,
      responseTimeMs: result.responseTimeMs,
      checkedAt: now,
      createdAt: now,
    }, token, env);

    let alertEvent = null;
    if (result.status === 'down') {
      alertEvent = await addDocument('alertEvents', {
        projectId,
        userId: user.uid,
        type: 'website_down',
        severity: 'critical',
        title: 'Website down',
        description: `${target.toString()} war beim Uptime-Check nicht erreichbar oder lieferte einen Serverfehler.`,
        url: target.toString(),
        status: 'open',
        createdAt: now,
      }, token, env).catch(() => null);
    }

    return NextResponse.json({
      check: { ...check, id: check.id },
      alertEvent,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Uptime Check fehlgeschlagen' }, { status: 500 });
  }
}

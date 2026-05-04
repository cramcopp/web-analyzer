import { NextResponse } from 'next/server';
import { runLightweightToolCheck } from '@/lib/lightweight-tool-checks';

export const runtime = 'nodejs';

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unbekannter Fehler';
}

async function readBody(req: Request) {
  try {
    const body = await req.json();
    const tool = typeof body?.tool === 'string' ? body.tool.trim() : '';
    const input = typeof body?.input === 'string' ? body.input.trim() : '';

    if (!tool) return { error: 'Tool fehlt' };
    if (!input) return { error: 'Eingabe fehlt' };

    return { tool, input };
  } catch {
    return { error: 'Ungültiges JSON im Request Body' };
  }
}

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    if ('error' in body) {
      return NextResponse.json({ error: body.error }, { status: 400 });
    }

    const result = await runLightweightToolCheck(body.tool, body.input);
    return NextResponse.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.includes('Unbekanntes Tool') ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

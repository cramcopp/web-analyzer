import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('wap_session');
  cookieStore.delete('wap_refresh');
  return NextResponse.json({ success: true });

}

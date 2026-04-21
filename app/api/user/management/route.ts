import { NextResponse } from 'next/server';
import { updateUserProfile, deleteUserAccount } from '../../../lib/auth-server';

export const runtime = 'edge';

export async function PATCH(req: Request) {
  try {
    const data = await req.json();
    const result = await updateUserProfile(data);
    return NextResponse.json({ success: true, user: result });
  } catch (error: any) {
    console.error('Update User Error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE() {
  try {
    await deleteUserAccount();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete User Error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

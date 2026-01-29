// src/app/api/auth/webhook/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const event = data.event;
    const fid = event?.fid || data.fid;
    const notificationDetails = event?.notificationDetails || data.notificationDetails;

    if (fid && notificationDetails) {
      await supabaseAdmin.from('notifications').upsert({
        fid: fid,
        token: notificationDetails.token,
        url: notificationDetails.url,
        updated_at: new Date().toISOString()
      }, { onConflict: 'fid' });

      return NextResponse.json({ success: true });
    }

    if (event?.type === "notifications_disabled") {
      await supabaseAdmin.from('notifications').delete().eq('fid', fid);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
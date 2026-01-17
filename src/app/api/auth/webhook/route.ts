// src/app/api/auth/webhook/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabase"; // Pastikan path ini benar

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Debug untuk melihat data asli di Vercel Logs
    console.log("Webhook Received:", JSON.stringify(data, null, 2));

    const fid = data.fid;
    // Farcaster mengirim token bisa di root atau di dalam objek event
    const notificationDetails = data.notificationDetails || data.event?.notificationDetails;

    if (fid && notificationDetails) {
      // Simpan/Update token ke tabel notifications
      const { error } = await supabaseAdmin.from('notifications').upsert({
           fid: fid,
          updated_at: new Date().toISOString()
      });

      if (error) {
        console.error("Supabase Error:", error.message);
        throw error;
      }
      
      console.log(`Success: Token updated for FID ${fid}`);
      return NextResponse.json({ success: true });
    }

    console.warn("Webhook ignored: Missing FID or notificationDetails");
    return NextResponse.json({ success: false, message: "Incomplete data" });

  } catch (err) {
    console.error("Webhook Route Error:", err);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
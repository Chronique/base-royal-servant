// src/app/api/auth/webhook/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "~/lib/supabase"; // Path sudah benar sesuai struktur Anda

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Debug untuk melihat data asli (Sangat membantu untuk verifikasi struktur)
    console.log("Webhook Received:", JSON.stringify(data, null, 2));

    // Event Farcaster biasanya dibungkus dalam objek 'event'
    const event = data.event;
    const fid = event?.fid || data.fid;
    const notificationDetails = event?.notificationDetails || data.notificationDetails;

    // Pastikan kita hanya memproses jika user mengaktifkan notifikasi
    if (fid && notificationDetails) {
      // Simpan FID, Token, dan URL ke Supabase
      const { error } = await supabaseAdmin.from('notifications').upsert({
        fid: fid,
        token: notificationDetails.token, // WAJIB: Token unik untuk kirim notif
        url: notificationDetails.url,     // WAJIB: Host URL notifikasi Farcaster
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'fid' // Pastikan melakukan update jika FID sudah ada
      });

      if (error) {
        console.error("Supabase Error:", error.message);
        throw error;
      }
      
      console.log(`Success: Notification token saved for FID ${fid}`);
      return NextResponse.json({ success: true });
    }

    // Jika event adalah penonaktifan notifikasi (notifications_disabled)
    if (event?.type === "notifications_disabled") {
      await supabaseAdmin.from('notifications').delete().eq('fid', fid);
      console.log(`Success: Notification disabled and removed for FID ${fid}`);
      return NextResponse.json({ success: true });
    }

    console.warn("Webhook ignored: Missing FID or notificationDetails");
    return NextResponse.json({ success: false, message: "Incomplete data" });

  } catch (err) {
    console.error("Webhook Route Error:", err);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
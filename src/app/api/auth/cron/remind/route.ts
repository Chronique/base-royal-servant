// src/app/api/auth/cron/remind/route.ts
import { supabaseAdmin } from '~/lib/supabase';
import { METADATA } from '~/lib/utils'; // Impor METADATA untuk konsistensi URL

export const dynamic = 'force-dynamic';

const messages = [
  { 
    title: "🛡️ Weekly Security Sweep", 
    body: "Greetings! It's a new week. Let's ensure your palace is safe from old token permissions." 
  },
  { 
    title: "✨ Monday Purification", 
    body: "My liege, would you like to start the week with a clean wallet? Arjuna is ready for a security check." 
  }
];

export async function GET(req: Request) {
  // 1. Proteksi CRON_SECRET: Memastikan hanya sistem resmi yang bisa memicu pengiriman notifikasi
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. Ambil data lengkap (fid, token, url) dari tabel notifications di Supabase
    const { data: users, error } = await supabaseAdmin
      .from('notifications')
      .select('fid, token, url');

    if (error) {
      throw new Error(`Supabase Query Error: ${error.message}`);
    }

    if (!users || users.length === 0) {
      return Response.json({ status: "No users to notify" });
    }

    // Pilih pesan acak dari daftar yang tersedia
    const msg = messages[Math.floor(Math.random() * messages.length)];

    // 3. Kirim notifikasi secara batch menggunakan Promise.all
    const results = await Promise.all(users.map(async (user) => {
      if (!user.token || !user.url) return { fid: user.fid, status: "skipped" };

      try {
        const response = await fetch(user.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            notification: {
              title: msg.title,
              body: msg.body,
              // Perbaikan: Gunakan homeUrl dari utils.ts jika env Vercel belum diatur
              target_url: process.env.NEXT_PUBLIC_APP_URL || METADATA.homeUrl, 
            }
          }),
        });

        return { fid: user.fid, status: response.ok ? "sent" : "failed" };
      } catch (e) {
        console.error(`Failed to send to FID ${user.fid}:`, e);
        return { fid: user.fid, status: "error" };
      }
    }));

    return Response.json({ 
      status: "Reminders processed",
      successCount: results.filter(r => r.status === "sent").length,
      totalUsers: users.length 
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    console.error("Cron Job Error:", errorMessage);
    
    return Response.json(
      { error: "Cron execution failed", details: errorMessage }, 
      { status: 500 }
    );
  }
}
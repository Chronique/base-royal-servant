// src/app/api/auth/cron/remind/route.ts
import { supabaseAdmin } from '~/lib/supabase'; // Pastikan path benar sesuai struktur Anda

export const dynamic = 'force-dynamic';

const messages = [
  { title: "🛡️ Palace Guard Alert", body: "Greetings! It's time to sweep your wallet from unwanted permissions." },
  { title: "✨ Royal Purification", body: "A week has passed, my liege. Shall we cleanse your treasury today?" },
  { title: "💂‍♂️ Servant's Duty", body: "Your wallet health is our priority. Let's perform the weekly security sweep!" }
];

export async function GET(req: Request) {
  // 1. Proteksi CRON_SECRET (Pastikan sudah diatur di Environment Variables Vercel)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. Ambil data lengkap (fid, token, url) dari Supabase
    // Kita mengambil token dan url yang disimpan saat webhook 'notifications_enabled'
    const { data: users, error } = await supabaseAdmin
      .from('notifications')
      .select('fid, token, url'); 

    if (error) throw error;

    if (!users || users.length === 0) {
      return Response.json({ status: "No users to notify" });
    }

    // 3. Pilih pesan acak sesuai pedoman Base (Gunakan Emoji & fungsional)
    const msg = messages[Math.floor(Math.random() * messages.length)];

    // 4. Kirim notifikasi secara Paralel menggunakan Token masing-masing user
    const results = await Promise.all(users.map(async (user) => {
      // Validasi apakah user memiliki token dan url yang valid
      if (!user.token || !user.url) {
        return { fid: user.fid, status: "skipped", reason: "Missing notification metadata" };
      }

      try {
        const response = await fetch(user.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${user.token}`, // Token otentikasi unik user
          },
          body: JSON.stringify({
            notification: {
              title: msg.title,
              body: msg.body,
              target_url: process.env.NEXT_PUBLIC_APP_URL, // URL yang dibuka saat notif diklik
            }
          }),
        });

        return { 
          fid: user.fid, 
          status: response.ok ? "sent" : "failed",
          statusCode: response.status 
        };
      } catch (e) {
        return { fid: user.fid, status: "error", details: (e as Error).message };
      }
    }));

    const successCount = results.filter(r => r.status === "sent").length;

    return Response.json({ 
      status: "Reminders processed",
      successCount,
      totalUsers: users.length,
      results 
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    console.error("Cron Error:", errorMessage);
    
    return Response.json(
      { error: "Cron failed", details: errorMessage }, 
      { status: 500 }
    );
  }
}
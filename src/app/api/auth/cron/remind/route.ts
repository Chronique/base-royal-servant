// src/app/api/auth/cron/remind/route.ts
import { supabaseAdmin } from '~/lib/supabase';

export const dynamic = 'force-dynamic';

const messages = [
  { title: "🛡️ Palace Guard Alert", body: "Greetings! It's time to sweep your wallet from unwanted permissions." },
  { title: "✨ Royal Purification", body: "A week has passed, my liege. Shall we cleanse your treasury today?" },
  { title: "💂‍♂️ Servant's Duty", body: "Your wallet health is our priority. Let's perform the weekly security sweep!" }
];

export async function GET(req: Request) {
  // 1. Proteksi CRON_SECRET (Pastikan Bearer <token> tanpa tanda kurung siku)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. Ambil data lengkap (fid, token, url) dari Supabase
    const { data: users, error } = await supabaseAdmin
      .from('notifications')
      .select('fid, token, url');

    if (error) {
      // Supabase error bukan Error instance, kita bungkus agar terbaca di catch
      throw new Error(`Supabase Query: ${error.message || 'Unknown DB Error'}`);
    }

    if (!users || users.length === 0) {
      return Response.json({ status: "No users to notify" });
    }

    const msg = messages[Math.floor(Math.random() * messages.length)];

    // 3. Kirim notifikasi secara langsung ke URL Farcaster masing-masing user
    // Metode ini lebih akurat karena menggunakan token unik yang disimpan webhook
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
              target_url: process.env.NEXT_PUBLIC_APP_URL, 
            }
          }),
        });

        return { fid: user.fid, status: response.ok ? "sent" : "failed" };
      } catch (e) {
        return { fid: user.fid, status: "error" };
      }
    }));

    return Response.json({ 
      status: "Reminders processed",
      successCount: results.filter(r => r.status === "sent").length,
      total: users.length 
    });

  } catch (err: unknown) {
    // Perbaikan Catch: Menangani non-Error object agar tidak jadi "Unknown Error"
    const errorMessage = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Cron Error Detail:", errorMessage);
    
    return Response.json(
      { error: "Cron failed", details: errorMessage }, 
      { status: 500 }
    );
  }
}
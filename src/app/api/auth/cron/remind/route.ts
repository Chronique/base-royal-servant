import { supabaseAdmin } from '~/lib/supabase';

const messages = [
  { title: "🛡️ Palace Guard Alert", body: "Greetings! It's time to sweep your wallet from unwanted permissions." },
  { title: "✨ Royal Purification", body: "A week has passed, my liege. Shall we cleanse your treasury today?" },
  { title: "💂‍♂️ Servant's Duty", body: "Your wallet health is our priority. Let's perform the weekly security sweep!" }
];

export async function GET(req: Request) {
  // 1. Proteksi CRON_SECRET tetap dipertahankan
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. Ambil semua FID dari tabel notifications di Supabase
    // Karena Neynar yang mengelola token, kita hanya butuh daftar FID-nya saja
    const { data: users, error } = await supabaseAdmin
      .from('notifications')
      .select('fid');

    if (error) throw error;

    if (!users || users.length === 0) {
      return Response.json({ status: "No users to notify" });
    }

    // 3. Ekstrak FID ke dalam array angka
    const targetFids = users.map(user => Number(user.fid));

    // 4. Pilih pesan acak
    const msg = messages[Math.floor(Math.random() * messages.length)];

    // 5. Kirim satu kali panggilan API ke Neynar untuk seluruh target_fids
    const response = await fetch("https://api.neynar.com/v2/farcaster/frame/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEYNAR_API_KEY as string, // Pastikan sudah diatur di Vercel
      },
      body: JSON.stringify({
        notification: {
          title: msg.title,
          body: msg.body,
          target_url: process.env.NEXT_PUBLIC_APP_URL, // URL tujuan saat notifikasi diklik
        },
        priority: "high",
        target_fids: targetFids, // Daftar FID yang sudah dikumpulkan
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to send via Neynar");
    }

    return Response.json({ 
      status: "Reminders sent successfully via Neynar",
      recipientCount: targetFids.length 
    });

  } catch (err: any) {
    console.error("Cron Error:", err.message);
    return Response.json({ error: "Cron failed", details: err.message }, { status: 500 });
  }
}
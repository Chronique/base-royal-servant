// src/app/api/auth/cron/remind/route.ts
import { supabaseAdmin } from '~/lib/supabase';

export const dynamic = 'force-dynamic';

const messages = [
  { title: "🛡️ Palace Guard Alert", body: "Greetings! It's time to sweep your wallet from unwanted permissions." },
  { title: "✨ Royal Purification", body: "A week has passed, my liege. Shall we cleanse your treasury today?" },
  { title: "💂‍♂️ Servant's Duty", body: "Your wallet health is our priority. Let's perform the weekly security sweep!" }
];

export async function GET(req: Request) {
  // 1. Proteksi CRON_SECRET
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // 2. Ambil FID dari Supabase
    const { data: users, error } = await supabaseAdmin
      .from('notifications')
      .select('fid');

    if (error) throw error;

    if (!users || users.length === 0) {
      return Response.json({ status: "No users to notify" });
    }

    // 3. Konversi ke array number agar sesuai spek Neynar
    const targetFids = users.map(user => Number(user.fid));

    // 4. Pilih pesan acak
    const msg = messages[Math.floor(Math.random() * messages.length)];

    // 5. Tembak API Neynar
    const response = await fetch("https://api.neynar.com/v2/farcaster/frame/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.NEYNAR_API_KEY as string,
      },
      body: JSON.stringify({
        notification: {
          title: msg.title,
          body: msg.body,
          target_url: process.env.NEXT_PUBLIC_APP_URL, 
        },
        priority: "high",
        target_fids: targetFids, 
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      // Melempar error dengan pesan dari Neynar jika ada
      throw new Error(result.message || "Failed to send via Neynar");
    }

    return Response.json({ 
      status: "Reminders sent successfully via Neynar",
      recipientCount: targetFids.length 
    });

  } catch (err: unknown) {
    // FIX: Gunakan 'unknown' dan ambil message secara aman untuk menghindari error 'any'
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    console.error("Cron Error:", errorMessage);
    
    return Response.json(
      { error: "Cron failed", details: errorMessage }, 
      { status: 500 }
    );
  }
}
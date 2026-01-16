import { supabaseAdmin } from '~/lib/supabase';

const messages = [
  { title: "🛡️ Palace Guard Alert", body: "Greetings! It's time to sweep your wallet from unwanted permissions." },
  { title: "✨ Royal Purification", body: "A week has passed, my liege. Shall we cleanse your treasury today?" },
  { title: "💂‍♂️ Servant's Duty", body: "Your wallet health is our priority. Let's perform the weekly security sweep!" }
];

export async function GET(req: Request) {
  // Proteksi CRON_SECRET agar tidak ditembak sembarang orang
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { data: users, error } = await supabaseAdmin
      .from('notifications')
      .select('*');

    if (error) throw error;

    if (users) {
      for (const user of users) {
        const msg = messages[Math.floor(Math.random() * messages.length)];

        await fetch(user.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationId: crypto.randomUUID(),
            title: msg.title,
            body: msg.body,
            targetUrl: process.env.NEXT_PUBLIC_APP_URL,
            tokens: [user.token]
          })
        });
      }
    }

    return Response.json({ status: "Reminders sent successfully" });
  } catch (err) {
    return Response.json({ error: "Cron failed" }, { status: 500 });
  }
}
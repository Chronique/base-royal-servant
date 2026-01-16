import { Errors, createClient as createFarcasterClient } from "@farcaster/quick-auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// 1. Inisialisasi Supabase dengan alias
const supabase = createSupabaseClient(
  process.env.SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 2. Inisialisasi Farcaster Quick-Auth dengan alias
const farcasterClient = createFarcasterClient();

/**
 * WEBHOOK: Menyimpan Token Notifikasi (POST)
 */
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { fid, notificationDetails } = data;

    if (fid && notificationDetails) {
      // Menggunakan upsert: Simpan jika baru, update jika FID sudah ada
      const { error } = await supabase.from('notifications').upsert({
        fid: fid,
        token: notificationDetails.token,
        url: notificationDetails.url,
        updated_at: new Date().toISOString()
      });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook Error:", err);
    return NextResponse.json({ error: "Failed to save notification token" }, { status: 500 });
  }
}

/**
 * AUTH: Verifikasi JWT Farcaster (GET)
 */
export async function GET(request: NextRequest) {
  const authorization = request.headers.get("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Missing token" }, { status: 401 });
  }

  try {
    const token = authorization.split(" ")[1];
    const domain = getUrlHost(request);

    // Verifikasi menggunakan client Farcaster
    const payload = await farcasterClient.verifyJwt({
      token,
      domain,
    });

    return NextResponse.json({
      success: true,
      user: {
        fid: payload.sub,
        issuedAt: payload.iat,
        expiresAt: payload.exp,
      },
    });

  } catch (e) {
    if (e instanceof Errors.InvalidTokenError) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json({ message: e instanceof Error ? e.message : "Internal Error" }, { status: 500 });
  }
}

// Helper function untuk menentukan domain
function getUrlHost(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host;
    } catch {
      console.warn("Invalid origin header");
    }
  }

  const host = request.headers.get("host");
  if (host) return host;

  const urlValue = process.env.VERCEL_ENV === "production" 
    ? process.env.NEXT_PUBLIC_URL! 
    : `https://${process.env.VERCEL_URL || "localhost:3000"}`;

  return new URL(urlValue).host;
}
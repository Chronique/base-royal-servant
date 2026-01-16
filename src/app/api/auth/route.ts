// src/app/api/auth/route.ts
import { Errors, createClient } from "@farcaster/quick-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const farcasterClient = createClient();

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("Authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return NextResponse.json({ message: "Missing token" }, { status: 401 });
  }

  try {
    const token = authorization.split(" ")[1];
    const host = request.headers.get("host") || "";
    
    // Verifikasi JWT dari Farcaster
    const payload = await farcasterClient.verifyJwt({
      token,
      domain: host,
    });

    return NextResponse.json({
      success: true,
      user: {
        fid: payload.sub,
      },
    });
  } catch (e) {
    if (e instanceof Errors.InvalidTokenError) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json({ message: "Internal Error" }, { status: 500 });
  }
}
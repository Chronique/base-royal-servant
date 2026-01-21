import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { address } = await req.json();
    const url = `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`; // Gunakan server-side env (tanpa NEXT_PUBLIC_)

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'alchemy_getTokenAllowances',
        params: [{ owner: address }],
        id: 1,
      }),
    });

    const data = await response.json();
    return NextResponse.json(data.result.tokenAllowances);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch allowances' }, { status: 500 });
  }
}
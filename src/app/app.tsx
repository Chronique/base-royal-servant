// src/app/app.tsx
"use client";

import React, { Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { useMiniKit } from '@coinbase/onchainkit/minikit';

// Import Demo secara dynamic (hanya jalan di sisi client)
const Demo = dynamic(() => import("~/components/Demo").then((mod) => mod.Demo), {
  ssr: false,
});

export default function App() {
  const { isFrameReady, setFrameReady, context } = useMiniKit();

  // Beritahu Farcaster/Coinbase bahwa app siap tampil
  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Ambil FID dari context Farcaster (jika ada)
  const userFid = context?.user?.fid;

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <p className="font-bold animate-pulse text-blue-600">Initializing Base Revoke...</p>
        </div>
      }>
        <Demo userFid={userFid} />
      </Suspense>
    </div>
  );
}
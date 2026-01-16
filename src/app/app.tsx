// src/app/app.tsx
"use client";

import React, { Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { useMiniKit } from '@coinbase/onchainkit/minikit';

// Fix Type Error: Definisikan tipe props untuk dynamic import
const Demo = dynamic<{ userFid?: number }>(
  () => import("~/components/Demo").then((mod) => mod.Demo), 
  { ssr: false }
);

export default function App() {
  const { isFrameReady, setFrameReady, context } = useMiniKit();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  const userFid = context?.user?.fid;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
          <p className="font-black animate-pulse text-[#D4AF37] italic uppercase tracking-widest">SOWAN...</p>
        </div>
      }>
        <Demo userFid={userFid} />
      </Suspense>
    </div>
  );
}
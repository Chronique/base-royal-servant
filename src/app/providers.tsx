"use client";

import { ReactNode, useState } from 'react';
import { http, createConfig, WagmiProvider, fallback } from 'wagmi'; // Tambahkan fallback di sini
import { base } from 'wagmi/chains';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 1. Inisialisasi Config dengan Fallback Transports
export const config = createConfig({
  chains: [base],
  transports: {
    [base.id]: fallback([
      http(`https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`),
      http(`https://rpc.ankr.com/base/${process.env.NEXT_PUBLIC_ANKR_KEY}`),
      http(`https://base-mainnet.quiknode.pro/${process.env.NEXT_PUBLIC_QUICKNODE_KEY}/`),
    ]),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  // 2. Wagmi v2 memerlukan QueryClientProvider
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MiniKitProvider
          enabled={true}
          notificationProxyUrl="/api/notify"
          autoConnect={true}
        >
          {children}
        </MiniKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
"use client";

import { createConfig, http, WagmiProvider, fallback } from "wagmi";
import { base, optimism } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { coinbaseWallet, injected } from "wagmi/connectors"; // Tambahkan ini
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { ReactNode, useState } from "react";

export const config = createConfig({
  chains: [base, optimism],
  transports: {
    [base.id]: fallback([
      http(`https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`),
      http()
    ]),
    [optimism.id]: http(),
  },
  connectors: [
    farcasterMiniApp(), 
    coinbaseWallet({ 
      appName: "Base Royal Servant",
      preference: 'all' // Mendukung Smart Wallet & EOA
    }),
    injected(), // Mendukung MetaMask, Rabby, dll.
  ],
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <MiniKitProvider enabled={true}>
          {children}
        </MiniKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
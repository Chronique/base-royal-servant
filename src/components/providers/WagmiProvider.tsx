// src/components/providers/WagmiProvider.tsx
import { createConfig, http, WagmiProvider } from "wagmi";
import { base, optimism } from "wagmi/chains";
import { baseAccount, coinbaseWallet, injected } from "wagmi/connectors"; // Tambahkan ini
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

export const config = createConfig({
  chains: [base, optimism],
  transports: { [base.id]: http(), [optimism.id]: http() },
  connectors: [
    farcasterMiniApp(), 
    baseAccount({ appName: "Royal Servant" }), // Untuk Base Smart Wallet
    coinbaseWallet({ appName: "Royal Servant", preference: 'all' }),
    injected(), // Untuk Metamask, Rainbow, dll
  ],
});
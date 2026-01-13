/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient, useConnect } from "wagmi";
import { useSendCalls } from 'wagmi/experimental';
import { AllowanceCard, type AllowanceItem } from "./AllowanceCard"; 
import { encodeFunctionData, type Address } from 'viem';
import { Search, Trophy, Trash2, RefreshCw } from "lucide-react";

export const Demo = ({ userFid }: { userFid?: number }) => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { connect, connectors } = useConnect();
  const { sendCalls } = useSendCalls();

  const [activeTab, setActiveTab] = useState("scanning");
  const [allowances, setAllowances] = useState<AllowanceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 1. SCAN KEAMANAN (GOPLUS TETAP BISA CEK TOKEN DI BASE SATU PER SATU)
  const checkAssetSecurity = async (tokenAddr: string) => {
    try {
      const res = await fetch(`https://api.goplussecurity.com/api/v1/token_security/8453?contract_addresses=${tokenAddr}`);
      const data = await res.json();
      const security = data.result[tokenAddr.toLowerCase()];
      return {
        isHoneypot: security?.is_honeypot === "1",
        isScam: /scan|claim|airdrop/i.test(security?.token_symbol || "")
      };
    } catch {
      return { isHoneypot: false, isScam: false };
    }
  };

  // 2. LOAD DATA (ALCHEMY UNTUK MENDAPATKAN LIST ASSET DI BASE)
  const loadWalletData = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      // Alchemy mendukung Base secara resmi
      const response = await fetch(`https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`, {
        method: 'POST',
        body: JSON.stringify({ 
          jsonrpc: '2.0', 
          method: 'alchemy_getTokenAllowances', 
          params: [{ owner: address }], 
          id: 1 
        }),
      });
      const json = await response.json();
      const rawList = json.result?.tokenAllowances || [];

      const enriched = await Promise.all(rawList.map(async (item: any, idx: number) => {
        // Cek keamanan per token
        const security = await checkAssetSecurity(item.tokenAddress);
        
        // Ambil simbol token secara on-chain jika Alchemy tidak memberikannya
        const symbol = await publicClient?.readContract({
          address: item.tokenAddress as Address,
          abi: [{ name: 'symbol', type: 'function', inputs: [], outputs: [{ type: 'string' }] }],
          functionName: 'symbol',
        }).catch(() => "Unknown");

        return {
          id: idx.toString(),
          tokenAddress: item.tokenAddress,
          tokenSymbol: symbol as string,
          spender: item.spender,
          amount: item.allowance.startsWith("0xffffff") ? "Unlimited" : "Limited",
          risk: (item.allowance.startsWith("0xffffff") || security.isHoneypot) ? 'high' : 'low',
          isScam: security.isScam,
          type: 'TOKEN'
        } as AllowanceItem;
      }));

      setAllowances(enriched);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    if (isConnected) loadWalletData();
  }, [isConnected, loadWalletData]);

  // UI rendering tetap sama seperti sebelumnya...
  return (
    <div className="p-4">
      {/* Tombol Refresh untuk memastikan data terbaru terambil */}
      <button onClick={loadWalletData} className="flex items-center gap-2 text-xs font-bold text-blue-600 mb-4">
        <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> RE-SCAN WALLET
      </button>
      
      {/* Daftar Allowance */}
      {allowances.map(item => (
        <AllowanceCard key={item.id} item={item} selected={false} onToggle={() => {}} />
      ))}
    </div>
  );
};
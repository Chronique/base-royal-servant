/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, usePublicClient, useConnect } from "wagmi";
import { useSendCalls } from 'wagmi/experimental';
import { AllowanceCard, type AllowanceItem } from "./AllowanceCard"; 
import { encodeFunctionData, type Address } from 'viem';
import { 
  Search, 
  Trophy, 
  Trash2, 
  ShieldCheck, 
  AlertOctagon, 
  RefreshCw,
  Wallet 
} from "lucide-react";

const erc20Abi = [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }] as const;

export const Demo = ({ userFid }: { userFid?: number }) => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { connect, connectors } = useConnect();
  const { sendCalls } = useSendCalls();

  const [activeTab, setActiveTab] = useState("scanning");
  const [allowances, setAllowances] = useState<AllowanceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [walletScore, setWalletScore] = useState(100);

  // --- 1. SMART CONNECTION LOGIC ---
  useEffect(() => {
    if (isConnected) return;

    // Cari konektor Farcaster (untuk di dalam Warpcast)
    const farcaster = connectors.find((c) => c.id === "farcaster");
    // Cari Coinbase Wallet (untuk Smart Wallet Base)
    const cbWallet = connectors.find((c) => c.id === "coinbaseWalletSDK");

    if (farcaster) {
      connect({ connector: farcaster });
    } else if (cbWallet) {
      // Auto-connect ke Coinbase Smart Wallet jika di browser
      connect({ connector: cbWallet });
    }
    
    sdk.actions.ready();
  }, [connectors, isConnected, connect]);

  // --- 2. LOAD DATA (DE.FI - TANPA FILTER RISIKO) ---
  const loadSecurityData = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    
    const DEFI_API_URL = "https://api.de.fi/graphql";
    const query = `
      query ($address: String!, $chainId: Int!) {
        shieldApprovals(address: $address, chainId: $chainId) {
          address spender allowance riskScore
          token { address symbol name }
        }
      }
    `;

    try {
      const response = await fetch(DEFI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": process.env.NEXT_PUBLIC_DEFI_API_KEY || "",
        },
        body: JSON.stringify({
          query,
          variables: { address: address.toLowerCase(), chainId: 8453 },
        }),
      });

      const json = await response.json();
      const rawApprovals = json.data?.shieldApprovals || [];

      // MAPPING SEMUA KOIN (Tanpa filter > 40 agar muncul semua)
      const enriched: AllowanceItem[] = rawApprovals.map((item: any, idx: number) => ({
        id: `defi-${idx}`,
        tokenAddress: item.token.address,
        tokenSymbol: item.token.symbol || "Unknown",
        spender: item.spender,
        amount: item.allowance === "unlimited" ? "Unlimited" : "Limited",
        risk: item.riskScore > 30 ? 'high' : 'low',
        isScam: item.riskScore > 70,
        type: 'TOKEN'
      }));

      setAllowances(enriched);
      const highRisks = enriched.filter(a => a.risk === 'high').length;
      setWalletScore(Math.max(100 - (highRisks * 10), 0));

    } catch (err) {
      console.error("De.Fi Scan Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected) loadSecurityData();
  }, [isConnected, loadSecurityData]);

  // --- 3. BATCH REVOKE (STANDARD) ---
  const executeRevoke = async () => {
    if (selectedIds.length === 0) return;

    const calls = selectedIds.map(id => {
      const item = allowances.find(a => a.id === id);
      return {
        to: item?.tokenAddress as Address,
        data: encodeFunctionData({ 
          abi: erc20Abi, 
          functionName: 'approve', 
          args: [item?.spender as Address, 0n] 
        }),
      };
    });

    sendCalls({
      calls,
      capabilities: {
        paymasterService: { 
          url: `https://api.developer.coinbase.com/rpc/v1/base/paymaster?key=${process.env.NEXT_PUBLIC_CDP_API_KEY}` 
        }
      }
    });
    
    setSelectedIds([]);
  };

  // --- 4. UI KONDISIONAL (BROWSER CONNECT) ---
  if (!isConnected) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-screen gap-6 text-center">
        <div className="bg-blue-50 p-6 rounded-full animate-bounce">
          <Wallet size={48} className="text-[#0052FF]" />
        </div>
        <h2 className="text-2xl font-black italic">CONNECT YOUR BASE WALLET</h2>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => connect({ connector })}
              className="w-full py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold hover:border-blue-500 transition-all flex items-center justify-center gap-3"
            >
              {connector.name === "Injected" ? "MetaMask / Rabby" : connector.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 pb-32 flex flex-col gap-6 font-sans antialiased">
      {/* HEADER */}
      <div className="bg-[#0052FF] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden text-center">
        <div className="relative z-10">
          <p className="text-[10px] font-black opacity-60 tracking-[0.3em] uppercase italic tracking-widest">Shield Protocol</p>
          <h1 className="text-5xl font-black italic mt-2 tracking-tighter">
             {isLoading ? "SCANNING" : `${allowances.length} ASSETS`}
          </h1>
          <button onClick={loadSecurityData} className="mt-4 p-2 bg-white/20 rounded-full">
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="min-h-[400px]">
        {activeTab === "scanning" && (
           <div className="space-y-3">
             {allowances.map((item) => (
                <div key={item.id} className="p-4 border-2 border-gray-100 rounded-[1.8rem] flex justify-between items-center bg-white">
                  <div className="flex items-center gap-3">
                    <div className={item.risk === 'high' ? 'text-red-500' : 'text-green-500'}>
                      {item.risk === 'high' ? <AlertOctagon size={22} /> : <ShieldCheck size={22} />}
                    </div>
                    <div>
                      <p className="font-black text-sm">{item.tokenSymbol}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Risk Score: {item.risk ? 'High' : 'Low'}</p>
                    </div>
                  </div>
                </div>
             ))}
           </div>
        )}

        {activeTab === "revoke" && (
          <div className="space-y-3">
             {allowances.map((item) => (
               <AllowanceCard 
                 key={item.id} 
                 item={item} 
                 selected={selectedIds.includes(item.id)} 
                 onToggle={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])} 
               />
             ))}
          </div>
        )}
      </div>

      {/* FLOATING NAV */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white border rounded-[2.5rem] p-2 shadow-2xl flex justify-around">
        {['scanning', 'revoke', 'score'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)} 
            className={`flex-1 py-4 rounded-[2rem] flex flex-col items-center gap-1 ${activeTab === tab ? 'bg-[#0052FF] text-white' : 'text-gray-400'}`}
          >
            {tab === 'scanning' ? <Search size={20} /> : tab === 'revoke' ? <Trash2 size={20} /> : <Trophy size={20} />}
            <span className="text-[8px] font-black uppercase">{tab}</span>
          </button>
        ))}
      </div>

      {/* ACTION BUTTON */}
      {selectedIds.length > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-32 left-0 right-0 px-6 max-w-xl mx-auto">
          <button onClick={executeRevoke} className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black text-xl shadow-2xl">
            PURGE {selectedIds.length} RISKS
          </button>
        </div>
      )}
    </div>
  );
};
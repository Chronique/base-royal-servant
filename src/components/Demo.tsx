/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, usePublicClient, useConnect, useDisconnect } from "wagmi"; // Tambahkan usePublicClient & useConnect
import { useSendCalls } from 'wagmi/experimental';
import { AllowanceCard, type AllowanceItem } from "./AllowanceCard"; 
import { encodeFunctionData, type Address } from 'viem';
import { Search, Trophy, Trash2, ShieldCheck, AlertOctagon } from "lucide-react";

const erc20Abi = [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }] as const;

export const Demo = ({ userFid }: { userFid?: number }) => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient(); // Error 'Cannot find name' selesai di sini
  const { connect, connectors } = useConnect();
  const { sendCalls } = useSendCalls();

  const [activeTab, setActiveTab] = useState("scanning");
  const [allowances, setAllowances] = useState<AllowanceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSmartAccount, setIsSmartAccount] = useState(false);
  const [walletScore, setWalletScore] = useState(100);

  // --- LOGIKA SEAMLESS (AUTO-CONNECT & READY) ---
  useEffect(() => {
    const farcasterConnector = connectors.find((c) => c.id === "farcaster");
    if (farcasterConnector && !isConnected) {
      connect({ connector: farcasterConnector });
    }
    
    // Memberitahu Farcaster App sudah siap tampil (menghapus splash screen)
    sdk.actions.ready();
  }, [connectors, isConnected, connect]);

  // --- SECURITY CHECK LOGIC ---
  const checkAssetSecurity = async (tokenAddr: string) => {
    try {
      const res = await fetch(`https://api.goplussecurity.com/api/v1/token_security/8453?contract_addresses=${tokenAddr}`);
      const data = await res.json();
      const security = data.result[tokenAddr.toLowerCase()];
      const symbol = security?.token_symbol || "Unknown";
      const scamKeywords = [/scan/i, /claim/i, /airdrop/i, /free/i, /\.org/i, /\.net/i];
      return {
        symbol,
        isHoneypot: security?.is_honeypot === "1",
        isScam: scamKeywords.some(regex => regex.test(symbol)),
        type: security?.trust_list === "1" ? 'TOKEN' : 'SCAM' as any
      };
    } catch {
      return { symbol: "Unknown", isHoneypot: false, isScam: false, type: 'TOKEN' as any };
    }
  };

  // --- LOAD ALLOWANCES ---
  useEffect(() => {
    const loadWalletData = async () => {
      if (!address) return;
      setIsLoading(true);
      try {
        const response = await fetch(`https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`, {
          method: 'POST',
          body: JSON.stringify({ jsonrpc: '2.0', method: 'alchemy_getTokenAllowances', params: [{ owner: address }], id: 1 }),
        });
        const json = await response.json();
        const rawList = json.result?.tokenAllowances || [];
        const enriched = await Promise.all(rawList.map(async (item: any, idx: number) => {
          const security = await checkAssetSecurity(item.tokenAddress);
          return {
            id: idx.toString(),
            tokenAddress: item.tokenAddress,
            tokenSymbol: security.symbol,
            spender: item.spender,
            amount: item.allowance.startsWith("0xffffff") ? "Unlimited" : "Limited",
            risk: (item.allowance.startsWith("0xffffff") || security.isHoneypot) ? 'high' : 'low',
            isHoneypot: security.isHoneypot,
            isScam: security.isScam,
            type: security.isScam ? 'SCAM' : 'TOKEN'
          } as AllowanceItem;
        }));
        setAllowances(enriched);
        setWalletScore(Math.max(100 - (enriched.filter(a => a.risk === 'high').length * 15), 0));
      } finally {
        setIsLoading(false);
      }
    };
    loadWalletData();
  }, [address]);

  // --- DETECT SMART ACCOUNT ---
  useEffect(() => {
    const checkType = async () => {
      if (address && publicClient) {
        const code = await publicClient.getBytecode({ address: address as `0x${string}` });
        setIsSmartAccount(code !== undefined && code !== "0x");
      }
    };
    checkType();
  }, [address, publicClient]);

  // --- EXECUTE BATCH REVOKE ---
  const executeRevoke = async () => {
    const calls = selectedIds.map(id => {
      const item = allowances.find(a => a.id === id);
      return {
        to: item?.tokenAddress as Address,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [item?.spender as Address, 0n] }),
        value: 0n,
      };
    });
    sendCalls({
      calls,
      capabilities: {
        paymasterService: { url: `https://api.developer.coinbase.com/rpc/v1/base/paymaster?key=${process.env.NEXT_PUBLIC_CDP_API_KEY}` }
      }
    });
  };

  if (!isConnected) return <div className="p-20 text-center font-black italic text-[#0052FF] animate-pulse">CONNECTING TO WARPCAST...</div>;

  return (
    <div className="max-w-xl mx-auto p-4 pb-32 flex flex-col gap-6">
      {/* Dashboard UI */}
      <div className="bg-[#0052FF] p-8 rounded-[2.5rem] text-white shadow-2xl text-center relative overflow-hidden">
          <p className="text-[10px] font-bold opacity-60 tracking-widest italic uppercase">Base App Shield</p>
          <h1 className="text-4xl font-black italic mt-2">
            {activeTab === 'score' ? `${walletScore}/100` : isLoading ? "SCANNING..." : `${allowances.filter(a => a.risk === 'high').length} RISKS`}
          </h1>
          <div className="flex justify-center gap-2 mt-4 relative z-10">
             <button onClick={() => sdk.actions.addMiniApp()} className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-bold">+ Pin App</button>
             {isSmartAccount && <span className="text-[10px] bg-green-400 text-blue-900 px-3 py-1 rounded-full font-black italic uppercase">Gasless Ready</span>}
          </div>
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Tabs Navigation (Floating at Bottom) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/90 backdrop-blur-2xl border border-gray-200 rounded-[2.5rem] p-2 shadow-2xl flex justify-around z-50">
        <button onClick={() => setActiveTab("scanning")} className={`flex-1 py-4 rounded-[2rem] flex flex-col items-center gap-1 transition-all ${activeTab === 'scanning' ? 'bg-[#0052FF] text-white shadow-xl scale-105' : 'text-gray-400'}`}>
          <Search size={20} strokeWidth={3} /><span className="text-[8px] font-black uppercase">Scan</span>
        </button>
        <button onClick={() => setActiveTab("revoke")} className={`flex-1 py-4 rounded-[2rem] flex flex-col items-center gap-1 transition-all ${activeTab === 'revoke' ? 'bg-[#0052FF] text-white shadow-xl scale-105' : 'text-gray-400'}`}>
          <Trash2 size={20} strokeWidth={3} /><span className="text-[8px] font-black uppercase">Revoke</span>
        </button>
        <button onClick={() => setActiveTab("score")} className={`flex-1 py-4 rounded-[2rem] flex flex-col items-center gap-1 transition-all ${activeTab === 'score' ? 'bg-[#0052FF] text-white shadow-xl scale-105' : 'text-gray-400'}`}>
          <Trophy size={20} strokeWidth={3} /><span className="text-[8px] font-black uppercase">Score</span>
        </button>
      </div>

      {/* Content Rendering Logic */}
      <div className="min-h-[450px]">
        {activeTab === "scanning" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2 italic">Asset Origins</h3>
            {allowances.map((item) => (
              <div key={item.id} className="p-4 border-2 border-gray-100 rounded-[1.5rem] flex justify-between items-center bg-white">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.isScam ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                    {item.isScam ? <AlertOctagon size={20} /> : <ShieldCheck size={20} />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{item.tokenSymbol}</p>
                    <p className="text-[10px] font-bold uppercase text-gray-400">{item.isScam ? "Suspicious / Spam" : "Verified Activity"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "revoke" && (
          <div className="space-y-3 animate-in fade-in">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest italic">Permissions Shield</h3>
                <button onClick={() => setSelectedIds(allowances.map(a => a.id))} className="text-[10px] font-bold text-[#0052FF]">Select All</button>
             </div>
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

      {/* Batch Action Purge Button */}
      {selectedIds.length > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-28 left-0 right-0 px-6 max-w-xl mx-auto z-50 animate-in slide-in-from-bottom-10">
          <button onClick={executeRevoke} className="w-full bg-black text-white py-5 rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            PURGE {selectedIds.length} RISKS
            <span className="bg-[#0052FF] text-[10px] px-2 py-1 rounded italic uppercase font-bold">Gasless</span>
          </button>
        </div>
      )}
    </div>
  );
};
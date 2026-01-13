/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { useFrameContext } from "~/components/providers/FrameProvider";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, usePublicClient } from "wagmi";
import { SignInAction } from "~/components/actions/signin";
import { QuickAuthAction } from "~/components/actions/quick-auth";
import { OpenMiniAppAction } from "~/components/actions/open-miniapp";
import { useSendCalls } from 'wagmi/experimental';
import { ViewProfileAction } from "~/components/actions/view-profile";
import { SetPrimaryButtonAction } from "~/components/actions/set-primary-button";
import { AddMiniAppAction } from "~/components/actions/add-miniapp";
import { CloseMiniAppAction } from "~/components/actions/close-miniapp";
import { WalletConnect, SignMessage, SignSiweMessage, SendEth, SignTypedData, SwitchChain, SendTransaction } from "~/components/wallet/WalletActions";
import { BasePay } from "~/components/wallet/BasePay";
import { useMiniKit } from "@coinbase/onchainkit/minikit";
import { AllowanceCard } from "./AllowanceCard"; 
import { encodeFunctionData, type Address } from 'viem';

// Tambahan icon untuk Navigasi 3 Tab
import { Search, ShieldAlert, Trophy, Trash2, ShieldCheck, AlertOctagon } from "lucide-react";

const erc20Abi = [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }] as const;

interface DemoProps {
  userFid?: number;
}

export const Demo = ({ userFid }: DemoProps) => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { sendCalls } = useSendCalls();

  // States
  const [activeTab, setActiveTab] = useState("scanning");
  const [allowances, setAllowances] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSmartAccount, setIsSmartAccount] = useState(false);
  const [walletScore, setWalletScore] = useState(100);

  // 1. Scam & Security Logic (GoPlus)
  const checkAssetSecurity = async (tokenAddr: string) => {
    try {
      const res = await fetch(`https://api.goplussecurity.com/api/v1/token_security/8453?contract_addresses=${tokenAddr}`);
      const data = await res.json();
      const security = data.result[tokenAddr.toLowerCase()];
      
      const symbol = security?.token_symbol || "Unknown";
      const scamKeywords = [/scan/i, /claim/i, /airdrop/i, /free/i, /\.org/i, /\.net/i];
      const isScamName = scamKeywords.some(regex => regex.test(symbol));

      return {
        symbol,
        isHoneypot: security?.is_honeypot === "1",
        isScam: isScamName,
        // Jika token dikirim tanpa interaksi beli (asumsi sederhana dari metadata GoPlus)
        isUnsolicited: security?.trust_list !== "1" && isScamName
      };
    } catch {
      return { symbol: "Unknown", isHoneypot: false, isScam: false, isUnsolicited: true };
    }
  };

  // 2. Load Wallet Data (Alchemy)
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
            isUnsolicited: security.isUnsolicited // Label untuk token sampah/dusting
          };
        }));
        setAllowances(enriched);
        
        // Update Score
        const highRiskCount = enriched.filter(a => a.risk === 'high' || a.isHoneypot).length;
        setWalletScore(Math.max(100 - (highRiskCount * 15), 0));

      } finally {
        setIsLoading(false);
      }
    };
    loadWalletData();
  }, [address]);

  // 3. Smart Account Detection
  useEffect(() => {
    const checkType = async () => {
      if (address && publicClient) {
        const code = await publicClient.getBytecode({ address: address as `0x${string}` });
        setIsSmartAccount(code !== undefined && code !== "0x");
      }
    };
    checkType();
  }, [address, publicClient]);

  // 4. Batch Revoke Action
  const executeRevoke = async () => {
    const calls = selectedIds.map(id => {
      const item = allowances.find(a => a.id === id);
      return {
        to: item.tokenAddress as Address,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [item.spender as Address, 0n] }),
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

  if (!isConnected) return <div className="p-20 text-center font-black italic text-[#0052FF]">CONNECT TO BASE</div>;

  return (
    <div className="max-w-xl mx-auto p-4 pb-32 flex flex-col gap-6 font-sans">
      
      {/* HEADER SECTION */}
      <div className="bg-[#0052FF] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-[10px] font-bold opacity-60 tracking-[0.3em] uppercase italic">Base Shield Active</p>
          <h1 className="text-4xl font-black italic mt-2">
            {activeTab === 'score' ? `${walletScore}/100` : isLoading ? "SCANNING..." : `${allowances.filter(a => a.risk === 'high').length} RISKS`}
          </h1>
          <div className="flex gap-2 mt-4">
             <button onClick={() => sdk.actions.addMiniApp()} className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-bold">Pin App</button>
             {isSmartAccount && <span className="text-[10px] bg-green-400 text-blue-900 px-3 py-1 rounded-full font-black italic">EIP-4337</span>}
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="min-h-[450px]">
        
        {/* TAB 1: SCANNING (Interaction vs Dusting) */}
        {activeTab === "scanning" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Asset Origins</h3>
            {isLoading ? (
               <div className="space-y-3 p-4 bg-gray-50 rounded-3xl animate-pulse h-40" />
            ) : (
              allowances.map((item) => (
                <div key={item.id} className="p-4 border-2 border-gray-100 rounded-[1.5rem] flex justify-between items-center bg-white">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.isUnsolicited ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                      {item.isUnsolicited ? <AlertOctagon size={20} /> : <ShieldCheck size={20} />}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{item.tokenSymbol}</p>
                      <p className="text-[10px] font-bold uppercase text-gray-400">
                        {item.isUnsolicited ? "Unsolicited / Spam" : "Verified Purchase"}
                      </p>
                    </div>
                  </div>
                  {item.isUnsolicited && (
                    <button 
                      onClick={() => { setActiveTab("revoke"); setSelectedIds([item.id]); }}
                      className="text-[10px] bg-red-600 text-white px-3 py-1 rounded-full font-black italic"
                    >
                      PURGE
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: REVOKE (Allowances List) */}
        {activeTab === "revoke" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Active Permissions</h3>
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

        {/* TAB 3: SCORE (Health Dashboard) */}
        {activeTab === "score" && (
          <div className="flex flex-col gap-6 animate-in zoom-in-95">
            <div className="text-center p-10 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
               <Trophy size={60} className="mx-auto text-yellow-500 mb-4" />
               <h2 className="text-2xl font-black italic">SECURITY SCORE</h2>
               <p className="text-sm text-gray-500 max-w-[200px] mx-auto mt-2 font-medium">Nilai kesehatan dompet kamu berdasarkan risiko Base App.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Risky Apps</p>
                  <p className="text-3xl font-black text-red-500">{allowances.filter(a => a.risk === 'high').length}</p>
               </div>
               <div className="bg-white p-6 rounded-[2rem] border-2 border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Honeypots</p>
                  <p className="text-3xl font-black text-orange-500">{allowances.filter(a => a.isHoneypot).length}</p>
               </div>
            </div>
          </div>
        )}

      </div>

      {/* FLOATING NAVIGATION (BOTTOM) */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/90 backdrop-blur-2xl border border-gray-200 rounded-[2.5rem] p-2 shadow-2xl flex justify-around z-50">
        <button 
          onClick={() => setActiveTab("scanning")}
          className={`flex-1 py-4 rounded-[2rem] flex flex-col items-center gap-1 transition-all ${activeTab === 'scanning' ? 'bg-[#0052FF] text-white shadow-xl scale-105' : 'text-gray-400'}`}
        >
          <Search size={20} strokeWidth={3} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Scanning</span>
        </button>
        
        <button 
          onClick={() => setActiveTab("revoke")}
          className={`flex-1 py-4 rounded-[2rem] flex flex-col items-center gap-1 transition-all ${activeTab === 'revoke' ? 'bg-[#0052FF] text-white shadow-xl scale-105' : 'text-gray-400'}`}
        >
          <Trash2 size={20} strokeWidth={3} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Revoke</span>
        </button>

        <button 
          onClick={() => setActiveTab("score")}
          className={`flex-1 py-4 rounded-[2rem] flex flex-col items-center gap-1 transition-all ${activeTab === 'score' ? 'bg-[#0052FF] text-white shadow-xl scale-105' : 'text-gray-400'}`}
        >
          <Trophy size={20} strokeWidth={3} />
          <span className="text-[8px] font-black uppercase tracking-tighter">Score</span>
        </button>
      </div>

      {/* BATCH ACTION BUTTON */}
      {selectedIds.length > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-28 left-0 right-0 px-6 max-w-xl mx-auto z-50 animate-in slide-in-from-bottom-10">
          <button 
            onClick={executeRevoke}
            className="w-full bg-black text-white py-5 rounded-[2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            PURGE {selectedIds.length} ASSETS
            <span className="bg-[#0052FF] text-[10px] px-2 py-1 rounded italic uppercase tracking-tighter font-bold">Gasless</span>
          </button>
        </div>
      )}
    </div>
  );
};
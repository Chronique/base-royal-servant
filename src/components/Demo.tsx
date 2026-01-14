/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, usePublicClient, useConnect } from "wagmi";
import { useSendCalls } from 'wagmi/experimental';
import { AllowanceCard, type AllowanceItem } from "./AllowanceCard"; 
import { encodeFunctionData, type Address } from 'viem';
import { Search, Trophy, Trash2, ShieldCheck, AlertOctagon, RefreshCw } from "lucide-react";

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

  // --- 1. SEAMLESS CONNECT ---
  useEffect(() => {
    const farcasterConnector = connectors.find((c) => c.id === "farcaster");
    if (farcasterConnector && !isConnected) {
      connect({ connector: farcasterConnector });
    }
    sdk.actions.ready();
  }, [connectors, isConnected, connect]);

  // --- 2. FETCH ALL APPROVALS (TOKEN + NFT) ---
  const loadSecurityData = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      // Kita gunakan GoPlus Approval API karena mendukung Token & NFT sekaligus
      const [tokenRes, nftRes] = await Promise.all([
        fetch(`https://api.goplussecurity.com/api/v1/token_approval_security/8453?addresses=${address}`),
        fetch(`https://api.goplussecurity.com/api/v1/nft721_approval_security/8453?addresses=${address}`)
      ]);

      const tokenData = await tokenRes.json();
      const nftData = await nftRes.json();

      const combined: AllowanceItem[] = [];

      // Proses Token ERC-20
      (tokenData.result?.[0]?.token_approval_list || []).forEach((item: any, idx: number) => {
        const scamKeywords = [/scan/i, /claim/i, /airdrop/i, /\.org/i];
        const isScam = scamKeywords.some(r => r.test(item.token_symbol || ""));
        
        combined.push({
          id: `token-${idx}`,
          tokenAddress: item.token_address,
          tokenSymbol: item.token_symbol || "Unknown",
          spender: item.spender,
          amount: item.is_abandoned === "1" ? "Unlimited" : "Limited",
          risk: (item.is_dangerous === "1" || isScam) ? 'high' : 'low',
          isScam: isScam,
          type: 'TOKEN'
        });
      });

      // Proses NFT ERC-721
      (nftData.result?.[0]?.nft_approval_list || []).forEach((item: any, idx: number) => {
        combined.push({
          id: `nft-${idx}`,
          tokenAddress: item.nft_address,
          tokenSymbol: item.nft_name || "Unknown NFT",
          spender: item.spender,
          amount: "All Items",
          risk: item.is_dangerous === "1" ? 'high' : 'low',
          isScam: false,
          type: 'NFT'
        });
      });

      setAllowances(combined);
      const highRisks = combined.filter(a => a.risk === 'high').length;
      setWalletScore(Math.max(100 - (highRisks * 20), 0));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    loadSecurityData();
  }, [loadSecurityData]);

  // --- 3. EXECUTE REVOKE ---
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

  if (!isConnected) return <div className="p-20 text-center font-black italic text-[#0052FF] animate-pulse uppercase">Connecting Base...</div>;

  return (
    <div className="max-w-xl mx-auto p-4 pb-32 flex flex-col gap-6 font-sans antialiased">
      {/* HEADER SECTION */}
      <div className="bg-[#0052FF] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden text-center">
        <div className="relative z-10">
          <p className="text-[10px] font-black opacity-60 tracking-[0.3em] uppercase italic">Shield Protocol v2</p>
          <h1 className="text-5xl font-black italic mt-2 tracking-tighter">
            {activeTab === 'score' ? `${walletScore}/100` : isLoading ? "SCANNING" : `${allowances.filter(a => a.risk === 'high').length} RISKS`}
          </h1>
          <div className="flex justify-center gap-3 mt-5">
             <button onClick={loadSecurityData} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all">
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
             </button>
             <span className="text-[10px] bg-green-400 text-blue-900 px-4 py-1.5 rounded-full font-black italic uppercase">Safe Mode</span>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* TABS CONTENT */}
      <div className="min-h-[450px]">
        {activeTab === "scanning" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2 italic">Discovery & Origins</h3>
            {isLoading ? (
               <div className="space-y-3">
                 {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-50 rounded-[1.8rem] animate-pulse" />)}
               </div>
            ) : (
              allowances.map((item) => (
                <div key={item.id} className="p-4 border-2 border-gray-100 rounded-[1.8rem] flex justify-between items-center bg-white shadow-sm hover:border-blue-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${item.risk === 'high' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                      {item.risk === 'high' ? <AlertOctagon size={22} /> : <ShieldCheck size={22} />}
                    </div>
                    <div>
                      <p className="font-black text-sm text-gray-800 tracking-tight leading-none mb-1">{item.tokenSymbol}</p>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                        {item.type} • {item.risk === 'high' ? "Spam/Dangerous" : "Verified History"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "revoke" && (
          <div className="space-y-3 animate-in fade-in">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic">Active Permissions</h3>
                <button onClick={() => setSelectedIds(allowances.map(a => a.id))} className="text-[10px] font-black text-[#0052FF] uppercase underline decoration-2 underline-offset-4">Select All</button>
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

        {activeTab === "score" && (
          <div className="flex flex-col gap-6 animate-in zoom-in-95 text-center">
             <div className="p-12 bg-gray-50 rounded-[3.5rem] border-2 border-dashed border-gray-200">
                <Trophy size={64} className="mx-auto text-yellow-500 mb-6 drop-shadow-xl" />
                <h2 className="text-3xl font-black italic tracking-tighter leading-none">WALLET RANK</h2>
                <div className="mt-6 p-4 bg-white rounded-2xl shadow-sm inline-block">
                   <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Authenticated FID</p>
                   <p className="text-xl font-black text-[#0052FF] italic">{userFid || 'Anonymous'}</p>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* FLOATING NAVIGATION */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[94%] max-w-md bg-white/95 backdrop-blur-3xl border border-gray-200 rounded-[2.5rem] p-2 shadow-2xl flex justify-around z-50">
        {[
          { id: 'scanning', icon: <Search size={22} />, label: 'Scan' },
          { id: 'revoke', icon: <Trash2 size={22} />, label: 'Revoke' },
          { id: 'score', icon: <Trophy size={22} />, label: 'Score' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)} 
            className={`flex-1 py-4 rounded-[2rem] flex flex-col items-center gap-1 transition-all duration-300 ${activeTab === tab.id ? 'bg-[#0052FF] text-white shadow-xl scale-105' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {tab.icon}
            <span className="text-[9px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ACTION BUTTON */}
      {selectedIds.length > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-32 left-0 right-0 px-6 max-w-xl mx-auto z-50 animate-in slide-in-from-bottom-10">
          <button onClick={executeRevoke} className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            PURGE {selectedIds.length} RISKS
            <span className="bg-[#0052FF] text-[10px] px-3 py-1 rounded-full italic uppercase font-black">Gasless</span>
          </button>
        </div>
      )}
    </div>
  );
};
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from "wagmi";
import { useSendCalls } from 'wagmi/experimental';
import { AllowanceCard, type AllowanceItem } from "./AllowanceCard"; 
import { encodeFunctionData, type Address } from 'viem';
import { 
  Search, Trophy, Trash2, ShieldCheck, AlertOctagon, RefreshCw, Share2, CheckCircle2 
} from "lucide-react";

interface ExtendedAllowanceItem extends AllowanceItem {
  spenderLabel?: string;
}

const erc20Abi = [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }] as const;
const nftAbi = [{ name: 'setApprovalForAll', type: 'function', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] }] as const;

export const Demo = ({ userFid }: { userFid?: number }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { sendCalls } = useSendCalls();

  // State Management
  const [activeTab, setActiveTab] = useState("scanning");
  const [allowances, setAllowances] = useState<ExtendedAllowanceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()); // Pakai Set untuk performa
  const [isLoading, setIsLoading] = useState(false);
  const [walletScore, setWalletScore] = useState(100);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- OPTIMIZED ACTIONS ---
  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === allowances.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allowances.map(a => a.id)));
    }
  }, [allowances, selectedIds.size]);

  useEffect(() => {
    if (isConnected) return;
    const farcaster = connectors.find((c) => c.id === "farcaster");
    const cbWallet = connectors.find((c) => c.id === "coinbaseWalletSDK");
    if (farcaster) connect({ connector: farcaster });
    else if (cbWallet) connect({ connector: cbWallet });
    sdk.actions.ready();
  }, [connectors, isConnected, connect]);

  // --- MORALIS DATA FETCH ---
  const loadSecurityData = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setIsSuccess(false);
    try {
      const res = await fetch(
        `https://deep-index.moralis.io/api/v2.2/wallets/${address}/approvals?chain=base`,
        { headers: { "X-API-Key": process.env.NEXT_PUBLIC_MORALIS_API_KEY || "" } }
      );
      const json = await res.json();
      const rawList = json.result || [];

      const enriched: ExtendedAllowanceItem[] = rawList.map((item: any, idx: number) => {
        const isNFT = ["ERC721", "ERC1155"].includes(item.token.contract_type?.toUpperCase());
        return {
          id: `mol-${idx}`,
          tokenAddress: item.token.address,
          tokenSymbol: item.token.symbol || "UNKNOWN",
          spender: item.spender.address,
          spenderLabel: item.spender.address_label || "Contract",
          amount: item.value_formatted === "Unlimited" ? "∞" : item.value_formatted,
          risk: (item.spender.address_label === null || item.value === "unlimited") ? 'high' : 'low',
          type: isNFT ? "NFT" : "TOKEN"
        };
      });

      setAllowances(enriched);
      // Fix Error 7006: Berikan tipe eksplisit pada parameter 'a'
      const highRisks = enriched.filter((a: ExtendedAllowanceItem) => a.risk === 'high').length;
      setWalletScore(Math.max(100 - (highRisks * 10), 0));
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [address]);

  useEffect(() => { if (isConnected) loadSecurityData(); }, [isConnected, loadSecurityData]);

  // --- ATOMIC BATCH REVOKE ---
  const executeRevoke = async () => {
    if (selectedIds.size === 0) return;
    setIsLoading(true);
    try {
      const calls = Array.from(selectedIds).map(id => {
        // Fix Error 7006: Berikan tipe eksplisit pada parameter 'a'
        const item = allowances.find((a: ExtendedAllowanceItem) => a.id === id);
        if (!item) return null;

        return {
          to: item.tokenAddress as Address,
          value: 0n,
          data: item.type === "TOKEN" 
            ? encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [item.spender as Address, 0n] })
            : encodeFunctionData({ abi: nftAbi, functionName: 'setApprovalForAll', args: [item.spender as Address, false] }),
        };
      }).filter(Boolean);

      await sendCalls({ calls: calls as any });
      setSelectedIds(new Set());
      setIsSuccess(true);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  if (!isConnected) return <div className="p-20 text-center font-black text-[#0052FF] animate-pulse italic">AWAKENING SERVANT...</div>;

  return (
    <div className="max-w-xl mx-auto p-4 pb-32 flex flex-col gap-6 font-sans antialiased bg-[#FAFAFA] min-h-screen">
      {/* ROYAL HEADER */}
      <div className="bg-[#1A1A1A] p-10 rounded-[3rem] text-white shadow-2xl text-center relative overflow-hidden border-b-4 border-[#D4AF37]">
        <div className="relative z-10">
          <p className="text-[10px] font-black text-[#D4AF37] tracking-[0.5em] uppercase italic mb-2">Abdi Dalem Security</p>
          <h1 className="text-7xl font-black italic tracking-tighter leading-none">
            {activeTab === 'score' ? walletScore : allowances.length}
          </h1>
          <p className="text-xs font-bold opacity-60 mt-2 uppercase tracking-widest">
            {activeTab === 'score' ? "Royal Trust Rank" : "Gatekeepers Found"}
          </p>
          <div className="flex justify-center gap-4 mt-6">
             <button onClick={loadSecurityData} className="p-3 bg-white/10 rounded-full hover:bg-white/20 border border-white/10">
                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
             </button>
             <button onClick={() => sdk.actions.composeCast({ text: `🛡️ My Keraton is safe! Rank: ${walletScore}/100. Scan yours:`, embeds: [window.location.origin] })} className="p-3 bg-[#D4AF37] text-black rounded-full hover:scale-110 transition-all">
                <Share2 size={18} />
             </button>
          </div>
        </div>
        {/* Background Pattern */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none" style={{backgroundImage: 'radial-gradient(#D4AF37 0.7px, transparent 0.7px)', backgroundSize: '11px 11px'}} />
      </div>

      <div className="min-h-[400px] px-1">
        {isSuccess && activeTab === "revoke" && (
           <div className="mb-6 p-8 bg-green-50 border-2 border-green-200 rounded-[2.5rem] text-center animate-in zoom-in-95 shadow-sm">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-3" />
              <p className="font-black text-green-800 italic uppercase">Keraton Purified!</p>
           </div>
        )}

        {activeTab === "scanning" && (
          <div className="space-y-4">
            <h3 className="text-[11px] font-black text-[#3E2723] uppercase tracking-widest italic opacity-40 px-2">Registry of Guards</h3>
            {allowances.map((item) => (
              <div key={item.id} className="p-5 border-2 border-gray-100 rounded-[2rem] flex justify-between items-center bg-white shadow-sm hover:border-[#D4AF37]/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl ${item.risk === 'high' ? 'bg-red-50 text-red-500' : 'bg-[#F5F5DC] text-[#D4AF37]'}`}>
                    {item.risk === 'high' ? <AlertOctagon size={24} /> : <ShieldCheck size={24} />}
                  </div>
                  <div className="flex flex-col">
                    <p className="font-black text-base text-[#3E2723] leading-tight">{item.tokenSymbol}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase truncate max-w-[140px] mt-0.5">Via: {item.spenderLabel}</p>
                  </div>
                </div>
                <p className="text-xs font-black text-[#3E2723]">{item.amount}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "revoke" && (
          <div className="space-y-3">
             <div className="flex justify-between items-center px-4 mb-4">
                <h3 className="text-[11px] font-black text-[#3E2723] uppercase tracking-widest italic opacity-40">Cleansing List</h3>
                <button onClick={selectAll} className="text-[11px] font-black text-[#D4AF37] uppercase underline underline-offset-4 decoration-2">
                   {selectedIds.size === allowances.length ? "Deselect All" : "Select All"}
                </button>
             </div>
             {allowances.map((item) => (
               <AllowanceCard 
                 key={item.id} 
                 item={item} 
                 selected={selectedIds.has(item.id)} 
                 onToggle={handleToggle} 
               />
             ))}
          </div>
        )}

        {activeTab === "score" && (
           <div className="p-12 bg-white rounded-[4rem] border-2 border-[#D4AF37]/20 shadow-xl text-center">
              <Trophy size={80} className="mx-auto text-[#D4AF37] mb-6 drop-shadow-md" />
              <h2 className="text-3xl font-black text-[#3E2723] italic tracking-tighter">ROYAL SUBJECT #{userFid || '000'}</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Legacy Shield Status: Active</p>
           </div>
        )}
      </div>

      {/* ROYAL FOOTER NAV */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-[#1A1A1A] border border-white/10 rounded-[3rem] p-2 shadow-2xl flex justify-around z-50">
        {[
          { id: 'scanning', icon: <Search size={22} />, label: 'Scan' },
          { id: 'revoke', icon: <Trash2 size={22} />, label: 'Purify' },
          { id: 'score', icon: <Trophy size={22} />, label: 'Rank' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setIsSuccess(false); }} 
            className={`flex-1 py-5 rounded-[2.5rem] flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'bg-[#D4AF37] text-black shadow-lg scale-105' : 'text-gray-500'}`}
          >
            {tab.icon}
            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ROYAL PURIFY BUTTON */}
      {selectedIds.size > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-36 left-0 right-0 px-8 max-w-xl mx-auto z-50 animate-in slide-in-from-bottom-10">
          <button onClick={executeRevoke} className="w-full bg-[#1A1A1A] text-[#D4AF37] py-6 rounded-[3rem] font-black text-xl shadow-2xl border-2 border-[#D4AF37] flex items-center justify-center gap-3 active:scale-95 italic uppercase">
            {isLoading ? "Purifying..." : `Purify ${selectedIds.size} Gatekeepers`}
          </button>
        </div>
      )}
    </div>
  );
};
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from "wagmi";
import { useSendCalls } from 'wagmi/experimental';
import { AllowanceCard, type AllowanceItem } from "./AllowanceCard"; 
import { encodeFunctionData, type Address } from 'viem';
import { 
  Search, Trophy, Trash2, ShieldCheck, AlertOctagon, 
  RefreshCw, Share2, CheckCircle2, Sun, Moon 
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [walletScore, setWalletScore] = useState(100);
  const [isSuccess, setIsSuccess] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // --- THEME CONTROL ---
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark");
  };

  useEffect(() => {
    if (isConnected) return;
    const farcaster = connectors.find((c) => c.id === "farcaster");
    if (farcaster) connect({ connector: farcaster });
    sdk.actions.ready();
  }, [connectors, isConnected, connect]);

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
      const highRisks = enriched.filter((a: ExtendedAllowanceItem) => a.risk === 'high').length;
      setWalletScore(Math.max(100 - (highRisks * 10), 0));
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [address]);

  useEffect(() => { if (isConnected) loadSecurityData(); }, [isConnected, loadSecurityData]);

  const executeRevoke = async () => {
    if (selectedIds.size === 0) return;
    setIsLoading(true);
    try {
      const calls = Array.from(selectedIds).map(id => {
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

  if (!isConnected) return <div className="p-20 text-center font-black text-[#0052FF] animate-pulse italic">SERVANT IS READYING...</div>;

  return (
    <div className={`max-w-xl mx-auto pb-40 flex flex-col gap-4 font-sans antialiased transition-colors ${theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#FAFAFA] text-[#3E2723]'}`}>
      
      {/* SMALLER ROYAL HEADER */}
      <div className={`sticky top-0 z-50 p-6 rounded-b-[2rem] shadow-xl text-center relative overflow-hidden border-b-2 border-[#D4AF37] ${theme === 'dark' ? 'bg-[#1A1A1A]' : 'bg-white'}`}>
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-full flex justify-between items-center mb-2">
            <p className="text-[9px] font-black text-[#D4AF37] tracking-[0.3em] uppercase italic">Abdi Dalem</p>
            <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-500/10 hover:bg-gray-500/20">
              {theme === 'dark' ? <Sun size={14} className="text-[#D4AF37]" /> : <Moon size={14} />}
            </button>
          </div>
          <h1 className="text-5xl font-black italic tracking-tighter leading-none">
            {activeTab === 'score' ? walletScore : allowances.length}
          </h1>
          <p className="text-[10px] font-bold opacity-50 uppercase tracking-widest mt-1">
            {activeTab === 'score' ? "Royal Trust" : "Guards Found"}
          </p>
        </div>
      </div>

      {/* CONTENT Area with proper bottom padding */}
      <div className="px-4 min-h-[300px]">
        {isSuccess && activeTab === "revoke" && (
           <div className="mb-4 p-6 bg-green-500/10 border border-green-500/20 rounded-[1.5rem] text-center animate-in zoom-in-95">
              <CheckCircle2 size={32} className="text-green-500 mx-auto mb-2" />
              <p className="font-black text-green-500 italic text-sm uppercase">Purification Request Sent!</p>
           </div>
        )}

        {activeTab === "scanning" && (
          <div className="space-y-2">
            {allowances.map((item) => (
              <div key={item.id} className={`p-4 border rounded-[1.5rem] flex justify-between items-center transition-all ${theme === 'dark' ? 'bg-[#151515] border-white/5' : 'bg-white border-gray-100 shadow-sm'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${item.risk === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>
                    {item.risk === 'high' ? <AlertOctagon size={18} /> : <ShieldCheck size={18} />}
                  </div>
                  <div>
                    <p className="font-black text-sm leading-none mb-1">{item.tokenSymbol}</p>
                    <p className="text-[9px] font-bold opacity-40 uppercase truncate max-w-[150px]">{item.spenderLabel}</p>
                  </div>
                </div>
                <p className="text-[10px] font-black">{item.amount}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "revoke" && (
          <div className="space-y-2">
             <div className="flex justify-between items-center px-2 mb-2">
                <h3 className="text-[10px] font-black opacity-30 uppercase italic">Gatekeeper List</h3>
                <button onClick={() => setSelectedIds(selectedIds.size === allowances.length ? new Set() : new Set(allowances.map(a => a.id)))} className="text-[10px] font-black text-[#D4AF37] uppercase underline underline-offset-4">
                   {selectedIds.size === allowances.length ? "Deselect All" : "Select All"}
                </button>
             </div>
             {allowances.map((item) => (
               <AllowanceCard 
                 key={item.id} 
                 item={item} 
                 selected={selectedIds.has(item.id)} 
                 onToggle={(id) => {
                    const next = new Set(selectedIds);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    setSelectedIds(next);
                 }} 
               />
             ))}
          </div>
        )}

        {activeTab === "score" && (
           <div className={`p-10 rounded-[2.5rem] border-2 border-dashed border-[#D4AF37]/20 text-center ${theme === 'dark' ? 'bg-[#151515]' : 'bg-white'}`}>
              <Trophy size={60} className="mx-auto text-[#D4AF37] mb-4" />
              <h2 className="text-2xl font-black italic tracking-tighter uppercase">Subject #{userFid || '000'}</h2>
              <button onClick={() => sdk.actions.composeCast({ text: `🛡️ Cleaned my wallet! Rank: ${walletScore}/100.`, embeds: [window.location.origin] })} className="mt-6 px-6 py-2 bg-[#D4AF37] text-black rounded-full font-black text-[10px] uppercase flex items-center gap-2 mx-auto">
                <Share2 size={12} /> Broadcast Safety
              </button>
           </div>
        )}
      </div>

      {/* COMPACT FLOATING NAV */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 w-[85%] max-w-sm border rounded-[2rem] p-1.5 shadow-2xl flex justify-around z-50 transition-colors ${theme === 'dark' ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-gray-200'}`}>
        {[
          { id: 'scanning', icon: <Search size={18} />, label: 'Guards' },
          { id: 'revoke', icon: <Trash2 size={18} />, label: 'Purify' },
          { id: 'score', icon: <Trophy size={18} />, label: 'Rank' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setIsSuccess(false); }} 
            className={`flex-1 py-3 rounded-[1.5rem] flex flex-col items-center gap-0.5 transition-all ${activeTab === tab.id ? 'bg-[#D4AF37] text-black shadow-lg' : 'text-gray-500 opacity-60'}`}
          >
            {tab.icon}
            <span className="text-[7px] font-black uppercase">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* COMPACT PURIFY BUTTON */}
      {selectedIds.size > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-24 left-0 right-0 px-10 max-w-sm mx-auto z-50 animate-in slide-in-from-bottom-5">
          <button onClick={executeRevoke} disabled={isLoading} className="w-full bg-[#1A1A1A] text-[#D4AF37] py-4 rounded-full font-black text-sm shadow-2xl border border-[#D4AF37] flex items-center justify-center gap-2 active:scale-95 transition-all uppercase italic">
            {isLoading ? "Purifying..." : `Purify ${selectedIds.size} Risks`}
          </button>
        </div>
      )}
    </div>
  );
};
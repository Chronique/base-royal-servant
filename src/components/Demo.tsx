/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from "wagmi";
import { useSendCalls } from 'wagmi/experimental';
import { AllowanceCard, type AllowanceItem } from "./AllowanceCard"; 
import { encodeFunctionData, type Address } from 'viem';
import { 
  MagnifyingGlassIcon, 
  StarIcon, 
  TrashIcon, 
  UpdateIcon, 
  Share1Icon, 
  SunIcon, 
  MoonIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CircleIcon,
  BookmarkFilledIcon,
  EnterIcon
} from "@radix-ui/react-icons";

export const Demo = ({ userFid }: { userFid?: number }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { sendCalls } = useSendCalls();

  const [activeTab, setActiveTab] = useState("scanning");
  const [allowances, setAllowances] = useState<AllowanceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [walletScore, setWalletScore] = useState(100);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // INITIALIZATION: Deteksi Profil & Koneksi Otomatis
  useEffect(() => {
    const init = async () => {
      // Panggil ready sesegera mungkin agar frame tidak blank/terpotong di Farcaster
      sdk.actions.ready();
      
      const context = await sdk.context;
      if (context?.user) setUserProfile(context.user); 
      
      if (!isConnected) {
        const farcaster = connectors.find((c) => c.id === "farcaster");
        const cbWallet = connectors.find((c) => c.id === "coinbaseWalletSDK");
        if (farcaster) connect({ connector: farcaster });
        else if (cbWallet) connect({ connector: cbWallet });
      }
    };
    init();
  }, [connectors, isConnected, connect]);

  const handleManualConnect = () => {
    const browserConnector = connectors.find(c => c.id !== 'farcaster') || connectors[0];
    if (browserConnector) connect({ connector: browserConnector });
  };

  const loadSecurityData = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://deep-index.moralis.io/api/v2.2/wallets/${address}/approvals?chain=base`,
        { headers: { "X-API-Key": process.env.NEXT_PUBLIC_MORALIS_API_KEY || "" } }
      );
      const json = await res.json();
      const rawList = json.result || [];

      const enriched: AllowanceItem[] = rawList.map((item: any, idx: number) => ({
        id: `mol-${idx}`,
        tokenAddress: item.token.address,
        tokenSymbol: item.token.symbol || "UNKNOWN",
        tokenLogo: item.token.logo, 
        spender: item.spender.address,
        spenderLabel: item.spender.address_label || "Contract",
        amount: item.value_formatted === "Unlimited" ? "∞" : item.value_formatted,
        risk: (item.spender.address_label === null || item.value === "unlimited") ? 'high' : 'low',
        type: ["ERC721", "ERC1155"].includes(item.token.contract_type?.toUpperCase()) ? "NFT" : "TOKEN"
      }));

      setAllowances(enriched);
      setCurrentPage(1);
      const highRisks = enriched.filter(a => a.risk === 'high').length;
      setWalletScore(Math.max(100 - (highRisks * 10), 0));
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [address]);

  useEffect(() => { if (isConnected) loadSecurityData(); }, [isConnected, loadSecurityData]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return allowances.slice(start, start + itemsPerPage);
  }, [allowances, currentPage]);

  const totalPages = Math.ceil(allowances.length / itemsPerPage);

  const handlePinApp = async () => {
    try {
      await sdk.actions.addFrame(); 
    } catch (err) { console.error("Pin failed", err); }
  };

  const handleShare = () => {
    sdk.actions.composeCast({
      text: `🛡️ Check your wallet health with Royal Servant! \nMy security score: ${walletScore}/100.`,
      embeds: [window.location.origin]
    });
  };

  const executeRevoke = async () => {
    if (selectedIds.size === 0) return;
    setIsLoading(true);
    try {
      const calls = Array.from(selectedIds).map(id => {
        const item = allowances.find(a => a.id === id);
        if (!item) return null;
        return {
          to: item.tokenAddress as Address,
          value: 0n,
          data: item.type === "TOKEN" 
            ? encodeFunctionData({ abi: [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }], functionName: 'approve', args: [item.spender as Address, 0n] })
            : encodeFunctionData({ abi: [{ name: 'setApprovalForAll', type: 'function', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] }], functionName: 'setApprovalForAll', args: [item.spender as Address, false] }),
        };
      }).filter(Boolean);

      await sendCalls({ calls: calls as any });
      setSelectedIds(new Set());
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  if (!isConnected) {
    return (
      <div className={`max-w-xl mx-auto min-h-screen flex flex-col items-center justify-center p-8 transition-colors ${theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#FAFAFA] text-[#3E2723]'}`}>
        <div className="text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto mb-8 bg-[#1A1A1A] border-2 border-[#D4AF37] p-5 rounded-full flex items-center justify-center">
            <StarIcon width={32} height={32} className="text-[#D4AF37]" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black text-[#D4AF37] tracking-[0.4em] uppercase italic">Abdi Dalem Security</p>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-tight">Protect Your<br/>Base Wallet</h2>
          </div>
          <button onClick={handleManualConnect} className="mt-8 px-10 py-3.5 bg-[#D4AF37] text-black rounded-full font-black text-xs uppercase flex items-center gap-3 mx-auto shadow-xl active:scale-95 transition-all">
            <EnterIcon width={16} height={16} /> Masuk Keraton
          </button>
        </div>
      </div>
    );
  }

  return (
    /* Perbaikan pb-44 menjadi dinamis dengan safe-area */
    <div className={`max-w-xl mx-auto pb-[calc(12rem+env(safe-area-inset-bottom))] min-h-screen font-sans transition-colors ${theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#FAFAFA] text-[#3E2723]'}`}>
      
      {/* HEADER */}
      <div className={`sticky top-0 z-50 p-4 rounded-b-[1.5rem] shadow-2xl text-center border-b border-[#D4AF37] ${theme === 'dark' ? 'bg-[#151515]' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-1">
          <p className="text-[8px] font-black text-[#D4AF37] tracking-[0.3em] uppercase italic">Royal Servant</p>
          <div className="flex gap-2">
            <button onClick={handlePinApp} className={`p-1.5 rounded-full bg-gray-500/10 text-[#D4AF37] hover:scale-110 transition-transform`}>
              <BookmarkFilledIcon width={14} height={14} />
            </button>
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-1.5 rounded-full bg-gray-500/10 text-[#D4AF37]">
              {theme === 'dark' ? <SunIcon width={14} height={14} /> : <MoonIcon width={14} height={14} />}
            </button>
          </div>
        </div>
        <h1 className="text-4xl font-black italic tracking-tighter leading-none">
          {activeTab === 'score' ? walletScore : allowances.length}
        </h1>
      </div>

      <div className="px-4 mt-6">
        {(activeTab === "scanning" || activeTab === "revoke") && (
          <>
            <div className="space-y-2">
               {activeTab === "revoke" && allowances.length > 0 && (
                 <div className="flex justify-between items-center px-2 mb-2">
                    <button onClick={() => setSelectedIds(selectedIds.size === allowances.length ? new Set() : new Set(allowances.map(a => a.id)))} className="text-[9px] font-black text-[#D4AF37] uppercase underline decoration-2">
                       {selectedIds.size === allowances.length ? "Deselect All" : "Select All"}
                    </button>
                 </div>
               )}
               {paginatedItems.map((item) => (
                 activeTab === "scanning" ? (
                  <div key={item.id} className={`p-3 border rounded-[1.2rem] flex justify-between items-center ${theme === 'dark' ? 'bg-[#151515] border-white/5' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gray-500/10 flex items-center justify-center">
                        {item.tokenLogo ? <img src={item.tokenLogo} alt={item.tokenSymbol} className="w-full h-full object-cover" /> : <CircleIcon className="text-[#D4AF37]" />}
                      </div>
                      <div className="flex flex-col"><p className="font-black text-xs leading-none mb-1">{item.tokenSymbol}</p><p className="text-[8px] opacity-30 truncate max-w-[130px]">VIA: {item.spenderLabel}</p></div>
                    </div>
                    <p className="text-[9px] font-black">{item.amount}</p>
                  </div>
                 ) : (
                  <AllowanceCard key={item.id} item={item} selected={selectedIds.has(item.id)} theme={theme} onToggle={(id) => {
                      const next = new Set(selectedIds);
                      if (next.has(id)) next.delete(id); else next.add(id);
                      setSelectedIds(next);
                  }} />
                 )
               ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-8">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-full bg-[#D4AF37]/10 disabled:opacity-10 text-[#D4AF37]">
                  <ChevronLeftIcon />
                </button>
                <span className="text-[10px] font-black">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded-full bg-[#D4AF37]/10 disabled:opacity-10 text-[#D4AF37]">
                  <ChevronRightIcon />
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === "score" && (
           <div className={`p-8 rounded-[2rem] border-2 border-dashed border-[#D4AF37]/20 text-center ${theme === 'dark' ? 'bg-[#151515]' : 'bg-white'}`}>
              <div className="relative w-16 h-16 mx-auto mb-4">
                 {userProfile?.pfpUrl ? (
                   <img src={userProfile.pfpUrl} alt="profile" className="w-full h-full rounded-full border-2 border-[#D4AF37] object-cover" />
                 ) : (
                   <div className="w-full h-full rounded-full bg-gray-500/10 flex items-center justify-center text-[#D4AF37] border-2 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20"><StarIcon width={24} height={24} /></div>
                 )}
              </div>
              <h2 className="text-xl font-black italic uppercase mb-1">{userProfile?.displayName || 'ABDI DALEM'}</h2>
              <p className="text-[9px] opacity-40 uppercase mb-6 italic">FID: {userProfile?.fid || userFid || 'GUEST'}</p>
              
              <div className="flex flex-col gap-2 max-w-[150px] mx-auto">
                <div className="flex justify-between text-[10px] font-black">
                  <span className="opacity-40 italic tracking-tighter">WALLET HEALTH</span>
                  <span className="text-[#D4AF37]">{walletScore}%</span>
                </div>
                <div className="w-full bg-gray-500/20 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#D4AF37] h-full transition-all duration-1000" style={{ width: `${walletScore}%` }} />
                </div>
              </div>

              <button onClick={handleShare} className="mt-8 px-6 py-2 bg-[#D4AF37] text-black rounded-full font-black text-[9px] uppercase flex items-center gap-2 mx-auto active:scale-95 transition-all">
                <Share1Icon width={12} height={12} /> Share Score
              </button>
           </div>
        )}
      </div>

      {/* COMPACT NAV - Perbaikan posisi bottom dengan safe-area */}
      <div className={`fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[80%] max-w-sm border rounded-[1.8rem] p-1 shadow-2xl flex justify-around z-[100] ${theme === 'dark' ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-gray-200'}`}>
        {[
          { id: 'scanning', icon: <MagnifyingGlassIcon width={18} height={18} />, label: 'Guards' },
          { id: 'revoke', icon: <TrashIcon width={18} height={18} />, label: 'Purify' },
          { id: 'score', icon: <StarIcon width={18} height={18} />, label: 'Rank' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); }} className={`flex-1 py-3 rounded-[1.5rem] flex flex-col items-center transition-all ${activeTab === tab.id ? 'bg-[#D4AF37] text-black shadow-lg scale-105 font-black' : 'text-gray-500 opacity-50'}`}>
            {tab.icon}
            <span className="text-[6px] font-black uppercase mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* PURIFY BUTTON - Perbaikan posisi bottom agar di atas Nav Bar */}
      {selectedIds.size > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom))] left-0 right-0 px-10 max-w-[180px] mx-auto z-[101] animate-in slide-in-from-bottom-5">
          <button onClick={executeRevoke} className="w-full bg-[#1A1A1A] text-[#D4AF37] py-3.5 rounded-full font-black text-xs shadow-2xl border border-[#D4AF37] flex items-center justify-center gap-2 active:scale-95 transition-all uppercase italic">
            {isLoading ? <UpdateIcon className="animate-spin" /> : `Purify ${selectedIds.size}`}
          </button>
        </div>
      )}
    </div>
  );
};
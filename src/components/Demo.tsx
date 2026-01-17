/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from "wagmi";
import { useSendCalls, useCapabilities } from 'wagmi/experimental';
import { AllowanceCard, type AllowanceItem } from "./AllowanceCard"; 
import { encodeFunctionData, type Address, type Hex } from 'viem';
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
  EnterIcon,
  ClockIcon,
  EyeOpenIcon,
  TargetIcon
} from "@radix-ui/react-icons";

// --- INTERFACES ---
interface MoralisApproval {
  token: { address: string; symbol?: string; logo?: string; contract_type?: string; };
  spender: { address: string; address_label?: string | null; };
  value_formatted: string;
  value: string;
}

interface SpendPermission {
  id: string;
  spender: string;
  token: string;
  limit: string;
  period: string;
  expiresAt: string;
  status: 'active' | 'expired';
}

interface FarcasterUser { fid: number; displayName?: string; pfpUrl?: string; }
interface ContractCall { to: Address; data: Hex; value: bigint; }

export const Demo = ({ userFid }: { userFid?: number }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { sendCallsAsync } = useSendCalls(); 
  const { data: capabilities } = useCapabilities();

  const [activeTab, setActiveTab] = useState("scanning");
  const [allowances, setAllowances] = useState<AllowanceItem[]>([]);
  const [spendPermissions, setSpendPermissions] = useState<SpendPermission[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [walletScore, setWalletScore] = useState(100);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [userProfile, setUserProfile] = useState<FarcasterUser | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const supportsBatching = useMemo(() => {
    if (!capabilities || !capabilities[8453]) return false;
    return capabilities[8453]?.atomicBatch?.supported === true;
  }, [capabilities]);

  useEffect(() => {
    const init = async () => {
      sdk.actions.ready();
      const context = await sdk.context;
      if (context?.user) setUserProfile(context.user as FarcasterUser); 
      if (!isConnected) {
        const farcaster = connectors.find((c) => c.id === "farcaster");
        if (farcaster) connect({ connector: farcaster });
      }
    };
    init();
  }, [connectors, isConnected, connect]);

  const loadSecurityData = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://deep-index.moralis.io/api/v2.2/wallets/${address}/approvals?chain=base`,
        { headers: { "X-API-Key": process.env.NEXT_PUBLIC_MORALIS_API_KEY || "" } }
      );
      const json = await res.json();
      const rawList = (json.result || []) as MoralisApproval[];

      const enriched: AllowanceItem[] = rawList.map((item, idx) => ({
        id: `mol-${idx}`,
        tokenAddress: item.token.address,
        tokenSymbol: item.token.symbol || "UNKNOWN",
        tokenLogo: item.token.logo, 
        spender: item.spender.address,
        spenderLabel: item.spender.address_label || "Contract",
        amount: item.value_formatted === "Unlimited" ? "∞" : item.value_formatted,
        risk: (item.spender.address_label === null || item.value === "unlimited") ? 'high' : 'low',
        type: ["ERC721", "ERC1155"].includes(item.token.contract_type?.toUpperCase() || "") ? "NFT" : "TOKEN"
      }));

      setAllowances(enriched);
      const mockPerms: SpendPermission[] = []; 
      setSpendPermissions(mockPerms);

      // Skor 100 jika benar-benar bersih (Tanpa Approval & Tanpa Spend Permission)
      const totalIssues = enriched.length + mockPerms.length;
      if (totalIssues === 0) {
        setWalletScore(100);
      } else {
        const highRisks = enriched.filter(a => a.risk === 'high').length + mockPerms.length;
        setWalletScore(Math.max(100 - (highRisks * 15), 10));
      }
    } catch (err) { console.error("Load failed:", err); } finally { setIsLoading(false); }
  }, [address]);

  useEffect(() => { if (isConnected) loadSecurityData(); }, [isConnected, loadSecurityData]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return allowances.slice(start, start + itemsPerPage);
  }, [allowances, currentPage]);

  const totalPages = Math.ceil(allowances.length / itemsPerPage);

  const executeRevoke = async () => {
    if (selectedIds.size === 0) return;
    setIsLoading(true);
    try {
      const selectedItems = Array.from(selectedIds)
        .map(id => allowances.find(a => a.id === id))
        .filter((item): item is AllowanceItem => !!item);

      const calls: ContractCall[] = selectedItems.map(item => ({
        to: item.tokenAddress as Address,
        value: 0n,
        data: item.type === "TOKEN" 
          ? encodeFunctionData({ abi: [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }], functionName: 'approve', args: [item.spender as Address, 0n] })
          : encodeFunctionData({ abi: [{ name: 'setApprovalForAll', type: 'function', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] }], functionName: 'setApprovalForAll', args: [item.spender as Address, false] }),
      }));

      if (supportsBatching) {
        await sendCallsAsync({ calls: calls as unknown as ContractCall[] });
      } else {
        for (const call of calls) {
          try { await sendCallsAsync({ calls: [call] as unknown as ContractCall[] }); } catch (e) { console.error(e); }
        }
      }
      setSelectedIds(new Set());
      setTimeout(() => loadSecurityData(), 4000);
    } catch (e) { console.error("Revoke error:", e); } finally { setIsLoading(false); }
  };

  if (!isConnected) {
    return (
      <div className={`max-w-xl mx-auto min-h-screen flex flex-col items-center justify-center p-8 transition-colors ${theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#FAFAFA] text-[#3E2723]'}`}>
        <div className="text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto mb-8 bg-[#1A1A1A] border-2 border-[#D4AF37] p-5 rounded-full flex items-center justify-center">
            <StarIcon width={32} height={32} className="text-[#D4AF37]" />
          </div>
          <p className="text-[10px] font-black text-[#D4AF37] tracking-[0.4em] uppercase italic">Royal Servant Keraton</p>
          <h2 className="text-4xl font-black italic uppercase leading-tight">Scan & Protect Your<br/>Wallet</h2>
          <button onClick={() => connect({ connector: connectors[0] })} className="mt-8 px-10 py-3.5 bg-[#D4AF37] text-black rounded-full font-black text-xs uppercase shadow-xl flex items-center gap-2">
            <EnterIcon /> Masuk Keraton
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-xl mx-auto pb-[calc(12rem+env(safe-area-inset-bottom))] min-h-screen font-sans transition-colors ${theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#FAFAFA] text-[#3E2723]'}`}>
      
      {/* HEADER */}
      <div className={`sticky top-0 z-50 p-4 rounded-b-[1.5rem] shadow-2xl text-center border-b border-[#D4AF37] ${theme === 'dark' ? 'bg-[#151515]' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-1">
          <p className="text-[8px] font-black text-[#D4AF37] tracking-[0.3em] uppercase italic">Royal Servant</p>
          <div className="flex gap-2">
            <button onClick={() => loadSecurityData()} className="p-1.5 rounded-full bg-gray-500/10 text-[#D4AF37]">
              <UpdateIcon className={isLoading ? "animate-spin" : ""} />
            </button>
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-1.5 rounded-full bg-gray-500/10 text-[#D4AF37]">
              {theme === 'dark' ? <SunIcon width={14} /> : <MoonIcon width={14} />}
            </button>
          </div>
        </div>
        <h1 className="text-4xl font-black italic tracking-tighter leading-none">
          {activeTab === 'score' ? walletScore : (activeTab === 'permissions' ? spendPermissions.length : allowances.length)}
        </h1>
      </div>

      <div className="px-4 mt-6">
        {/* TAB: GATOTKACA (SCANNING/GUARDS) - HANYA INFORMASI */}
        {activeTab === "scanning" && (
          <div className="space-y-2">
            {paginatedItems.map((item) => (
              <div key={item.id} className={`p-4 border rounded-[1.5rem] flex justify-between items-center opacity-80 ${theme === 'dark' ? 'bg-[#151515] border-white/5' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-500/10 flex items-center justify-center">
                    {item.tokenLogo ? <img src={item.tokenLogo} alt="logo" className="w-full h-full object-cover" /> : <CircleIcon className="text-[#D4AF37]" />}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-black text-sm truncate max-w-[120px]">{item.tokenSymbol}</h4>
                    <p className="text-[8px] opacity-40 uppercase italic">Via: {item.spenderLabel}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black">{item.amount}</p>
                   <p className={`text-[7px] font-bold uppercase ${item.risk === 'high' ? 'text-red-500' : 'text-green-500'}`}>{item.risk} risk</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: SRIKANDI (PATROL/PERMISSIONS) */}
        {activeTab === "permissions" && (
          <div className="space-y-3">
            {spendPermissions.length === 0 ? (
              <div className="py-20 text-center opacity-20 italic text-xs uppercase font-black tracking-widest">Srikandi: No Threats Found</div>
            ) : (
              spendPermissions.map(perm => (
                <div key={perm.id} className={`p-4 border rounded-[1.5rem] ${theme === 'dark' ? 'bg-[#151515] border-white/5' : 'bg-white border-gray-100'}`}>
                  <p className="font-black text-xs text-[#D4AF37] uppercase italic mb-1">Limit: {perm.limit}</p>
                  <p className="text-[10px] font-bold truncate">Spender: {perm.spender}</p>
                  <div className="flex items-center gap-2 mt-2 opacity-40">
                    <ClockIcon width={10} />
                    <p className="text-[9px] uppercase font-black text-red-500 italic">Expires: {perm.expiresAt}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB: ARJUNA (PURIFY/REVOKE) - BISA DIPILIH */}
        {activeTab === "revoke" && (
          <div className="space-y-2">
             {paginatedItems.map((item) => (
                <AllowanceCard key={item.id} item={item} selected={selectedIds.has(item.id)} theme={theme} onToggle={(id) => {
                    const next = new Set(selectedIds);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    setSelectedIds(next);
                }} />
             ))}
          </div>
        )}

        {/* TAB: YUDHISTIRA (RANK) */}
        {activeTab === "score" && (
           <div className={`p-8 rounded-[2rem] border-2 border-dashed border-[#D4AF37]/20 text-center ${theme === 'dark' ? 'bg-[#151515]' : 'bg-white'}`}>
              <div className="relative w-16 h-16 mx-auto mb-4">
                 {userProfile?.pfpUrl ? (
                   <img src={userProfile.pfpUrl} alt="pfp" className="w-full h-full rounded-full border-2 border-[#D4AF37]" />
                 ) : (
                   <div className="w-full h-full rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] border-2 border-[#D4AF37]"><StarIcon width={24}/></div>
                 )}
              </div>
              <h2 className="text-xl font-black italic uppercase mb-1">{userProfile?.displayName || 'Royal User'}</h2>
              <div className="flex flex-col gap-2 max-w-[150px] mx-auto mt-6">
                <div className="flex justify-between text-[10px] font-black italic">
                  <span>WALLET HEALTH</span>
                  <span className={walletScore === 100 ? "text-green-500" : "text-[#D4AF37]"}>{walletScore}%</span>
                </div>
                <div className="w-full bg-gray-500/20 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#D4AF37] h-full transition-all duration-1000" style={{ width: `${walletScore}%` }} />
                </div>
              </div>
              <p className="mt-4 text-[9px] font-black italic opacity-40 uppercase tracking-tighter">
                {walletScore === 100 ? "Yudhistira: Treasury is Pure!" : "Purification Needed, My Liege!"}
              </p>
           </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (activeTab === 'scanning' || activeTab === 'revoke') && (
          <div className="flex justify-center items-center gap-4 mt-8">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 rounded-full bg-[#D4AF37]/10 text-[#D4AF37]"><ChevronLeftIcon/></button>
            <span className="text-[10px] font-black">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="p-2 rounded-full bg-[#D4AF37]/10 text-[#D4AF37]"><ChevronRightIcon/></button>
          </div>
        )}
      </div>

      {/* PURIFY BUTTON */}
      {selectedIds.size > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-[calc(7.2rem+env(safe-area-inset-bottom))] left-0 right-0 px-10 max-w-[200px] mx-auto z-[101]">
          <button onClick={executeRevoke} className="w-full bg-[#1A1A1A] text-[#D4AF37] py-4 rounded-full font-black text-xs shadow-2xl border border-[#D4AF37] flex items-center justify-center gap-2 active:scale-95 transition-all uppercase italic">
            {isLoading ? <UpdateIcon className="animate-spin" /> : `Purify ${selectedIds.size}`}
          </button>
        </div>
      )}

      {/* WAYANG NAVIGATION */}
      <div className={`fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[90%] max-w-sm border rounded-[1.8rem] p-1 shadow-2xl flex justify-around z-[100] ${theme === 'dark' ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-gray-200'}`}>
        {[
          { id: 'scanning', icon: <EyeOpenIcon width={18}/>, label: 'Gatotkaca' },
          { id: 'permissions', icon: <TargetIcon width={18}/>, label: 'Srikandi' },
          { id: 'revoke', icon: <TrashIcon width={18}/>, label: 'Arjuna' },
          { id: 'score', icon: <StarIcon width={18}/>, label: 'Yudhistira' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 rounded-[1.5rem] flex flex-col items-center transition-all ${activeTab === tab.id ? 'bg-[#D4AF37] text-black shadow-lg scale-105 font-black' : 'text-gray-500 opacity-50'}`}>
            {tab.icon}
            <span className="text-[6px] font-black uppercase mt-0.5">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
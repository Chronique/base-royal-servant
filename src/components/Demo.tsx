/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from "wagmi";
import { useSendCalls, useCapabilities } from 'wagmi/experimental';
import { AllowanceCard, type AllowanceItem } from "./AllowanceCard"; 
import { encodeFunctionData, type Address, type Hex } from 'viem';
import { 
  StarIcon, 
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
  TargetIcon,
  QuestionMarkIcon,
  MagnifyingGlassIcon,
  ExternalLinkIcon
} from "@radix-ui/react-icons";

// --- INTERFACES ---
interface MoralisApproval {
  token: { address: string; symbol?: string; logo?: string; contract_type?: string; };
  spender: { address: string; address_label?: string | null; };
  value_formatted: string;
  value: string;
}

interface SpendPermission {
  id: string; spender: string; token: string; limit: string; period: string; expiresAt: string; status: 'active' | 'expired';
}

interface FarcasterUser { fid: number; displayName?: string; pfpUrl?: string; }
interface ContractCall { to: Address; data: Hex; value: bigint; }

export const Demo = ({ userFid }: { userFid?: number }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { sendCallsAsync } = useSendCalls(); 
  const { data: capabilities } = useCapabilities();

  // --- STATE ---
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

  // --- TOUR STATE ---
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const tourData = [
    { title: "Royal Header", tab: "scanning", desc: "Monitor health and manage settings (Pin, Refresh, Theme) here.", pos: "header", icon: <StarIcon /> },
    { title: "Gatotkaca", tab: "scanning", desc: "Guardian. View active approvals (Read-only).", pos: "nav", icon: <EyeOpenIcon /> },
    { title: "Srikandi", tab: "permissions", desc: "Scout. Track automated Spend Permissions.", pos: "nav", icon: <MagnifyingGlassIcon /> },
    { title: "Arjuna", tab: "revoke", desc: "Archer. Revoke high-risk permissions.", pos: "nav", icon: <TargetIcon /> },
    { title: "Yudhistira", tab: "score", desc: "Pure. See final score and experimental apps.", pos: "nav", icon: <StarIcon /> }
  ];

  const supportsBatching = useMemo(() => {
    if (!capabilities || !capabilities[8453]) return false;
    return capabilities[8453]?.atomicBatch?.supported === true;
  }, [capabilities]);

  // --- FUNCTIONS ---
  const handleShare = useCallback(() => {
    sdk.actions.composeCast({
      text: `🛡️ My wallet health score is ${walletScore}/100! Scan yours with Royal Servant.`,
      embeds: [window.location.origin]
    });
  }, [walletScore]);

  const handlePinApp = useCallback(async () => {
    try { await sdk.actions.addFrame(); } catch (err) { console.error("Pin failed", err); }
  }, []);

  const handleManualConnect = useCallback(() => {
    // Priority: Farcaster -> Coinbase -> Injected (MetaMask)
    const fc = connectors.find(c => c.id === 'farcaster');
    const cb = connectors.find(c => c.id === 'coinbaseWalletSDK');
    const target = fc || cb || connectors[0];
    if (target) connect({ connector: target });
  }, [connectors, connect]);

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
      const totalIssues = enriched.length;
      if (totalIssues === 0) setWalletScore(100);
      else if (totalIssues > 10) setWalletScore(60);
      else setWalletScore(80);
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [address]);

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
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  useEffect(() => {
    const init = async () => {
      try {
        sdk.actions.ready();
        const context = await sdk.context;
        if (context?.user) setUserProfile(context.user as FarcasterUser); 
      } catch (e) { console.log("Standard Browser Detected"); }
      
      if (isConnected) {
        loadSecurityData();
        if (!localStorage.getItem("hasSeenRoyalTour")) setShowTour(true);
      }
    };
    init();
  }, [isConnected, loadSecurityData]);

  const handleTourNext = () => {
    if (tourStep < tourData.length - 1) {
      const nextStep = tourStep + 1;
      setTourStep(nextStep);
      setActiveTab(tourData[nextStep].tab);
    } else {
      setShowTour(false);
      localStorage.setItem("hasSeenRoyalTour", "true");
    }
  };

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return allowances.slice(start, start + itemsPerPage);
  }, [allowances, currentPage]);

  const totalPages = Math.ceil(allowances.length / itemsPerPage);

  if (!isConnected) {
    return (
      <div className={`max-w-xl mx-auto min-h-screen flex flex-col items-center justify-center p-8 transition-colors ${theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#FAFAFA] text-[#3E2723]'}`}>
        <div className="text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto mb-8 bg-[#1A1A1A] border-2 border-[#D4AF37] p-5 rounded-full flex items-center justify-center shadow-2xl">
            <StarIcon width={32} height={32} className="text-[#D4AF37]" />
          </div>
          <h2 className="text-4xl font-black italic uppercase leading-tight">Protect Your<br/>Wallet</h2>
          <button onClick={handleManualConnect} className="mt-8 px-10 py-3.5 bg-[#D4AF37] text-black rounded-full font-black text-xs uppercase shadow-xl flex items-center gap-2 active:scale-95 transition-all">
            <EnterIcon /> Enter Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-xl mx-auto pb-[calc(14rem+env(safe-area-inset-bottom))] min-h-screen font-sans transition-colors ${theme === 'dark' ? 'bg-[#0A0A0A] text-white' : 'bg-[#FAFAFA] text-[#3E2723]'}`}>
      
      {/* ONBORDA-STYLE TOUR */}
      {showTour && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] pointer-events-auto" onClick={() => setShowTour(false)} />
          <div className={`relative z-[1001] pointer-events-auto w-[85%] max-w-xs bg-[#1a1a1a]/95 p-6 rounded-[2rem] border-2 border-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.4)] transform transition-all duration-300 ${tourData[tourStep].pos === 'header' ? '-translate-y-24' : 'translate-y-24'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-[#D4AF37] text-black rounded-full flex items-center justify-center text-xl"><StarIcon /></div>
              <h3 className="text-lg font-black italic uppercase text-[#D4AF37]">{tourData[tourStep].title}</h3>
            </div>
            <p className="text-[10px] font-bold leading-relaxed opacity-90 italic mb-5 text-white">{tourData[tourStep].desc}</p>
            <div className="flex gap-2">
              <button onClick={() => { setShowTour(false); localStorage.setItem("hasSeenRoyalTour", "true"); }} className="px-3 py-2 text-[8px] font-black uppercase opacity-40 text-white">Skip</button>
              <button onClick={handleTourNext} className="flex-1 py-3 bg-[#D4AF37] text-black rounded-full text-[10px] font-black uppercase tracking-widest">{tourStep === tourData.length - 1 ? "Finish" : "Next"}</button>
            </div>
            <div className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-[#1a1a1a] border-l-2 border-t-2 border-[#D4AF37] rotate-45 ${tourData[tourStep].pos === 'header' ? 'top-full -translate-y-2' : 'bottom-full translate-y-2 rotate-[225deg]'}`} />
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className={`sticky top-0 z-50 p-4 rounded-b-[1.5rem] shadow-2xl text-center border-b border-[#D4AF37] ${theme === 'dark' ? 'bg-[#151515]' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-1">
          <p className="text-[8px] font-black text-[#D4AF37] tracking-[0.3em] uppercase italic">Royal Servant</p>
          <div className="flex gap-2">
            <button onClick={() => { setTourStep(0); setActiveTab("scanning"); setShowTour(true); }} className="p-1.5 rounded-full bg-gray-500/10 text-[#D4AF37]"><QuestionMarkIcon width={14}/></button>
            <button onClick={handlePinApp} className="p-1.5 rounded-full bg-gray-500/10 text-[#D4AF37]"><BookmarkFilledIcon width={14}/></button>
            <button onClick={loadSecurityData} disabled={isLoading} className="p-1.5 rounded-full bg-gray-500/10 text-[#D4AF37]"><UpdateIcon className={isLoading ? "animate-spin" : ""} width={14}/></button>
            <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} className="p-1.5 rounded-full bg-gray-500/10 text-[#D4AF37]">{theme === 'dark' ? <SunIcon width={14} /> : <MoonIcon width={14} />}</button>
          </div>
        </div>
        <h1 className="text-4xl font-black italic tracking-tighter leading-none">{activeTab === 'score' ? walletScore : (activeTab === 'permissions' ? spendPermissions.length : allowances.length)}</h1>
      </div>

      {/* CONTENT AREA */}
      <div className="px-4 mt-6">
        {activeTab === "scanning" && (
          <div className="space-y-2">
            {paginatedItems.map((item) => (
              <div key={item.id} className={`p-4 border rounded-[1.5rem] flex justify-between items-center opacity-70 ${theme === 'dark' ? 'bg-[#151515] border-white/5' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-500/10 flex items-center justify-center">
                    {item.tokenLogo ? <img src={item.tokenLogo} alt="logo" className="w-full h-full object-cover" /> : <CircleIcon className="text-[#D4AF37]" />}
                  </div>
                  <div className="text-left"><h4 className="font-black text-xs truncate max-w-[100px]">{item.tokenSymbol}</h4><p className="text-[8px] opacity-40 uppercase italic">Via: {item.spenderLabel}</p></div>
                </div>
                <div className="text-right"><p className="text-[10px] font-black">{item.amount}</p><p className={`text-[7px] font-bold uppercase ${item.risk === 'high' ? 'text-red-500' : 'text-green-500'}`}>{item.risk} risk</p></div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "revoke" && (
          <div className="space-y-2">
             {allowances.length > 0 && (
               <div className="flex justify-end px-2 mb-2">
                  <button onClick={() => setSelectedIds(selectedIds.size === allowances.length ? new Set() : new Set(allowances.map(a => a.id)))} className="text-[9px] font-black text-[#D4AF37] uppercase underline italic tracking-tighter active:opacity-50">
                     {selectedIds.size === allowances.length ? "Deselect All" : "Select All"}
                  </button>
               </div>
             )}
             {paginatedItems.map((item) => (
                <AllowanceCard key={item.id} item={item} selected={selectedIds.has(item.id)} theme={theme} onToggle={(id) => {
                    const next = new Set(selectedIds);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    setSelectedIds(next);
                }} />
             ))}
          </div>
        )}

        {activeTab === "score" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className={`p-8 rounded-[2rem] border-2 border-dashed border-[#D4AF37]/20 text-center ${theme === 'dark' ? 'bg-[#151515]' : 'bg-white'}`}>
              <div className="relative w-16 h-16 mx-auto mb-4">
                 {userProfile?.pfpUrl ? <img src={userProfile.pfpUrl} alt="pfp" className="w-full h-full rounded-full border-2 border-[#D4AF37]" /> : <div className="w-full h-full rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] border-2 border-[#D4AF37]"><StarIcon width={24}/></div>}
              </div>
              <h2 className="text-xl font-black italic uppercase mb-1">{userProfile?.displayName || 'Royal User'}</h2>
              <div className="flex flex-col gap-2 max-w-[150px] mx-auto mt-6">
                <div className="flex justify-between text-[10px] font-black italic"><span>HEALTH</span><span className={walletScore === 100 ? "text-green-500" : "text-[#D4AF37]"}>{walletScore}%</span></div>
                <div className="w-full bg-gray-500/20 h-1.5 rounded-full overflow-hidden"><div className="bg-[#D4AF37] h-full transition-all duration-1000" style={{ width: `${walletScore}%` }} /></div>
              </div>
              <button onClick={handleShare} className="mt-8 px-8 py-2.5 bg-[#D4AF37] text-black rounded-full font-black text-[9px] uppercase flex items-center gap-2 mx-auto active:scale-95 shadow-lg"><Share1Icon width={12} /> Share Health</button>
            </div>
            <div className="space-y-4 px-2 text-left">
                <p className="text-[10px] font-black text-[#D4AF37] tracking-[0.2em] uppercase italic">My experimental miniapps</p>
                <div className="grid gap-2">
                   {[
                     { name: "TX-Checker", url: "https://tx-xhecker.vercel.app/", desc: "Check your transaction score" },
                     { name: "Base Vote", url: "https://base-vote-alpha.vercel.app/", desc: "Onchain polls and community voting" },
                     { name: "Base Dating", url: "https://base-dating.vercel.app/", desc: "Experimental dating onchain" }
                   ].map((app, i) => (
                     <a key={i} href={app.url} target="_blank" rel="noopener noreferrer" className={`p-4 rounded-[1.2rem] border flex justify-between items-center group transition-all ${theme === 'dark' ? 'bg-[#111] border-white/5 hover:bg-[#151515]' : 'bg-white border-gray-100 hover:border-[#D4AF37]'}`}>
                        <div><p className="font-black text-xs uppercase italic tracking-tighter">{app.name}</p><p className="text-[8px] opacity-40 uppercase font-bold">{app.desc}</p></div>
                        <ExternalLinkIcon className="opacity-0 group-hover:opacity-100 transition-opacity text-[#D4AF37]" />
                     </a>
                   ))}
                </div>
            </div>
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (activeTab === 'scanning' || activeTab === 'revoke') && (
          <div className="flex justify-center items-center gap-4 py-8 mb-24 relative z-10">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] disabled:opacity-20"><ChevronLeftIcon/></button>
            <span className="text-[10px] font-black">{currentPage} / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] disabled:opacity-20"><ChevronRightIcon/></button>
          </div>
        )}
      </div>

      {/* REVOKE BUTTON */}
      {selectedIds.size > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-[calc(7.2rem+env(safe-area-inset-bottom))] left-0 right-0 px-10 max-w-[200px] mx-auto z-[101]">
          <button onClick={executeRevoke} className="w-full bg-[#1A1A1A] text-[#D4AF37] py-4 rounded-full font-black text-xs shadow-2xl border border-[#D4AF37] flex items-center justify-center gap-2 active:scale-95 uppercase italic">
            {isLoading ? <UpdateIcon className="animate-spin" /> : `Purify ${selectedIds.size}`}
          </button>
        </div>
      )}

      {/* NAV BAR */}
      <div className={`fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[90%] max-w-sm border rounded-[1.8rem] p-1 shadow-2xl flex justify-around z-[100] ${theme === 'dark' ? 'bg-[#1A1A1A] border-white/10' : 'bg-white border-gray-200'}`}>
        {[
          { id: 'scanning', icon: <EyeOpenIcon width={18}/>, label: 'Gatotkaca' },
          { id: 'permissions', icon: <MagnifyingGlassIcon width={18}/>, label: 'Srikandi' },
          { id: 'revoke', icon: <TargetIcon width={18}/>, label: 'Arjuna' },
          { id: 'score', icon: <StarIcon width={18}/>, label: 'Yudhistira' }
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-3 rounded-[1.5rem] flex flex-col items-center transition-all ${activeTab === tab.id ? 'bg-[#D4AF37] text-black shadow-lg scale-105 font-black' : 'text-gray-500 opacity-50'}`}>
            {tab.icon}<span className="text-[6px] font-black uppercase mt-0.5 tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
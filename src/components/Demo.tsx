/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
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
  Wallet, 
  ShieldAlert 
} from "lucide-react";

const erc20Abi = [
  { 
    name: 'approve', 
    type: 'function', 
    inputs: [
      { name: 'spender', type: 'address' }, 
      { name: 'amount', type: 'uint256' }
    ], 
    outputs: [{ name: '', type: 'bool' }] 
  }
] as const;

export const Demo = ({ userFid }: { userFid?: number }) => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { connect, connectors } = useConnect();
  const { sendCalls } = useSendCalls();

  // State Management
  const [activeTab, setActiveTab] = useState("scanning");
  const [allowances, setAllowances] = useState<AllowanceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSmartAccount, setIsSmartAccount] = useState(false);
  const [walletScore, setWalletScore] = useState(100);

  // --- 1. LOGIKA HYBRID (AUTO-CONNECT & SDK READY) ---
  useEffect(() => {
    const initializeApp = async () => {
      // Deteksi konektor Farcaster
      const farcasterConnector = connectors.find((c) => c.id === "farcaster");
      
      if (farcasterConnector && !isConnected) {
        // Auto-connect jika di dalam Warpcast
        connect({ connector: farcasterConnector });
      }

      // Memberitahu Farcaster App sudah siap (menghilangkan splash screen)
      // Dipanggil baik terhubung maupun tidak agar UI tidak hang
      try {
        await sdk.actions.ready();
      } catch (e) {
        console.log("Not in Farcaster environment");
      }
    };

    initializeApp();
  }, [connectors, isConnected, connect]);

  // --- 2. SECURITY CHECK LOGIC (GOPLUS) ---
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
        type: (security?.trust_list === "1") ? 'TOKEN' : 'SCAM' as any
      };
    } catch {
      return { symbol: "Unknown", isHoneypot: false, isScam: false, type: 'TOKEN' as any };
    }
  };

  // --- 3. LOAD DATA (ALCHEMY ALLOWANCES) ---
  useEffect(() => {
    const loadWalletData = async () => {
      if (!address) return;
      setIsLoading(true);
      try {
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
        // Hitung Skor: -15 poin per risiko tinggi
        const highRisks = enriched.filter(a => a.risk === 'high').length;
        setWalletScore(Math.max(100 - (highRisks * 15), 0));
      } finally {
        setIsLoading(false);
      }
    };
    loadWalletData();
  }, [address]);

  // --- 4. DETECT SMART ACCOUNT (FOR GASLESS) ---
  useEffect(() => {
    const checkType = async () => {
      if (address && publicClient) {
        const code = await publicClient.getBytecode({ address: address as `0x${string}` });
        setIsSmartAccount(code !== undefined && code !== "0x");
      }
    };
    checkType();
  }, [address, publicClient]);

  // --- 5. EXECUTE BATCH REVOKE ---
  const executeRevoke = async () => {
    const calls = selectedIds.map(id => {
      const item = allowances.find(a => a.id === id);
      return {
        to: item?.tokenAddress as Address,
        data: encodeFunctionData({ 
          abi: erc20Abi, 
          functionName: 'approve', 
          args: [item?.spender as Address, 0n] 
        }),
        value: 0n,
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
  };

  // --- UI: CONNECT SCREEN (NON-FARCASTER / DISCONNECTED) ---
  if (!isConnected) {
    return (
      <div className="max-w-xl mx-auto p-8 min-h-screen flex flex-col items-center justify-center gap-8 text-center">
        <div className="relative">
          <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl rotate-3">
             <ShieldAlert size={48} strokeWidth={2.5} />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-400 rounded-full border-4 border-white flex items-center justify-center">
             <ShieldCheck size={16} className="text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-black italic tracking-tighter text-gray-900">BASE APP SHIELD</h1>
          <p className="text-gray-500 text-sm font-medium px-6">
            Scan and Revoke dangerous contract permissions in your Base wallet.
          </p>
        </div>

        <div className="flex flex-col w-full gap-3 mt-4">
          {connectors.filter(c => c.id !== 'farcaster').map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connect({ connector })}
              className="group w-full bg-white border-2 border-gray-100 p-4 rounded-2xl flex items-center justify-between hover:border-blue-600 transition-all active:scale-95"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <Wallet size={20} className="text-gray-400 group-hover:text-blue-600" />
                </div>
                <span className="font-bold text-gray-700">{connector.name}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">→</div>
            </button>
          ))}
        </div>

        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">
          Secure • Batch • Gasless
        </p>
      </div>
    );
  }

  // --- UI: MAIN DASHBOARD (CONNECTED) ---
  return (
    <div className="max-w-xl mx-auto p-4 pb-32 flex flex-col gap-6 font-sans">
      
      {/* HEADER SECTION */}
      <div className="bg-[#0052FF] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden text-center">
        <div className="relative z-10">
          <p className="text-[10px] font-bold opacity-60 tracking-[0.3em] uppercase italic">Shield Active</p>
          <h1 className="text-5xl font-black italic mt-2 tracking-tighter">
            {activeTab === 'score' ? `${walletScore}/100` : isLoading ? "SCANNING" : `${allowances.filter(a => a.risk === 'high').length} RISKS`}
          </h1>
          <div className="flex justify-center gap-2 mt-4">
             <button onClick={() => sdk.actions.addMiniApp()} className="text-[10px] bg-white/20 px-4 py-1.5 rounded-full font-bold">Pin App</button>
             {isSmartAccount && <span className="text-[10px] bg-green-400 text-blue-900 px-4 py-1.5 rounded-full font-black italic uppercase">Gasless Ready</span>}
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -left-10 -top-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl" />
      </div>

      {/* CONTENT AREA */}
      <div className="min-h-[450px]">
        
        {/* TAB 1: SCANNING */}
        {activeTab === "scanning" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest px-2 italic">Asset Origins</h3>
            {isLoading ? (
               <div className="space-y-3">
                 {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-50 rounded-3xl animate-pulse" />)}
               </div>
            ) : (
              allowances.map((item) => (
                <div key={item.id} className="p-4 border-2 border-gray-100 rounded-[1.8rem] flex justify-between items-center bg-white shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${item.isScam ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                      {item.isScam ? <AlertOctagon size={22} /> : <ShieldCheck size={22} />}
                    </div>
                    <div>
                      <p className="font-black text-sm text-gray-800 tracking-tight">{item.tokenSymbol}</p>
                      <p className="text-[9px] font-bold uppercase text-gray-400 tracking-tighter">
                        {item.isScam ? "Suspicious Activity" : "Verified Interaction"}
                      </p>
                    </div>
                  </div>
                  <div className={`text-[8px] font-black px-2 py-1 rounded-md uppercase ${item.risk === 'high' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                    {item.risk} risk
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: REVOKE */}
        {activeTab === "revoke" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex justify-between items-center px-2">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest italic">Permissions</h3>
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

        {/* TAB 3: SCORE */}
        {activeTab === "score" && (
          <div className="flex flex-col gap-6 animate-in zoom-in-95">
            <div className="text-center p-12 bg-gray-50 rounded-[3.5rem] border-2 border-dashed border-gray-200">
               <Trophy size={64} className="mx-auto text-yellow-500 mb-4 drop-shadow-lg" />
               <h2 className="text-3xl font-black italic tracking-tighter">SECURITY RANK</h2>
               <div className="mt-4 flex flex-col items-center gap-1">
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Connected FID</p>
                 <p className="text-lg font-black text-blue-600">{userFid || 'External User'}</p>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* FLOATING NAVIGATION */}
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

      {/* PURGE BUTTON (ONLY ON REVOKE TAB) */}
      {selectedIds.length > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-28 left-0 right-0 px-6 max-w-xl mx-auto z-50 animate-in slide-in-from-bottom-10">
          <button onClick={executeRevoke} className="w-full bg-black text-white py-5 rounded-[2.2rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            PURGE {selectedIds.length} RISKS
            <span className="bg-[#0052FF] text-[10px] px-2 py-1 rounded italic uppercase font-bold">Gasless</span>
          </button>
        </div>
      )}
    </div>
  );
};
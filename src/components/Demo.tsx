/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect, usePublicClient } from "wagmi";
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
  Share2,
  ShieldAlert,
  Zap
} from "lucide-react";

// --- INTERFACE EXTENSION ---
interface ExtendedAllowanceItem extends AllowanceItem {
  spenderLabel?: string;
  tokenName?: string;
  tokenLogo?: string;
}

// --- ABIs ---
const erc20Abi = [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }] as const;
const nftAbi = [{ name: 'setApprovalForAll', type: 'function', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] }] as const;

export const Demo = ({ userFid }: { userFid?: number }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { sendCalls } = useSendCalls();
  const publicClient = usePublicClient();

  // State Management
  const [activeTab, setActiveTab] = useState("scanning");
  const [allowances, setAllowances] = useState<ExtendedAllowanceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [walletScore, setWalletScore] = useState(100);

  // --- 1. CONNECTION LOGIC ---
  useEffect(() => {
    if (isConnected) return;
    const farcaster = connectors.find((c) => c.id === "farcaster");
    const cbWallet = connectors.find((c) => c.id === "coinbaseWalletSDK");
    
    if (farcaster) connect({ connector: farcaster });
    else if (cbWallet) connect({ connector: cbWallet });
    
    sdk.actions.ready();
  }, [connectors, isConnected, connect]);

  // --- 2. MORALIS DEEP SCAN ---
  const loadSecurityData = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      // Moralis memindai history approval di Base (0x2105)
      const res = await fetch(
        `https://deep-index.moralis.io/api/v2.2/wallets/${address}/approvals?chain=base`,
        {
          headers: {
            "accept": "application/json",
            "X-API-Key": process.env.NEXT_PUBLIC_MORALIS_API_KEY || ""
          }
        }
      );
      
      const json = await res.json();
      const rawList = json.result || [];

      const enriched: ExtendedAllowanceItem[] = rawList.map((item: any, idx: number) => {
        // Kontrak tanpa label atau nilai Unlimited dianggap berisiko tinggi
        const isRisky = item.spender.address_label === null || item.value === "unlimited";
        const mappedType = item.token.contract_type === "ERC20" ? "TOKEN" : "NFT";

        return {
          id: `mol-${idx}`,
          tokenAddress: item.token.address,
          tokenSymbol: item.token.symbol || "UNKNOWN",
          tokenName: item.token.name,
          tokenLogo: item.token.logo,
          spender: item.spender.address,
          spenderLabel: item.spender.address_label || "Unknown Contract",
          amount: item.value_formatted === "Unlimited" ? "Unlimited" : item.value_formatted,
          risk: isRisky ? 'high' : 'low',
          type: mappedType as "TOKEN" | "NFT"
        };
      });

      setAllowances(enriched);
      const highRisks = enriched.filter(a => a.risk === 'high').length;
      setWalletScore(Math.max(100 - (highRisks * 10), 0));
    } catch (err) {
      console.error("Scan Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected) loadSecurityData();
  }, [isConnected, loadSecurityData]);

  // --- 3. SOCIAL SHARE ---
  const shareToFarcaster = async () => {
    const riskCount = allowances.filter(a => a.risk === 'high').length;
    const text = riskCount > 0 
      ? `🛡️ Just scanned my Base wallet with Royal Servant. Found ${riskCount} risky approvals! \n\nProtect your wallet here:`
      : `✅ My Base wallet is 100% clean! Trust Score: 100/100. \n\nScan your wallet on Royal Servant:`;

    sdk.actions.composeCast({
      text: text,
      embeds: [window.location.origin]
    });
  };

  // --- 4. ATOMIC BATCH REVOKE ---
  const executeRevoke = async () => {
    if (selectedIds.length === 0) return;

    const calls = selectedIds.map(id => {
      const item = allowances.find(a => a.id === id);
      if (!item) return null;

      if (item.type === "TOKEN") {
        return {
          to: item.tokenAddress as Address,
          data: encodeFunctionData({ 
            abi: erc20Abi, 
            functionName: 'approve', 
            args: [item.spender as Address, 0n] 
          }),
        };
      } else {
        return {
          to: item.tokenAddress as Address,
          data: encodeFunctionData({ 
            abi: nftAbi, 
            functionName: 'setApprovalForAll', 
            args: [item.spender as Address, false] 
          }),
        };
      }
    }).filter((call): call is any => call !== null);

    sendCalls({
      calls,
      capabilities: {
        paymasterService: { 
          url: `https://api.developer.coinbase.com/rpc/v1/base/paymaster?key=${process.env.NEXT_PUBLIC_CDP_API_KEY}` 
        }
      }
    });
    
    setSelectedIds([]);
    // Beri jeda agar user bisa melihat status sukses sebelum diarahkan share
    setTimeout(() => shareToFarcaster(), 4000);
  };

  if (!isConnected) return <div className="p-20 text-center font-black italic text-[#0052FF] animate-pulse">INITIATING ROYAL SHIELD...</div>;

  return (
    <div className="max-w-xl mx-auto p-4 pb-32 flex flex-col gap-6 font-sans antialiased">
      {/* HEADER SECTION */}
      <div className="bg-[#0052FF] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden text-center">
        <div className="relative z-10">
          <p className="text-[10px] font-black opacity-60 tracking-[0.4em] uppercase italic">Royal Security Service</p>
          <h1 className="text-6xl font-black italic mt-2 tracking-tighter">
            {activeTab === 'score' ? `${walletScore}%` : isLoading ? "SCANNING" : `${allowances.length}`}
          </h1>
          <div className="flex justify-center gap-4 mt-4">
             <button onClick={loadSecurityData} className="p-2 bg-white/20 rounded-full hover:bg-white/40 transition-all">
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
             </button>
             <button onClick={shareToFarcaster} className="p-2 bg-white/20 rounded-full hover:bg-white/40 transition-all">
                <Share2 size={14} />
             </button>
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* CONTENT AREA */}
      <div className="min-h-[400px]">
        {activeTab === "scanning" && (
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 italic">Approval Registry</h3>
            {isLoading ? (
               <div className="space-y-3">
                 {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-50 rounded-[1.8rem] animate-pulse" />)}
               </div>
            ) : allowances.length === 0 ? (
              <div className="text-center p-12 bg-gray-50 rounded-[2.5rem] text-gray-400 font-bold">No Active Permissions Found</div>
            ) : (
              allowances.map((item) => (
                <div key={item.id} className="p-4 border-2 border-gray-100 rounded-[1.8rem] flex justify-between items-center bg-white">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl ${item.risk === 'high' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                      {item.risk === 'high' ? <AlertOctagon size={20} /> : <ShieldCheck size={20} />}
                    </div>
                    <div className="flex flex-col">
                      <p className="font-black text-sm text-gray-800 leading-tight">{item.tokenSymbol}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase truncate max-w-[140px] mt-0.5">
                        Via: {item.spenderLabel}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-800 leading-none">{item.amount}</p>
                    <span className="text-[8px] font-bold text-gray-300 uppercase tracking-tighter">{item.type}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "revoke" && (
          <div className="space-y-3 animate-in fade-in">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Action Queue</h3>
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

        {activeTab === "score" && (
          <div className="space-y-6 text-center animate-in zoom-in-95">
             <div className="p-10 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                <Trophy size={64} className="mx-auto text-yellow-500 mb-4" />
                <h2 className="text-2xl font-black italic tracking-tighter">TRUST RANK</h2>
                <p className="text-3xl font-black text-blue-600 mt-2">FID: {userFid || 'GUEST'}</p>
             </div>
             <div className="bg-blue-600 p-6 rounded-[2.5rem] flex items-center justify-between text-white shadow-xl">
                <div className="flex items-center gap-4 text-left">
                  <div className="bg-white/20 p-3 rounded-2xl"><Zap fill="currentColor" size={24} /></div>
                  <div>
                    <p className="font-black italic text-sm">GASLESS READY</p>
                    <p className="text-[10px] font-bold opacity-80">Powered by Coinbase Smart Wallet</p>
                  </div>
                </div>
                <ShieldCheck size={24} />
             </div>
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white border border-gray-200 rounded-[2.5rem] p-2 shadow-2xl flex justify-around z-50">
        {[
          { id: 'scanning', icon: <Search size={22} />, label: 'Scan' },
          { id: 'revoke', icon: <Trash2 size={22} />, label: 'Revoke' },
          { id: 'score', icon: <Trophy size={22} />, label: 'Score' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)} 
            className={`flex-1 py-4 rounded-[2rem] flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'bg-[#0052FF] text-white shadow-lg' : 'text-gray-400'}`}
          >
            {tab.icon}
            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* MASS ACTION BUTTON */}
      {selectedIds.length > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-32 left-0 right-0 px-6 max-w-xl mx-auto z-50 animate-in slide-in-from-bottom-10">
          <button 
            onClick={executeRevoke} 
            className="w-full bg-black text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            PURGE {selectedIds.length} RISKS
            <span className="bg-[#0052FF] text-[10px] px-3 py-1 rounded-full italic font-black">Free</span>
          </button>
        </div>
      )}
    </div>
  );
};
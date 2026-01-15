/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect } from "wagmi";
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
  Share2
} from "lucide-react";

// --- PERBAIKAN TIPE DATA (FIX ERROR 2339) ---
interface ExtendedAllowanceItem extends AllowanceItem {
  spenderLabel?: string;
}

const erc20Abi = [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }] as const;
const nftAbi = [{ name: 'setApprovalForAll', type: 'function', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] }] as const;

export const Demo = ({ userFid }: { userFid?: number }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { sendCalls } = useSendCalls();

  const [activeTab, setActiveTab] = useState("scanning");
  const [allowances, setAllowances] = useState<ExtendedAllowanceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [walletScore, setWalletScore] = useState(100);

  useEffect(() => {
    if (isConnected) return;
    const farcaster = connectors.find((c) => c.id === "farcaster");
    const cbWallet = connectors.find((c) => c.id === "coinbaseWalletSDK");
    if (farcaster) connect({ connector: farcaster });
    else if (cbWallet) connect({ connector: cbWallet });
    sdk.actions.ready();
  }, [connectors, isConnected, connect]);

  // --- 1. SCAN LOGIC (FIXED USDC DETECTED AS NFT) ---
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

      const enriched: ExtendedAllowanceItem[] = rawList.map((item: any, idx: number) => {
        // Cek contract_type secara ketat
        const isERC20 = item.token.contract_type?.toUpperCase() === "ERC20";
        const typeLabel = isERC20 ? "TOKEN" : "NFT";

        return {
          id: `mol-${idx}`,
          tokenAddress: item.token.address,
          tokenSymbol: item.token.symbol || "UNKNOWN",
          spender: item.spender.address,
          spenderLabel: item.spender.address_label || "Unknown Contract",
          amount: item.value_formatted === "Unlimited" ? "Unlimited" : item.value_formatted,
          risk: (item.spender.address_label === null || item.value === "unlimited") ? 'high' : 'low',
          type: typeLabel as "TOKEN" | "NFT"
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

  // --- 2. REVOKE LOGIC (HAPUS PAYMASTER CONFIG) ---
  const executeRevoke = async () => {
    if (selectedIds.length === 0) return;

    try {
      const calls = selectedIds.map(id => {
        const item = allowances.find(a => a.id === id);
        if (!item) return null;

        return {
          to: item.tokenAddress as Address,
          data: item.type === "TOKEN" 
            ? encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [item.spender as Address, 0n] })
            : encodeFunctionData({ abi: nftAbi, functionName: 'setApprovalForAll', args: [item.spender as Address, false] }),
        };
      }).filter(Boolean);

      // Mengirim transaksi tanpa manual Paymaster
      // Biarkan Base App yang mengelola subsidi gas secara otomatis
      await sendCalls({
        calls: calls as any
      });
      
      setSelectedIds([]);
    } catch (e) {
      console.error("Revoke failed:", e);
    }
  };

  const shareScore = () => {
    sdk.actions.composeCast({
      text: `🛡️ My Wallet Score: ${walletScore}/100! \n\nProtect your Base assets with Royal Servant:`,
      embeds: ["https://base-royal-servant.vercel.app"]
    });
  };

  if (!isConnected) return <div className="p-20 text-center font-black text-[#0052FF] animate-pulse">CONNECTING...</div>;

  return (
    <div className="max-w-xl mx-auto p-4 pb-32 flex flex-col gap-6 font-sans antialiased">
      {/* HEADER */}
      <div className="bg-[#0052FF] p-8 rounded-[2.5rem] text-white shadow-2xl text-center">
        <h1 className="text-6xl font-black italic tracking-tighter">{walletScore}%</h1>
        <p className="text-[10px] font-black opacity-60 uppercase mt-2 italic tracking-widest">Trust Score</p>
        <button onClick={loadSecurityData} className="mt-4 p-2 bg-white/20 rounded-full">
           <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* CONTENT Area */}
      <div className="min-h-[400px]">
        {activeTab === "scanning" && (
          <div className="space-y-3">
            {allowances.map((item) => (
              <div key={item.id} className="p-4 border-2 border-gray-100 rounded-[1.8rem] flex justify-between items-center bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={item.risk === 'high' ? 'text-red-500' : 'text-green-500'}>
                    {item.risk === 'high' ? <AlertOctagon size={20} /> : <ShieldCheck size={20} />}
                  </div>
                  <div>
                    <p className="font-black text-sm">{item.tokenSymbol}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase truncate max-w-[150px]">{item.spenderLabel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[8px] font-black px-2 py-1 rounded-full ${item.type === 'TOKEN' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    {item.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "revoke" && (
          <div className="space-y-3">
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
          <div className="text-center p-10 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
             <Trophy size={64} className="mx-auto text-yellow-500 mb-4" />
             <p className="font-black text-2xl mb-4">RANK: {userFid || 'GUEST'}</p>
             <button onClick={shareScore} className="bg-blue-600 text-white px-8 py-3 rounded-full font-black text-xs flex items-center gap-2 mx-auto">
                <Share2 size={14} /> SHARE TO FEED
             </button>
          </div>
        )}
      </div>

      {/* FLOATING NAV */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white border border-gray-200 rounded-[2.5rem] p-2 shadow-2xl flex justify-around z-50">
        {['scanning', 'revoke', 'score'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)} 
            className={`flex-1 py-4 rounded-[2rem] flex flex-col items-center gap-1 transition-all ${activeTab === tab ? 'bg-[#0052FF] text-white shadow-lg' : 'text-gray-400'}`}
          >
            {tab === 'scanning' ? <Search size={22} /> : tab === 'revoke' ? <Trash2 size={22} /> : <Trophy size={22} />}
            <span className="text-[8px] font-black uppercase">{tab}</span>
          </button>
        ))}
      </div>

      {/* MASS ACTION BUTTON */}
      {selectedIds.length > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-32 left-0 right-0 px-6 max-w-xl mx-auto z-50">
          <button onClick={executeRevoke} className="w-full bg-black text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            PURGE {selectedIds.length} RISKS
          </button>
        </div>
      )}
    </div>
  );
};
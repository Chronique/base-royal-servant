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
  Share2,
  CheckCircle2
} from "lucide-react";

// --- TIPE DATA ---
interface ExtendedAllowanceItem extends AllowanceItem {
  spenderLabel?: string;
}

// --- ABIs ---
const erc20Abi = [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }] as const;
const nftAbi = [{ name: 'setApprovalForAll', type: 'function', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] }] as const;

export const Demo = ({ userFid }: { userFid?: number }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { sendCalls } = useSendCalls();

  // State Management
  const [activeTab, setActiveTab] = useState("scanning");
  const [allowances, setAllowances] = useState<ExtendedAllowanceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [walletScore, setWalletScore] = useState(100);
  const [isSuccess, setIsSuccess] = useState(false);

  // --- KONEKSI OTOMATIS ---
  useEffect(() => {
    if (isConnected) return;
    const farcaster = connectors.find((c) => c.id === "farcaster");
    const cbWallet = connectors.find((c) => c.id === "coinbaseWalletSDK");
    if (farcaster) connect({ connector: farcaster });
    else if (cbWallet) connect({ connector: cbWallet });
    sdk.actions.ready();
  }, [connectors, isConnected, connect]);

  // --- LOGIKA SCAN (MORALIS) ---
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
        // PERBAIKAN: Deteksi NFT yang lebih ketat agar USDC tidak salah deteksi
        const contractType = item.token.contract_type?.toUpperCase();
        const isNFT = contractType === "ERC721" || contractType === "ERC1155";
        
        return {
          id: `mol-${idx}`,
          tokenAddress: item.token.address,
          tokenSymbol: item.token.symbol || "UNKNOWN",
          spender: item.spender.address,
          spenderLabel: item.spender.address_label || "Contract",
          amount: item.value_formatted === "Unlimited" ? "Unlimited" : item.value_formatted,
          risk: (item.spender.address_label === null || item.value === "unlimited") ? 'high' : 'low',
          type: isNFT ? "NFT" : "TOKEN"
        };
      });

      setAllowances(enriched);
      const highRisks = enriched.filter(a => a.risk === 'high').length;
      setWalletScore(Math.max(100 - (highRisks * 10), 0));
    } catch (err) {
      console.error("Scan Failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected) loadSecurityData();
  }, [isConnected, loadSecurityData]);

  // --- EKSEKUSI REVOKE ---
  const executeRevoke = async () => {
    if (selectedIds.length === 0) return;
    setIsLoading(true);
    try {
      const calls = selectedIds.map(id => {
        const item = allowances.find(a => a.id === id);
        if (!item) return null;

        // Memastikan tipe data transaksi sesuai dengan kontrak asli
        return {
          to: item.tokenAddress as Address,
          value: 0n,
          data: item.type === "TOKEN" 
            ? encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [item.spender as Address, 0n] })
            : encodeFunctionData({ abi: nftAbi, functionName: 'setApprovalForAll', args: [item.spender as Address, false] }),
        };
      }).filter((c): c is any => c !== null);

      // Gunakan sendCalls murni. Base App akan mensubsidi gas secara otomatis jika tersedia
      await sendCalls({ calls });
      
      setSelectedIds([]);
      setIsSuccess(true);
    } catch (e) {
      console.error("Revoke Error:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const shareToFarcaster = () => {
    sdk.actions.composeCast({
      text: `🛡️ Scanned my Base wallet with Royal Servant! Rank: ${walletScore}/100. \n\nProtect your assets here:`,
      embeds: [window.location.origin]
    });
  };

  if (!isConnected) return <div className="p-20 text-center font-black text-[#0052FF] animate-pulse">LOADING...</div>;

  return (
    <div className="max-w-xl mx-auto p-4 pb-32 flex flex-col gap-6 font-sans antialiased">
      {/* HEADER */}
      <div className="bg-[#0052FF] p-8 rounded-[2.5rem] text-white shadow-2xl text-center relative overflow-hidden">
        <h1 className="text-6xl font-black italic tracking-tighter relative z-10">
          {activeTab === 'score' ? `${walletScore}%` : allowances.length}
        </h1>
        <p className="text-[10px] font-black opacity-60 uppercase mt-1 italic tracking-widest relative z-10">
           {activeTab === 'score' ? "Security Rank" : "Permissions"}
        </p>
        <button onClick={loadSecurityData} className="mt-4 p-2 bg-white/20 rounded-full relative z-10">
           <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </button>
        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* CONTENT */}
      <div className="min-h-[400px]">
        {isSuccess && activeTab === "revoke" && (
           <div className="mb-6 p-6 bg-green-50 border-2 border-green-200 rounded-[2rem] text-center animate-in zoom-in-95">
              <CheckCircle2 size={40} className="text-green-500 mx-auto mb-2" />
              <p className="font-black text-green-700 uppercase">Success! Wallet Secured.</p>
              <button onClick={shareToFarcaster} className="mt-3 px-6 py-2 bg-green-500 text-white rounded-full text-[10px] font-black uppercase">Share to Feed</button>
           </div>
        )}

        {activeTab === "scanning" && (
          <div className="space-y-3">
            {allowances.map((item) => (
              <div key={item.id} className="p-4 border-2 border-gray-100 rounded-[1.8rem] flex justify-between items-center bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={item.risk === 'high' ? 'text-red-500' : 'text-green-500'}>
                    {item.risk === 'high' ? <AlertOctagon size={20} /> : <ShieldCheck size={20} />}
                  </div>
                  <div>
                    <p className="font-black text-sm text-gray-800 leading-none mb-1">{item.tokenSymbol}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase truncate max-w-[150px]">Via: {item.spenderLabel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-800 leading-none">{item.amount}</p>
                  {/* Tulisan TOKEN/NFT sudah dihilangkan sesuai permintaan */}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "revoke" && (
          <div className="space-y-3">
             <div className="flex justify-between items-center px-2 mb-2">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Action List</h3>
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
          <div className="text-center space-y-6">
             <div className="p-10 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                <Trophy size={64} className="mx-auto text-yellow-500 mb-4" />
                <p className="font-black text-xl mb-4 italic tracking-tighter">FID: {userFid || 'GUEST'}</p>
                <button onClick={shareToFarcaster} className="bg-blue-600 text-white px-8 py-3 rounded-full font-black text-xs flex items-center gap-2 mx-auto">
                  <Share2 size={14} /> SHARE PERFORMANCE
                </button>
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
            onClick={() => { setActiveTab(tab.id); setIsSuccess(false); }} 
            className={`flex-1 py-4 rounded-[2rem] flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'bg-[#0052FF] text-white shadow-lg' : 'text-gray-400'}`}
          >
            {tab.icon}
            <span className="text-[8px] font-black uppercase">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* PURGE BUTTON */}
      {selectedIds.length > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-32 left-0 right-0 px-6 max-w-xl mx-auto z-50">
          <button 
            onClick={executeRevoke} 
            disabled={isLoading}
            className="w-full bg-black text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? "ESTIMATING..." : `PURGE ${selectedIds.length} RISKS`}
          </button>
        </div>
      )}
    </div>
  );
};
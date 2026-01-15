/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect, usePublicClient } from "wagmi";
import { useSendCalls, useCapabilities } from 'wagmi/experimental';
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
  ExternalLink,
  Zap,
  CheckCircle2
} from "lucide-react";

interface ExtendedAllowanceItem extends AllowanceItem {
  spenderLabel?: string;
}

const erc20Abi = [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }] as const;
const nftAbi = [{ name: 'setApprovalForAll', type: 'function', inputs: [{ name: 'operator', type: 'address' }, { name: 'approved', type: 'bool' }], outputs: [] }] as const;

export const Demo = ({ userFid }: { userFid?: number }) => {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors } = useConnect();
  const { sendCalls } = useSendCalls();
  const publicClient = usePublicClient();
  
  // Deteksi kapabilitas Gasless dari dompet user
  const { data: capabilities } = useCapabilities({ account: address });

  // State Management
  const [activeTab, setActiveTab] = useState("scanning");
  const [allowances, setAllowances] = useState<ExtendedAllowanceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [walletScore, setWalletScore] = useState(100);
  const [isSuccess, setIsSuccess] = useState(false);

  // Cek apakah dompet mendukung Gasless (Smart Wallet)
  const isGaslessSupported = !!capabilities?.[8453]?.paymasterService?.supported;

  useEffect(() => {
    if (isConnected) return;
    const farcaster = connectors.find((c) => c.id === "farcaster");
    const cbWallet = connectors.find((c) => c.id === "coinbaseWalletSDK");
    if (farcaster) connect({ connector: farcaster });
    else if (cbWallet) connect({ connector: cbWallet });
    sdk.actions.ready();
  }, [connectors, isConnected, connect]);

  // --- MORALIS SCAN ---
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

      const enriched: ExtendedAllowanceItem[] = rawList.map((item: any, idx: number) => ({
        id: `mol-${idx}`,
        tokenAddress: item.token.address,
        tokenSymbol: item.token.symbol || "UNKNOWN",
        spender: item.spender.address,
        spenderLabel: item.spender.address_label || "Active Contract",
        amount: item.value_formatted === "Unlimited" ? "∞" : item.value_formatted,
        risk: (item.spender.address_label === null || item.value === "unlimited") ? 'high' : 'low',
        type: item.token.contract_type === "ERC20" ? "TOKEN" : "NFT"
      }));

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

  // --- MANUAL SHARE ---
  const shareToFarcaster = () => {
    const text = `🛡️ Just secured my Base wallet with Royal Servant. Found ${allowances.length} active permissions! \n\nCheck your wallet security:`;
    sdk.actions.composeCast({
      text: text,
      embeds: ["https://base-royal-servant.vercel.app"]
    });
  };

  // --- EXECUTE REVOKE ---
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

      // Gunakan paymaster HANYA jika didukung oleh dompet
      const sendCapabilities = isGaslessSupported ? {
        paymasterService: { 
          url: `https://api.developer.coinbase.com/rpc/v1/base/paymaster?key=${process.env.NEXT_PUBLIC_CDP_API_KEY}` 
        }
      } : undefined;

      await sendCalls({
        calls: calls as any,
        capabilities: sendCapabilities
      });
      
      setIsSuccess(true);
      setSelectedIds([]);
    } catch (e) {
      console.error("Transaction failed:", e);
      alert("Error generating transaction. Please check if your wallet has enough ETH for gas or if the network is busy.");
    }
  };

  if (!isConnected) return <div className="p-20 text-center font-black italic text-[#0052FF] animate-pulse">CONNECTING...</div>;

  return (
    <div className="max-w-xl mx-auto p-4 pb-32 flex flex-col gap-6 font-sans antialiased">
      {/* HEADER */}
      <div className="bg-[#0052FF] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden text-center">
        <div className="relative z-10">
          <p className="text-[10px] font-black opacity-60 tracking-[0.4em] uppercase italic">Shield v2.0</p>
          <h1 className="text-6xl font-black italic mt-2 tracking-tighter">
            {activeTab === 'score' ? `${walletScore}%` : isLoading ? "SCAN" : `${allowances.length}`}
          </h1>
          <div className="flex justify-center gap-4 mt-4">
             <button onClick={loadSecurityData} className="p-2 bg-white/20 rounded-full hover:bg-white/40">
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
             </button>
             <button onClick={shareToFarcaster} className="p-2 bg-white/20 rounded-full hover:bg-white/40">
                <Share2 size={14} />
             </button>
          </div>
        </div>
      </div>

      {/* CONTENT Area */}
      <div className="min-h-[400px]">
        {isSuccess && activeTab === "revoke" && (
           <div className="mb-6 p-6 bg-green-50 border-2 border-green-200 rounded-[2rem] text-center animate-in zoom-in-95">
              <CheckCircle2 size={40} className="text-green-500 mx-auto mb-2" />
              <p className="font-black text-green-700">PURGE SUCCESSFUL!</p>
              <button onClick={shareToFarcaster} className="mt-3 px-6 py-2 bg-green-500 text-white rounded-full font-black text-[10px] uppercase">Share to Feed</button>
           </div>
        )}

        {activeTab === "scanning" && (
          <div className="space-y-4">
            {allowances.map((item) => (
              <div key={item.id} className="p-4 border-2 border-gray-100 rounded-[1.8rem] flex justify-between items-center bg-white">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-2xl ${item.risk === 'high' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                    {item.risk === 'high' ? <AlertOctagon size={20} /> : <ShieldCheck size={20} />}
                  </div>
                  <div>
                    <p className="font-black text-sm text-gray-800">{item.tokenSymbol}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase truncate max-w-[120px]">Spender: {item.spenderLabel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-800">{item.amount}</p>
                  <span className="text-[8px] font-bold text-gray-300 uppercase">{item.type}</span>
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
          <div className="space-y-6 text-center">
             <div className="p-10 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                <Trophy size={64} className="mx-auto text-yellow-500 mb-4" />
                <h2 className="text-2xl font-black italic">TRUST RANK</h2>
                <p className="text-3xl font-black text-blue-600 mt-2 italic">FID: {userFid || 'GUEST'}</p>
             </div>
             
             {/* KONDISIONAL GASLESS READY */}
             {isGaslessSupported ? (
                <div className="bg-blue-600 p-6 rounded-[2.5rem] flex items-center justify-between text-white shadow-xl">
                  <div className="flex items-center gap-4 text-left">
                    <div className="bg-white/20 p-3 rounded-2xl"><Zap fill="currentColor" size={24} /></div>
                    <div>
                      <p className="font-black italic text-sm">GASLESS READY</p>
                      <p className="text-[10px] font-bold opacity-80 uppercase">Coinbase Smart Wallet Active</p>
                    </div>
                  </div>
                  <ShieldCheck size={24} />
                </div>
             ) : (
                <div className="bg-gray-100 p-6 rounded-[2.5rem] flex items-center gap-4 text-left border-2 border-gray-200">
                  <div className="bg-gray-300 p-3 rounded-2xl"><Trash2 size={24} className="text-gray-500" /></div>
                  <div>
                    <p className="font-black italic text-sm text-gray-500 uppercase">Standard Wallet</p>
                    <p className="text-[10px] font-bold text-gray-400">Gas fees apply. Use Base App for gasless.</p>
                  </div>
                </div>
             )}
          </div>
        )}
      </div>

      {/* FLOATING NAV */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white border border-gray-200 rounded-[2.5rem] p-2 shadow-2xl flex justify-around z-50">
        {[
          { id: 'scanning', icon: <Search size={22} />, label: 'Scan' },
          { id: 'revoke', icon: <Trash2 size={22} />, label: 'Revoke' },
          { id: 'score', icon: <Trophy size={22} />, label: 'Score' }
        ].map((tab) => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)} 
            className={`flex-1 py-4 rounded-[2rem] flex flex-col items-center gap-1 transition-all ${activeTab === tab.id ? 'bg-[#0052FF] text-white shadow-lg scale-105' : 'text-gray-400'}`}
          >
            {tab.icon}
            <span className="text-[8px] font-black uppercase tracking-widest">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* MASS PURGE BUTTON */}
      {selectedIds.length > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-32 left-0 right-0 px-6 max-w-xl mx-auto z-50">
          <button onClick={executeRevoke} className="w-full bg-black text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3">
            PURGE {selectedIds.length} RISKS
            <span className="bg-[#0052FF] text-[10px] px-3 py-1 rounded-full italic font-black uppercase">
              {isGaslessSupported ? 'Free' : 'Revoke'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};
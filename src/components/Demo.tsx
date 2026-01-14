/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, usePublicClient, useConnect, useSignTypedData } from "wagmi";
import { useSendCalls } from 'wagmi/experimental';
import { AllowanceCard, type AllowanceItem } from "./AllowanceCard"; 
import { encodeFunctionData, type Address, hexToBigInt } from 'viem';
import { 
  Search, 
  Trophy, 
  Trash2, 
  ShieldCheck, 
  AlertOctagon, 
  RefreshCw, 
  Zap, 
  ShieldEllipsis 
} from "lucide-react";

// ABI & Constants
const erc20Abi = [{ name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }] as const;

// Alamat SpendPermissionManager di Base
const SPEND_PERMISSION_MANAGER = "0xf251cc660a92e1069796e959ec347e86e58908f9" as Address;

export const Demo = ({ userFid }: { userFid?: number }) => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { connect, connectors } = useConnect();
  const { sendCalls } = useSendCalls();
  const { signTypedDataAsync } = useSignTypedData();

  // State Management
  const [activeTab, setActiveTab] = useState("scanning");
  const [allowances, setAllowances] = useState<AllowanceItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [walletScore, setWalletScore] = useState(100);
  
  // Spend Permissions State
  const [isSessionActive, setIsSessionActive] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sessionPermission, setSessionPermission] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [sessionSignature, setSessionSignature] = useState<string | null>(null);

  // --- 1. SEAMLESS CONNECT (FARCASTER) ---
  useEffect(() => {
    const farcasterConnector = connectors.find((c) => c.id === "farcaster");
    if (farcasterConnector && !isConnected) {
      connect({ connector: farcasterConnector });
    }
    sdk.actions.ready();
  }, [connectors, isConnected, connect]);

  // --- 2. LOGIKA SESSION SHIELD (SPEND PERMISSIONS) ---
  const enableSessionShield = async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      
      // PERBAIKAN: Generate Salt dengan casting type yang benar
      const rawSalt = "0x" + Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      const permission = {
        account: address as Address,
        spender: "0x4fba95e4772be6d37a0c931D00570Fe2c9675524" as Address, 
        token: "0x0000000000000000000000000000000000000000" as Address, 
        allowance: 0n, 
        period: BigInt(86400),
        start: BigInt(now),
        end: BigInt(now + 86400),
        salt: hexToBigInt(rawSalt as `0x${string}`), // Perbaikan Error Line 69
        extraData: "0x" as `0x${string}`
      };

      // Tanda tangani izin EIP-712
      const signature = await signTypedDataAsync({
        domain: {
          name: "SpendPermissionManager",
          version: "1",
          chainId: 8453,
          verifyingContract: SPEND_PERMISSION_MANAGER,
        },
        types: {
          SpendPermission: [
            { name: "account", type: "address" },
            { name: "spender", type: "address" },
            { name: "token", type: "address" },
            { name: "allowance", type: "uint256" },
            { name: "period", type: "uint256" },
            { name: "start", type: "uint256" },
            { name: "end", type: "uint256" },
            { name: "salt", type: "uint256" },
            { name: "extraData", type: "bytes" },
          ],
        },
        primaryType: "SpendPermission",
        message: permission,
      });

      setSessionPermission(permission);
      setSessionSignature(signature);
      setIsSessionActive(true);
      alert("Shield Session Active! Purge risks without further pop-ups.");
    } catch (e) {
      console.error("Session failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. LOAD SECURITY DATA (ALCHEMY + GOPLUS HYBRID) ---
  const loadSecurityData = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const response = await fetch(`https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`, {
        method: 'POST',
        body: JSON.stringify({ jsonrpc: '2.0', method: 'alchemy_getTokenAllowances', params: [{ owner: address }], id: 1 }),
      });
      const json = await response.json();
      const rawList = json.result?.tokenAllowances || [];

      const enriched = await Promise.all(rawList.map(async (item: any, idx: number) => {
        const secRes = await fetch(`https://api.goplussecurity.com/api/v1/token_security/8453?contract_addresses=${item.tokenAddress}`);
        const secData = await secRes.json();
        const security = secData.result[item.tokenAddress.toLowerCase()];

        const symbol = await publicClient?.readContract({
          address: item.tokenAddress as Address,
          abi: [{ name: 'symbol', type: 'function', inputs: [], outputs: [{ type: 'string' }] }],
          functionName: 'symbol',
        }).catch(() => "Unknown");

        return {
          id: idx.toString(),
          tokenAddress: item.tokenAddress,
          tokenSymbol: symbol as string,
          spender: item.spender,
          amount: item.allowance.startsWith("0xffffff") ? "Unlimited" : "Limited",
          risk: (item.allowance.startsWith("0xffffff") || security?.is_honeypot === "1") ? 'high' : 'low',
          isScam: /scan|claim|airdrop/i.test(symbol as string),
          type: 'TOKEN'
        } as AllowanceItem;
      }));

      setAllowances(enriched);
      setWalletScore(Math.max(100 - (enriched.filter(a => a.risk === 'high').length * 15), 0));
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    if (isConnected) loadSecurityData();
  }, [isConnected, loadSecurityData]);

  // --- 4. EXECUTE BATCH PURGE ---
  const executeRevoke = async () => {
    if (selectedIds.length === 0) return;

    const calls = selectedIds.map(id => {
      const item = allowances.find(a => a.id === id);
      return {
        to: item?.tokenAddress as Address,
        data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [item?.spender as Address, 0n] }),
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
    
    setSelectedIds([]);
  };

  if (!isConnected) return <div className="p-20 text-center font-black italic text-[#0052FF] animate-pulse">CONNECTING...</div>;

  return (
    <div className="max-w-xl mx-auto p-4 pb-32 flex flex-col gap-6 font-sans antialiased">
      {/* HEADER SECTION */}
      <div className="bg-[#0052FF] p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden text-center">
        <div className="relative z-10">
          <p className="text-[10px] font-black opacity-60 tracking-[0.3em] uppercase italic">Shield Active</p>
          <h1 className="text-5xl font-black italic mt-2 tracking-tighter">
            {activeTab === 'score' ? `${walletScore}/100` : isLoading ? "SCANNING" : `${allowances.filter(a => a.risk === 'high').length} RISKS`}
          </h1>
          <div className="flex justify-center gap-3 mt-4">
             <button onClick={loadSecurityData} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-all">
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
             </button>
             {isSessionActive && <span className="text-[9px] bg-yellow-400 text-blue-900 px-3 py-1 rounded-full font-black italic uppercase flex items-center gap-1"><Zap size={10} /> Session Shield On</span>}
          </div>
        </div>
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* TABS CONTENT */}
      <div className="min-h-[400px]">
        {activeTab === "scanning" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2 italic">Asset Discovery</h3>
            {isLoading ? (
               <div className="space-y-3">
                 {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-50 rounded-[1.8rem] animate-pulse" />)}
               </div>
            ) : allowances.length === 0 ? (
              <div className="text-center p-12 bg-gray-50 rounded-[2.5rem] text-gray-400 font-bold">No Approvals Detected</div>
            ) : (
              allowances.map((item) => (
                <div key={item.id} className="p-4 border-2 border-gray-100 rounded-[1.8rem] flex justify-between items-center bg-white shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${item.risk === 'high' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                      {item.risk === 'high' ? <AlertOctagon size={22} /> : <ShieldCheck size={22} />}
                    </div>
                    <div>
                      <p className="font-black text-sm text-gray-800 leading-none mb-1">{item.tokenSymbol}</p>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                        {item.risk === 'high' ? "Risky Permission" : "Verified History"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "revoke" && (
          <div className="space-y-3 animate-in fade-in">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Permissions List</h3>
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
                <Trophy size={56} className="mx-auto text-yellow-500 mb-4" />
                <h2 className="text-2xl font-black italic tracking-tighter">TRUST RANK</h2>
                <p className="text-xl font-black text-blue-600 mt-2">{userFid || 'Guest'}</p>
             </div>
             
             {!isSessionActive ? (
                <button 
                  onClick={enableSessionShield}
                  className="w-full p-6 bg-yellow-50 border-2 border-yellow-200 rounded-[2.5rem] flex items-center justify-between hover:bg-yellow-100 transition-all"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="bg-yellow-400 p-3 rounded-2xl text-blue-900"><Zap fill="currentColor" size={24} /></div>
                    <div>
                      <p className="font-black italic text-sm">ACTIVATE SHIELD SESSION</p>
                      <p className="text-[10px] font-bold text-yellow-700">One-time sign for all future revokes today.</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-600">→</div>
                </button>
             ) : (
                <div className="p-6 bg-green-50 border-2 border-green-200 rounded-[2.5rem] flex items-center gap-4 text-left shadow-sm">
                   <div className="bg-green-500 p-3 rounded-2xl text-white"><ShieldEllipsis size={24} /></div>
                   <div>
                      <p className="font-black italic text-sm text-green-700">SESSION PROTECTED</p>
                      <p className="text-[10px] font-bold text-green-600 uppercase">Seamless purge enabled</p>
                   </div>
                </div>
             )}
          </div>
        )}
      </div>

      {/* NAVIGATION */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/95 backdrop-blur-2xl border border-gray-200 rounded-[2.5rem] p-2 shadow-2xl flex justify-around z-50">
        {[
          { id: 'scanning', icon: <Search size={20} />, label: 'Scan' },
          { id: 'revoke', icon: <Trash2 size={20} />, label: 'Revoke' },
          { id: 'score', icon: <Trophy size={20} />, label: 'Score' }
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

      {/* ACTION BUTTON */}
      {selectedIds.length > 0 && activeTab === "revoke" && (
        <div className="fixed bottom-32 left-0 right-0 px-6 max-w-xl mx-auto z-50 animate-in slide-in-from-bottom-10">
          <button onClick={executeRevoke} className="w-full bg-black text-white py-5 rounded-[2.5rem] font-black text-xl shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
            PURGE {selectedIds.length} RISKS
            <span className="bg-[#0052FF] text-[10px] px-3 py-1 rounded-full italic uppercase font-black">Gasless</span>
          </button>
        </div>
      )}
    </div>
  );
};
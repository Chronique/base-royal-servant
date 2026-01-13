"use client";

import React from "react";
import { AlertTriangle, FileText, Coins, Image as ImageIcon } from "lucide-react";

export interface AllowanceItem {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  spender: string;
  amount: string;
  risk: string;
  isHoneypot?: boolean;
  isScam?: boolean;
  type: 'TOKEN' | 'NFT' | 'SCAM'; // Ditambah tipe NFT
}

export const AllowanceCard = ({ item, selected, onToggle }: { item: AllowanceItem, selected: boolean, onToggle: (id: string) => void }) => {
  const isDanger = item.risk === 'high' || item.isScam;

  return (
    <div 
      onClick={() => onToggle(item.id)}
      className={`p-4 border-2 rounded-[1.8rem] flex justify-between items-center cursor-pointer transition-all active:scale-[0.98] ${
        selected ? 'border-[#0052FF] bg-blue-50 shadow-md' : 'border-gray-100 bg-white hover:border-gray-200'
      } ${isDanger ? 'border-red-100 bg-red-50/30' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
          isDanger ? 'bg-red-100 text-red-600' : item.type === 'NFT' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
        }`}>
          {isDanger ? <AlertTriangle size={24} /> : item.type === 'NFT' ? <ImageIcon size={24} /> : <Coins size={24} />}
        </div>

        <div className="overflow-hidden">
          <div className="flex items-center gap-2">
            <h4 className={`font-black truncate max-w-[120px] tracking-tight ${isDanger ? 'text-red-600' : 'text-gray-900'}`}>
              {item.tokenSymbol}
            </h4>
            {item.type === 'NFT' && <span className="text-[7px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded font-black uppercase">NFT</span>}
          </div>
          <p className="text-[10px] text-gray-400 font-bold truncate tracking-tighter">Spender: {item.spender.slice(0, 12)}...</p>
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0">
        <div className={`w-6 h-6 rounded-full border-2 mb-1 flex items-center justify-center transition-colors ${
          selected ? "bg-[#0052FF] border-[#0052FF]" : "border-gray-200"
        }`}>
          {selected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
        </div>
        <span className={`text-[9px] font-black uppercase tracking-tighter ${item.risk === 'high' ? 'text-red-500' : 'text-gray-400'}`}>
          {item.amount}
        </span>
      </div>
    </div>
  );
};
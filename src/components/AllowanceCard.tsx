"use client";

import React, { memo } from "react";
// PERBAIKAN: Ganti 'lucide-center' menjadi 'lucide-react'
import { ShieldAlert, Image as ImageIcon, Coins, ShieldCheck } from "lucide-react";

export interface AllowanceItem {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  spender: string;
  spenderLabel?: string; 
  amount: string;
  risk: string;
  type: 'TOKEN' | 'NFT'; 
}

export const AllowanceCard = memo(({ item, selected, onToggle }: { 
  item: AllowanceItem, 
  selected: boolean, 
  onToggle: (id: string) => void 
}) => {
  const isHighRisk = item.risk === 'high';

  return (
    <div 
      onClick={() => onToggle(item.id)}
      className={`p-5 border-2 rounded-[2rem] flex justify-between items-center cursor-pointer transition-all active:scale-[0.98] ${
        selected 
          ? 'border-[#D4AF37] bg-[#FFFDF5] shadow-lg' 
          : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
          isHighRisk ? 'bg-red-50 text-red-600' : 'bg-[#f4f1ea] text-[#D4AF37]'
        }`}>
          {isHighRisk ? <ShieldAlert size={24} /> : item.type === 'NFT' ? <ImageIcon size={24} /> : <Coins size={24} />}
        </div>

        <div className="overflow-hidden">
          <h4 className={`font-black text-base tracking-tight truncate max-w-[140px] ${isHighRisk ? 'text-red-600' : 'text-[#3E2723]'}`}>
            {item.tokenSymbol}
          </h4>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            {isHighRisk ? "⚠️ Risky Guard" : "Royal Guard"}
          </p>
        </div>
      </div>

      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
        selected ? "bg-[#D4AF37] border-[#D4AF37]" : "border-gray-200"
      }`}>
        {selected && <ShieldCheck size={14} className="text-white" />}
      </div>
    </div>
  );
});

AllowanceCard.displayName = "AllowanceCard";
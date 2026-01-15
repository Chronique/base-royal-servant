"use client";

import React, { memo } from "react";
import { ShieldAlert, Image as ImageIcon, Coins, ShieldCheck } from "lucide-react";

export interface AllowanceItem {
  id: string;
  tokenAddress: string;
  tokenSymbol: string;
  spender: string;
  amount: string;
  risk: string;
  type: 'TOKEN' | 'NFT'; 
}

// Gunakan React.memo untuk mencegah lag saat Select All
export const AllowanceCard = memo(({ item, selected, onToggle }: { item: any, selected: boolean, onToggle: (id: string) => void }) => {
  const isHighRisk = item.risk === 'high';

  return (
    <div 
      onClick={() => onToggle(item.id)}
      className={`p-4 border-2 rounded-[2rem] flex justify-between items-center cursor-pointer transition-all active:scale-[0.98] ${
        selected 
          ? 'border-[#D4AF37] bg-[#FFFDF5] shadow-[0_0_15px_rgba(212,175,55,0.1)]' 
          : 'border-gray-100 bg-white hover:border-gray-200'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          isHighRisk ? 'bg-red-50 text-red-500' : 'bg-[#f4f1ea] text-[#D4AF37]'
        }`}>
          {isHighRisk ? <ShieldAlert size={20} /> : item.type === 'NFT' ? <ImageIcon size={20} /> : <Coins size={20} />}
        </div>

        <div className="overflow-hidden">
          <h4 className={`font-black text-sm truncate max-w-[150px] tracking-tight ${isHighRisk ? 'text-red-600' : 'text-[#3E2723]'}`}>
            {item.tokenSymbol}
          </h4>
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
            {isHighRisk ? "⚠️ Risky Guard" : "Verified Guard"}
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
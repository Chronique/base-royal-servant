"use client";

import React, { memo } from "react";
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
      className={`p-4 border rounded-[1.8rem] flex justify-between items-center cursor-pointer transition-all active:scale-[0.98] ${
        selected 
          ? 'border-[#D4AF37] bg-[#D4AF37]/5' 
          : 'border-transparent bg-white/5 hover:bg-white/10'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          isHighRisk ? 'bg-red-500/20 text-red-500' : 'bg-[#D4AF37]/20 text-[#D4AF37]'
        }`}>
          {isHighRisk ? <ShieldAlert size={18} /> : item.type === 'NFT' ? <ImageIcon size={18} /> : <Coins size={18} />}
        </div>

        <div className="overflow-hidden">
          <h4 className={`font-black text-sm truncate max-w-[120px] ${isHighRisk ? 'text-red-500' : ''}`}>
            {item.tokenSymbol}
          </h4>
          <p className="text-[8px] opacity-40 uppercase truncate max-w-[130px]">Via: {item.spenderLabel}</p>
        </div>
      </div>

      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
        selected ? "bg-[#D4AF37] border-[#D4AF37]" : "border-gray-500/30"
      }`}>
        {selected && <ShieldCheck size={12} className="text-black" />}
      </div>
    </div>
  );
});

AllowanceCard.displayName = "AllowanceCard";
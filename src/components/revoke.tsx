// src/components/revoke/AllowanceCard.tsx
"use client";

import React from "react";

interface RevokeProps {
  token: { symbol: string };
  spender: { name: string };
  amount: string;
  onSelect: () => void;
  selected: boolean;
}

export const RevokeCard = ({ token, spender, amount, onSelect, selected }: RevokeProps) => {
  return (
    <div 
      onClick={onSelect}
      className={`p-4 mb-2 border rounded-xl flex justify-between items-center cursor-pointer ${
        selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-5 h-5 rounded border flex items-center justify-center ${selected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
          {selected && <span className="text-white text-[10px]">✓</span>}
        </div>
        <div>
          <h4 className="font-bold text-sm">{token.symbol}</h4>
          <p className="text-xs text-gray-500">Spender: {spender.name}</p>
        </div>
      </div>
      <div className="text-right">
        <span className={`text-xs px-2 py-1 rounded-full ${amount === 'Unlimited' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
          {amount}
        </span>
      </div>
    </div>
  );
};

export const AllowanceCard = ({ token, spender, amount, onSelect, selected }) => {
  return (
    <div className={`p-4 mb-2 border rounded-xl flex justify-between items-center ${selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
      <div className="flex items-center gap-3">
        <input type="checkbox" checked={selected} onChange={onSelect} className="w-5 h-5" />
        <div>
          <h4 className="font-bold text-sm">{token.symbol}</h4>
          <p className="text-xs text-gray-500">Spender: {spender.name} (Aerodrome/Uniswap)</p>
        </div>
      </div>
      <div className="text-right">
        <span className={`text-xs px-2 py-1 rounded-full ${amount === 'Unlimited' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
          {amount}
        </span>
        <button className="block text-blue-600 text-xs mt-1 font-semibold">Revoke</button>
      </div>
    </div>
  );
};
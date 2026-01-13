// src/lib/alchemy.ts
export const fetchAllowances = async (address: string) => {
  const url = `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'alchemy_getTokenAllowances',
      params: [
        {
          owner: address,
          pageKey: null,
        }
      ],
      id: 1,
    }),
  });

  const data = await response.json();
  return data.result.tokenAllowances;
};
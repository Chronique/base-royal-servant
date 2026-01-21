export const fetchAllowances = async (address: string) => {
  const response = await fetch('/api/allowances', {
    method: 'POST',
    body: JSON.stringify({ address }),
  });

  return await response.json();
};
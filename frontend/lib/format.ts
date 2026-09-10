export function formatAED(n: number): string {
  return `AED ${n.toFixed(2)}`;
}

export function formatUSD(n: number): string {
  return `$ ${n.toFixed(2)}`;
}
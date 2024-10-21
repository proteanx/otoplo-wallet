import StorageProvider from '../providers/storage.provider';
import { CapacitorHttp } from '@capacitor/core';
import bigDecimal from 'js-big-decimal';

export const currencySymbols: { [key: string]: string } = {
  usd: "$",
  eur: "€",
  gbp: "£",
  cny: "¥",
  jpy: "¥",
  aud: "A$",
  cad: "C$",
  chf: "Fr"
};

export const currencies = Object.keys(currencySymbols);

export async function getNexaPrice(): Promise<Record<string, number>> {
  const vs_currencies = currencies.join(",");
  
  var res = await CapacitorHttp.get({ url: `https://api.coingecko.com/api/v3/simple/price?ids=nexacoin&vs_currencies=${vs_currencies}` });
  if (res.status !== 200) {
    throw new Error("Failed to fetch price");
  }
  return res.data.nexacoin || {};
}

export async function getSelectedCurrency(): Promise<string> {
  return StorageProvider.getSelectedCurrency();
}

export async function setSelectedCurrency(currency: string): Promise<void> {
  return StorageProvider.setSelectedCurrency(currency);
}

export function getCurrencySymbol(currency: string): string {
  return currencySymbols[currency] || currency;
}

export function initializePrices(): Record<string, bigDecimal> {
  return currencies.reduce((acc, currency) => {
    acc[currency] = new bigDecimal(0);
    return acc;
  }, {} as Record<string, bigDecimal>);
}

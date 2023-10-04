import { Capacitor, CapacitorHttp } from '@capacitor/core';
import bigDecimal from 'js-big-decimal';

export async function getNexaPrice() {
    var res = await CapacitorHttp.get({ url: import.meta.env.VITE_PRICE_URL });
    return handleResponse(res);
}

function handleResponse(response: any) {
    if (response.status !== 200) {
        var err = new Error();
        (err as any).response = response;
        throw err;
    }
    
    return response.data;
}

export function isMobilePlatform() {
    return Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android';
}

export function isMobileScreen() {
    return window.innerWidth <= 768;
}

export function currentTimestamp() {
    return Math.floor(Date.now() / 1000);
}

export function isNullOrEmpty(arg?: string | any[]) {
    return !arg || arg.length === 0;
}

export function parseAmountWithDecimals(amount: string | number | bigint, decimals: number) {
    let val = new bigDecimal(amount).divide(new bigDecimal(Math.pow(10, decimals)), decimals).getPrettyValue();
    if (val.match(/\./)) {
        val = val.replace(/\.?0+$/, '');
    }
    return val;
}

export function getRawAmount(amount: string | number | bigint, decimals: number) {
    return new bigDecimal(amount).multiply(new bigDecimal(Math.pow(10, decimals))).getValue();
}
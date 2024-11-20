import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';
import bigDecimal from 'js-big-decimal';
import { toast, ToastContent, ToastOptions, ToastPosition, ToastTransition, TypeOptions } from 'react-toastify';
import nexcore from 'nexcore-lib';

export const MAX_INT64: bigint = 9223372036854775807n;

export function isMobilePlatform() {
    return Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android';
}

export function isMobileScreen() {
    return window.innerWidth <= 768;
}

export function currentTimestamp() {
    return Math.floor(Date.now() / 1000);
}

export function isNullOrEmpty(arg?: string | any[]): arg is undefined | [] | '' {
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

export function truncateStringMiddle(str?: string, maxLength: number = 0) {
    if (isMobilePlatform() && maxLength > 33) {
        maxLength = 33;
    }

    if (!str || str.length <= maxLength) {
        return str;
    }

    const ellipsis = '...';
    const halfLength = Math.floor((maxLength - ellipsis.length) / 2);
    const firstHalf = str.slice(0, halfLength);
    const secondHalf = str.slice(str.length - halfLength);

    return firstHalf + ellipsis + secondHalf;
};

export async function copy(value: string, position: ToastPosition = 'top-right', transition?: ToastTransition) {
    await Clipboard.write({ string: value });
    showToast('success', "Copied!", {
        position: isMobilePlatform() ? 'bottom-center' : position,
        autoClose: 1500,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
        transition: transition
    });
}

export function getAddressBuffer(address: string) {
    if (nexcore.util.js.isHexa(address)) {
        return Buffer.from(address, 'hex') ;
    }
    return nexcore.Address.decodeNexaAddress(address).getHashBuffer();
}

const defaultToastOpts: ToastOptions = {
    position: isMobilePlatform() ? 'bottom-center' : undefined,
    autoClose: 1500,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: 'touch',
    progress: undefined,
    theme: "dark"
}

export function showToast(type: TypeOptions, msg: ToastContent, opts: ToastOptions = defaultToastOpts) {
    switch (type) {
        case 'info':
            return toast.info(msg, opts);
        case 'success':
            return toast.success(msg, opts);
        case 'error':
            return toast.error(msg, opts);
        case 'warning':
            return toast.warning(msg, opts);
        default:
            return toast(msg, opts);
    }
}

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import * as Bip39 from 'bip39';
import CryptoJS from 'crypto-js';
import NexCore from 'nexcore-lib';
import { saveEncryptedSeed } from './localdb';

export async function getNexaPrice() {
    var res = await CapacitorHttp.get({ url: process.env.REACT_APP_PRICE_URL });
    return handleResponse(res);
}

export async function getBlockHeight() {
    var res = await CapacitorHttp.get({ url: process.env.REACT_APP_API_URL + "/s/height" });
    return handleResponse(res);
}

export async function checkBalanceAndTransactions(rAddrs, cAddrs, height) {
    const data = {
        receiveAddresses: rAddrs,
        changeAddresses: cAddrs,
        fromHeight: height
    };
    const options = {
        url: process.env.REACT_APP_API_URL + "/checkdata",
        headers: {'Content-Type': 'application/json'},
        data: data
    };

    var res = await CapacitorHttp.post(options);
    return handleResponse(res);
}

export async function checkBalances(addresses) {
    const options = {
        url: process.env.REACT_APP_API_URL + "/balances",
        headers: {'Content-Type': 'application/json'},
        data: addresses
    };

    var res = await CapacitorHttp.post(options);
    return handleResponse(res);
}

export async function fetchUtxos(rAddrs, cAddrs, toType, subFromAmount, manualFee, value, scriptSize) {
    const data = { 
        receiveAddresses: rAddrs,
        changeAddresses: cAddrs,
        type: toType,
        feeFromAmount: subFromAmount,
        explicitFee: manualFee,
        amount: value,
        outputScriptSize: scriptSize
    };
    const options = {
        url: process.env.REACT_APP_API_URL + "/utxos",
        headers: {'Content-Type': 'application/json'},
        data: data
    };

    var res = await CapacitorHttp.post(options);
    return handleResponse(res);
}

export async function fetchConsolidateUtxos(rAddrs, cAddrs, toType, scriptSize) {
    const data = {
        receiveAddresses: rAddrs,
        changeAddresses: cAddrs,
        type: toType,
        feeFromAmount: true,
        explicitFee: 0,
        amount: 0,
        outputScriptSize: scriptSize
    };
    const options = {
        url: process.env.REACT_APP_API_URL + "/consolidate",
        headers: {'Content-Type': 'application/json'},
        data: data
    };

    var res = await CapacitorHttp.post(options);
    return handleResponse(res);
}

export async function checkAddresses(rAddrs, cAddrs) {
    const data = { 
        receiveAddresses: rAddrs,
        changeAddresses: cAddrs,
        fromHeight: 0
    };
    const options = {
        url: process.env.REACT_APP_API_URL + "/scanaddresses",
        headers: {'Content-Type': 'application/json'},
        data: data
    };

    var res = await CapacitorHttp.post(options);
    return handleResponse(res);
}

export async function checkVaults(rAddrs, cAddrs) {
    const data = { 
        receiveAddresses: rAddrs,
        changeAddresses: cAddrs,
        fromHeight: 0
    };
    const options = {
        url: process.env.REACT_APP_API_URL + "/scanvaults",
        headers: {'Content-Type': 'application/json'},
        data: data
    };

    var res = await CapacitorHttp.post(options);
    return handleResponse(res);
}

export async function broadcastTransaction(txHex) {
    const data = { 
        hex: txHex
    };
    const options = {
        url: process.env.REACT_APP_API_URL + "/sendtx",
        headers: {'Content-Type': 'application/json'},
        data: data
    };

    var res = await CapacitorHttp.post(options);
    return handleResponse(res);
}

function handleResponse(response) {
    if (response.status !== 200) {
        var err = new Error();
        err.response = response;
        throw err;
    }
    
    return response.data;
}

export function validatePassword(pw, pwConfirm) {
    if (pw !== pwConfirm) {
        return "Passwords are not equal."
    }

    if (pw.length < 8) {
        return "Must contain at least 8 or more characters."
    }

    var lowerCaseLetters = /[a-z]/g;
    var upperCaseLetters = /[A-Z]/g;
    var numbers = /[0-9]/g;

    if (!pw.match(lowerCaseLetters)) {
        return "Must contain a lower case letter."
    }

    if (!pw.match(upperCaseLetters)) {
        return "Must contain an upper case letter."
    }

    if (!pw.match(numbers)) {
        return "Must contain a number."
    }

    return "";
}

export function generateWords() {
    return Bip39.generateMnemonic(128, null, Bip39.wordlists.english);
}

export function isMnemonicValid(mnemonic) {
    return Bip39.validateMnemonic(mnemonic,  Bip39.wordlists.english);
}

export function decryptMnemonic(encSeed, password) {
    return CryptoJS.AES.decrypt(Buffer.from(encSeed, 'hex').toString(), CryptoJS.SHA512(password).toString()).toString(CryptoJS.enc.Utf8);
}

export function encryptAndStoreMnemonic(phrase, password) {
    var encMn = CryptoJS.AES.encrypt(phrase, CryptoJS.SHA512(password).toString()).toString();
    var encMnHex = Buffer.from(encMn).toString('hex');
    saveEncryptedSeed(encMnHex);
}

export function generateMasterKey(mnemonic, passphrase) {
    const seed = Bip39.mnemonicToSeedSync(mnemonic, passphrase);
    const masterKey = NexCore.HDPrivateKey.fromSeed(seed);
    return masterKey.deriveChild(44, true).deriveChild(29223, true);
}

export function generateAccountKey(masterKey, account) {
    return masterKey.deriveChild(account, true);
}

/**
 * 
 * @param {HDPrivateKey} accountKey
 * @param {number} rIndex 
 * @param {number} cIndex 
 */
export function generateKeysAndAddresses(accountKey, fromRIndex, rIndex, fromCIndex, cIndex) {
    let receive = accountKey.deriveChild(0, false);
    let change = accountKey.deriveChild(1, false);
    let rKeys = [], cKeys = [];
    for (let index = fromRIndex; index < rIndex; index++) {
        let k = receive.deriveChild(index, false);    
        let addr = k.publicKey.toAddress().toNexaAddress();
        rKeys.push({key: k, address: addr});
    }
    for (let index = fromCIndex; index < cIndex; index++) {
        let k = change.deriveChild(index, false);
        let addr = k.publicKey.toAddress().toNexaAddress();
        cKeys.push({key: k, address: addr});
    }
    return {receiveKeys: rKeys, changeKeys: cKeys};
}

export function isValidAddress(address) {
    try {
        var decAddress = NexCore.Address.decodeNexaAddress(address);
        var isValid = NexCore.Address.isValid(decAddress.hashBuffer, decAddress.network, decAddress.type);
        return isValid && address.startsWith("nexa:");
    } catch {
        return false;
    }
}

export function isMobilePlatform() {
    return Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android';
}
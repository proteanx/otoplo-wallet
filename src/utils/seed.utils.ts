import * as Bip39 from 'bip39';
import StorageProvider from '../providers/storage.provider';
import CryptoJS from 'crypto-js';

export function validatePassword(pw: string, pwConfirm: string): string {
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
    return Bip39.generateMnemonic(128, undefined, Bip39.wordlists.english);
}

export function isMnemonicValid(mnemonic: string) {
    return Bip39.validateMnemonic(mnemonic,  Bip39.wordlists.english);
}

export function decryptMnemonic(encSeed: string, password: string) {
    return CryptoJS.AES.decrypt(Buffer.from(encSeed, 'hex').toString(), CryptoJS.SHA512(password).toString()).toString(CryptoJS.enc.Utf8);
}

export function encryptAndStoreMnemonic(phrase: string, password: string) {
    StorageProvider.setVersionCode("2");
    var encMn = CryptoJS.AES.encrypt(phrase, CryptoJS.SHA512(password).toString()).toString();
    var encMnHex = Buffer.from(encMn).toString('hex');
    StorageProvider.saveEncryptedSeed(encMnHex);
}


export async function isPasswordValid(password: string) {
    try {
        let encSeed = await StorageProvider.getEncryptedSeed();
        if (encSeed) {
            let decMn = decryptMnemonic(encSeed, password);
            if (decMn && isMnemonicValid(decMn)) {
                return decMn;
            }
        }
        return false;
    } catch {
        return false;
    }
}
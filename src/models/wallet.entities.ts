import type bigDecimal from "js-big-decimal";
import type HDPrivateKey from "nexcore-lib/types/lib/hdprivatekey"

export interface WalletKeys {
    receiveKeys: AddressKey[];
    changeKeys: AddressKey[];
}

export interface WalletIndexes {
    rIndex: number;
    cIndex: number;
}

export interface TxStatus {
    height: number;
}

export interface HodlStatus {
    idx: number;
}

export interface AddressKey {
    key: HDPrivateKey;
    address: string;
    balance: string;
    tokensBalance: Record<string, Balance>;
}

export interface Balance {
    confirmed: string | number;
    unconfirmed: string | number;
}

export interface Price {
    value: bigDecimal;
    change: bigDecimal;
}
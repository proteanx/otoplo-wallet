export type RostrumTransportScheme = 'ws' | 'wss';

export const RostrumScheme = {
    WS: 'ws',
    WSS: 'wss'
}

export interface RostrumParams {
    scheme: RostrumTransportScheme;
    host: string;
    port: number;
}

export interface BlockTip {
    height: number;
    hex: string;
}

export interface IFirstUse {
    block_hash: string;
    block_height: number;
    height: number;
    tx_hash: string;
}

export interface ITokenListUnspent {
    cursor?: any;
    unspent: ITokenUtxo[];
}

export interface ITokenUtxo {
    group: string;
    height: number;
    outpoint_hash: string;
    token_amount: number | bigint;
    token_id_hex: string;
    tx_hash: string;
    tx_pos: number;
    value: number;
}

export interface IListUnspentRecord {
    has_token: boolean;
    height: number;
    outpoint_hash: string;
    tx_hash: string;
    tx_pos: number;
    value: number;
}

export interface IUtxo {
    addresses: string[];
    amount: number;
    group: string;
    group_authority: bigint | number;
    group_quantity: bigint | number;
    height: number;
    scripthash: string;
    scriptpubkey: string;
    spent: ISpent;
    status: string;
    template_argumenthash: string;
    template_scripthash: string;
    token_id_hex: string;
    tx_hash: string;
    tx_idem: string;
    tx_pos: number;
}

export interface ISpent {
    height: number;
    tx_hash: string;
    tx_pos: number;
}

export interface ITransaction {
    blockhash: string;
    blocktime: number;
    confirmations: number;
    fee: number;
    fee_satoshi: number;
    hash: string;
    height: number;
    hex: string;
    locktime: number;
    size: number;
    time: number;
    txid: string;
    txidem: string;
    version: number;
    vin: ITXInput[];
    vout: ITXOutput[];
}

export interface ITXInput {
    outpoint: string;
    scriptSig: IScriptSig;
    sequence: number;
    value: number;
    value_satoshi: bigint | number;
    addresses: string[];
    group: string;
    groupAuthority: bigint | number;
    groupQuantity: bigint | number;
}

export interface ITXOutput {
    n: number;
    outpoint_hash: string;
    scriptPubKey: IScriptPubKey;
    type: number;
    value: number;
    value_satoshi: bigint | number;
}

export interface IScriptSig {
    asm: string;
    hex: string;
}

export interface IScriptPubKey {
    addresses: string[];
    argHash: string;
    asm: string;
    group: string;
    groupAuthority: bigint | number;
    groupQuantity: bigint | number;
    hex: string;
    scriptHash: string;
    token_id_hex?: string;
    type: string;
}

export interface ITXHistory {
    fee?: number;
    height: number;
    tx_hash: string;
}
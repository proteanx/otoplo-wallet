export type TxEntityState = 'incoming' | 'outgoing' | 'both';

export interface TransactionEntity {
  txIdem: string;
  txId: string;
  time: number;
  height: number;
  payTo: string;
  state: TxEntityState;
  value: string;
  fee: number;
  token: string;
  extraGroup: string;
  txGroupType: number;
  tokenAmount: string;
}

export interface ContractEntity {
  address: string;
  type: string;
  archive: number;
  confirmed: number;
  unconfirmed: number;
}

export interface TokenEntity {
  token: string;
  tokenIdHex: string;
  name: string;
  ticker: string;
  iconUrl: string;
  decimals: number;
  parentGroup: string;
  addedTime: number;
}

export interface NftEntity {
  token: string;
  tokenIdHex: string;
  parentGroup: string;
  zipData: Buffer;
  addedTime: number;
}
import { ContractEntity, NftEntity, TokenEntity, TransactionEntity } from "../models/db.entities";
import { Balance } from "../models/wallet.entities";

export interface IAppDB {
    clearData(): Promise<void>;
    initSchema(): Promise<boolean>;

    upsertTransaction(txEntry: TransactionEntity): Promise<void>;
    getTransactions(tokenId?: string): Promise<TransactionEntity[] | undefined>;
    getPageTransactions(pageNum: number, pageSize: number, tokenId?: string): Promise<TransactionEntity[] | undefined>;
    countTransactions(tokenId?: string): Promise<number>;
    clearTransactions(): Promise<void>;

    getVaults(isArchive: number): Promise<ContractEntity[] | undefined>;
    getVaultsAddresses(): Promise<ContractEntity[] | undefined>;
    upsertVault(vault: ContractEntity): Promise<void>;
    updateVaultArchive(address: string, isArchive: number): Promise<void>;
    updateVaultBalance(address: string, balance: Balance): Promise<void>;

    upsertToken(token: TokenEntity): Promise<void>;
    findTokenById(id: string): Promise<TokenEntity | undefined>;
    getTokens(): Promise<TokenEntity[] | undefined>;
    deleteToken(id: string): Promise<void>;

    upsertNft(nft: NftEntity): Promise<void>;
    getNfts(): Promise<NftEntity[] | undefined>;
    deleteNft(id: string): Promise<void>;
}
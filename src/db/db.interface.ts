import { ContractEntity, NftEntity, TokenEntity, TransactionEntity } from "../models/db.entities";
import { Balance } from "../models/wallet.entities";

export interface IAppDB {
    clearData(): Promise<void>;
    initSchema(): Promise<boolean>;

    upsertTransaction(txEntry: TransactionEntity): Promise<void>;
    getPageTransactions(pageNum: number, pageSize: number): Promise<TransactionEntity[] | undefined>;
    countTransactions(): Promise<number>;

    getVaults(isArchive: number): Promise<ContractEntity[] | undefined>;
    getVaultsAddresses(): Promise<ContractEntity[] | undefined>;
    upsertVault(vault: ContractEntity): Promise<void>;
    updateVaultArchive(address: string, isArchive: number): Promise<void>;
    updateVaultBalance(address: string, balance: Balance): Promise<void>;

    upsertToken(token: TokenEntity): Promise<void>;
    findTokenById(id: string): Promise<TokenEntity | undefined>;

    upsertNft(nft: NftEntity): Promise<void>;
    deleteNft(id: string): Promise<void>;
}
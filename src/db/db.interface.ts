import { ContractEntity, TransactionEntity } from "../models/db.entities";
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
}
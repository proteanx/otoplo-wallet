import { txUpdateTrigger } from "../app/App";
import { IAppDB } from "../db/db.interface";
import { DesktopDB } from "../db/desktop.db";
import { MobileDB } from "../db/mobile.db";
import { ContractEntity, TransactionEntity } from "../models/db.entities";
import { Balance } from "../models/wallet.entities";
import { isMobilePlatform } from "../utils/functions";

class DBProvider {

    appdb: IAppDB;

    constructor() {
        if (isMobilePlatform()) {
            this.appdb = new MobileDB();
        } else {
            this.appdb = new DesktopDB();
        }
    }

    public async initSchema() {
        return this.appdb.initSchema();
    }

    public async addLocalTransaction(tx: TransactionEntity) {
        try {
          await this.appdb.upsertTransaction(tx);
          txUpdateTrigger.setUpdateTrigger((prev) => prev + 1);
        } catch (error) {
          console.log(error);
        }
    }

    public async getPageLocalTransactions(pageNum: number, pageSize: number) {
        return await this.appdb.getPageTransactions(pageNum, pageSize);
    }

    public async countLocalTransactions() {
        return await this.appdb.countTransactions();
    }

    public async getLocalVaults(archive: boolean) {
        return await this.appdb.getVaults(archive ? 1 : 0);
    }

    public async getAllVaultsAddresses() {
        let addrs = await this.appdb.getVaultsAddresses();
        return addrs?.map(a => a.address);
    }

    public async addLocalVault(vault: ContractEntity) {
        return await this.appdb.upsertVault(vault);
    }

    public async updateLocalVaultArchive(address: string, archive: boolean) {
        return await this.appdb.updateVaultArchive(address, archive ? 1 : 0);
    }

    public async updateLocalVaultBalance(address: string, balance: Balance) {
        return await this.appdb.updateVaultBalance(address, balance);
    }
}

export const dbProvider = new DBProvider();
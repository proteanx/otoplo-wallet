import { nftUpdateTrigger, tokenUpdateTrigger, txUpdateTrigger } from "../app/App";
import { IAppDB } from "../db/db.interface";
import { DesktopDB } from "../db/desktop.db";
import { MobileDB } from "../db/mobile.db";
import { ContractEntity, NftEntity, TokenEntity, TransactionEntity } from "../models/db.entities";
import { Balance } from "../models/wallet.entities";
import { isMobilePlatform } from "../utils/common.utils";

class DBProvider {

    private appdb: IAppDB;

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

    public async clearData() {
        await this.appdb.clearData();
    }

    public async addLocalTransaction(tx: TransactionEntity) {
        try {
          await this.appdb.upsertTransaction(tx);
          txUpdateTrigger.setUpdateTrigger((prev) => prev + 1);
        } catch (error) {
          console.log(error);
        }
    }

    public async getPageLocalTransactions(pageNum: number, pageSize: number, tokenId?: string) {
        return await this.appdb.getPageTransactions(pageNum, pageSize, tokenId);
    }

    public async countLocalTransactions(tokenId?: string) {
        return await this.appdb.countTransactions(tokenId);
    }

    public async clearLocalTransactions() {
        await this.appdb.clearTransactions();
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

    public async saveToken(token: TokenEntity) {
        await this.appdb.upsertToken(token);
        tokenUpdateTrigger.setUpdateTrigger((prev) => prev + 1);
    }

    public async getTokenById(id: string) {
        return await this.appdb.findTokenById(id);
    }

    public async getLocalTokens() {
        return await this.appdb.getTokens();
    }

    public async deleteToken(id: string) {
        await this.appdb.deleteToken(id);
        tokenUpdateTrigger.setUpdateTrigger((prev) => prev + 1);
    }

    public async saveNft(nft: NftEntity) {
        await this.appdb.upsertNft(nft);
        nftUpdateTrigger.setUpdateTrigger((prev) => prev + 1);
    }

    public async deleteNft(id: string) {
        await this.appdb.deleteNft(id);
        nftUpdateTrigger.setUpdateTrigger((prev) => prev + 1);
    }
}

export const dbProvider = new DBProvider();
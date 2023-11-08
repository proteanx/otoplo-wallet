import Dexie, { Table } from "dexie";
import { IAppDB } from "./db.interface";
import { ContractEntity, NftEntity, TokenEntity, TransactionEntity } from "../models/db.entities";
import { Balance } from "../models/wallet.entities";

export class DesktopDB extends Dexie implements IAppDB {

  transactions!: Table<TransactionEntity>;
  contracts!: Table<ContractEntity>;
  tokens!: Table<TokenEntity>;
  nfts!: Table<NftEntity>;

  constructor() {
    super('nexa');
    
    this.version(3).stores({
      transactions: 'txIdem, time, group, extraGroup',
      contracts: 'address, [type+archive]',
      tokens: 'tokenIdHex, &token, parentGroup, addedTime',
      nfts: 'tokenIdHex, &token, parentGroup, addedTime'
    }).upgrade(async tx => {
      return await tx.table('transactions').clear();
    });
  }

  public async clearData() {
    await this.transactions.clear();
    await this.contracts.clear();
    await this.tokens.clear();
    await this.nfts.clear();
  }

  public async initSchema(): Promise<boolean> {
    return false;
  }

  public async upsertTransaction(tx: TransactionEntity) {
    await this.transactions.put(tx, tx.txIdem);
  }

  public async getPageTransactions(pageNum: number, pageSize: number, tokenId?: string): Promise<TransactionEntity[]> {
    if (tokenId) {
      return await this.transactions.where("group").equals(tokenId).reverse().offset((pageNum-1)*pageSize).limit(pageSize).sortBy("time");
    }
    return await this.transactions.orderBy('time').reverse().offset((pageNum-1)*pageSize).limit(pageSize).toArray();
  }

  public async countTransactions(tokenId?: string): Promise<number> {
    if (tokenId) {
      return await this.transactions.where("group").equals(tokenId).count();
    }
    return await this.transactions.count();
  }

  public async getVaults(isArchive: number): Promise<ContractEntity[] | undefined> {
    return await this.contracts.where({type: 'vault', archive: isArchive}).toArray();
  }

  public async getVaultsAddresses(): Promise<ContractEntity[] | undefined> {
    return await this.contracts.toArray();
  }

  public async upsertVault(vault: ContractEntity) {
    await this.contracts.put(vault, vault.address);
  }

  public async updateVaultArchive(address: string, isArchive: number) {
    await this.contracts.update(address, {archive: isArchive});
  }

  public async updateVaultBalance(address: string, balance: Balance) {
    await this.contracts.update(address, {confirmed: balance.confirmed, unconfirmed: balance.unconfirmed});
  }

  public async upsertToken(token: TokenEntity) {
    await this.tokens.put(token, token.tokenIdHex);
  }

  public async findTokenById(id: string) {
    return await this.tokens.where('tokenIdHex').equals(id).or('token').equals(id).first();
  }

  public async getTokens() {
    return await this.tokens.orderBy('addedTime').reverse().toArray();
  }

  public async deleteToken(id: string) {
    await this.tokens.delete(id);
  }

  public async upsertNft(nft: NftEntity) {
    await this.nfts.put(nft, nft.tokenIdHex);
  }

  public async deleteNft(id: string) {
    await this.nfts.delete(id);
  }
}
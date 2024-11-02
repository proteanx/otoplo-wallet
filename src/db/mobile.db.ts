import { existingConn } from "../app/App";
import { IAppDB } from "./db.interface";
import { CapacitorSQLite, CapacitorSQLitePlugin, capSQLiteSet, SQLiteConnection, SQLiteDBConnection } from "@capacitor-community/sqlite";
import { ContractEntity, NftEntity, TokenEntity, TransactionEntity } from "../models/db.entities";
import { Balance } from "../models/wallet.entities";

const createSchemaV1 =  [
  `CREATE TABLE IF NOT EXISTS transactions (
    txIdem TEXT PRIMARY KEY NOT NULL,
    address TEXT NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT 0,
    time INTEGER,
    height INTEGER,
    value TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS tx_time_idx ON transactions (time);`,

  `CREATE TABLE IF NOT EXISTS contracts (
    address TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    archive BOOLEAN NOT NULL DEFAULT 0,
    confirmed INTEGER NOT NULL DEFAULT 0,
    unconfirmed INTEGER NOT NULL DEFAULT 0
  );`,
  `CREATE INDEX IF NOT EXISTS type_idx ON contracts (type);`
];

const upgradeSchemaV2 =  [
  `DROP TABLE IF EXISTS transactions;`,

  `CREATE TABLE transactions (
    txIdem TEXT PRIMARY KEY NOT NULL,
    txId TEXT NOT NULL UNIQUE,
    time INTEGER,
    height INTEGER,
    payTo TEXT NOT NULL,
    state TEXT NOT NULL,
    value TEXT NOT NULL,
    fee INTEGER NOT NULL,
    token TEXT,
    extraGroup TEXT,
    txGroupType INTEGER,
    tokenAmount TEXT
  );`,
  `CREATE INDEX IF NOT EXISTS tx_time_idx ON transactions (time);`,
  `CREATE INDEX IF NOT EXISTS tx_token ON transactions (token);`,
  `CREATE INDEX IF NOT EXISTS tx_ex_group ON transactions (extraGroup);`,

  `CREATE TABLE IF NOT EXISTS tokens (
    tokenIdHex TEXT PRIMARY KEY NOT NULL,
    token TEXT NOT NULL UNIQUE,
    name TEXT,
    ticker TEXT,
    iconUrl TEXT,
    decimals INTEGER,
    parentGroup TEXT,
    addedTime INTEGER
  );`,
  `CREATE INDEX IF NOT EXISTS tokens_time_idx ON tokens (addedTime);`,
  `CREATE INDEX IF NOT EXISTS tokens_group ON tokens (parentGroup);`,
  
  `CREATE TABLE IF NOT EXISTS nfts (
    tokenIdHex TEXT PRIMARY KEY NOT NULL,
    token TEXT NOT NULL UNIQUE,
    zipData BLOB,
    parentGroup TEXT,
    addedTime INTEGER
  );`,
  `CREATE INDEX IF NOT EXISTS nfts_time_idx ON nfts (addedTime);`,
  `CREATE INDEX IF NOT EXISTS nfts_group ON nfts (parentGroup);`,
];
  
const upgradeStatements = [
  { toVersion: 1, statements: createSchemaV1 },
  { toVersion: 2, statements: upgradeSchemaV2 },
  // for future
  //{ toVersion: 3, statements: upgradeSchemaV3 },
];
const dbVersion = 2;

export class MobileDB implements IAppDB {

  private sqlitePlugin: CapacitorSQLitePlugin;
  private sqliteConnection: SQLiteConnection;

  constructor() {
    this.sqlitePlugin = CapacitorSQLite;
    this.sqliteConnection = new SQLiteConnection(CapacitorSQLite);
  }

  public async initSchema() {
    let db = await this.getDBConnection();
  
    let exist = await db.isExists();
    console.log("db exists: " + JSON.stringify(exist));
    await this.openDBIfNeeded(db);
    
    existingConn.setExistConn(true);
    return true;
  }

  public async clearData() {
    let db = await this.getDBConnection();
    let exist = await db.isExists();
    if (exist.result) {
      await this.openDBIfNeeded(db);

      let table = await db.isTable("transactions");
      if (table.result) {
        await db.run("DELETE FROM transactions");
      }

      table = await db.isTable("contracts");
      if (table.result) {
        await db.run("DELETE FROM contracts");
      }

      table = await db.isTable("tokens");
      if (table.result) {
        await db.run("DELETE FROM tokens");
      }

      table = await db.isTable("nfts");
      if (table.result) {
        await db.run("DELETE FROM nfts");
      }
    }
  }

  public async upsertTransaction(tx: TransactionEntity) {
    var query = 'INSERT OR REPLACE INTO transactions (txIdem,txId,time,height,payTo,state,value,fee,token,extraGroup,txGroupType,tokenAmount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?);';
    var params = [tx.txIdem, tx.txId, tx.time, tx.height, tx.payTo, tx.state, tx.value, tx.fee, tx.token, tx.extraGroup, tx.txGroupType, tx.tokenAmount];
    await this.execRun(query, params);
  }

  public async getTransactions(tokenId?: string): Promise<TransactionEntity[] | undefined> {
    if (tokenId) {
      return await this.execQuery("SELECT * FROM transactions WHERE token = ? ORDER BY time DESC;", [tokenId]);
    }
    return await this.execQuery("SELECT * FROM transactions ORDER BY time DESC;");
  }

  public async getPageTransactions(pageNum: number, pageSize: number, tokenId?: string): Promise<TransactionEntity[] | undefined> {
    if (tokenId) {
      return await this.execQuery("SELECT * FROM transactions WHERE token = ? ORDER BY time DESC LIMIT ? OFFSET ?;", [tokenId, pageSize, (pageNum-1)*pageSize]);
    }
    return await this.execQuery("SELECT * FROM transactions ORDER BY time DESC LIMIT ? OFFSET ?;", [pageSize, (pageNum-1)*pageSize]);
  }

  public async countTransactions(tokenId?: string): Promise<number> {
    let vals;
    if (tokenId) {
      vals = await this.execQuery("SELECT COUNT(*) AS c FROM transactions WHERE token = ?;", [tokenId]);
    } else {
      vals = await this.execQuery("SELECT COUNT(*) AS c FROM transactions;");
    }
    return vals ? vals[0].c : 0;
  }

  public async clearTransactions() {
    await this.execRun("DELETE FROM transactions");
  }

  public async getVaults(isArchive: number): Promise<ContractEntity[] | undefined> {
    return await this.execQuery("SELECT * FROM contracts WHERE type = 'vault' AND archive = ?;", [isArchive]);
  }

  public async getVaultsAddresses(): Promise<ContractEntity[] | undefined> {
    return await this.execQuery("SELECT address FROM contracts;");
  }

  public async upsertVault(vault: ContractEntity) {
    var query = 'INSERT OR REPLACE INTO contracts (address,type,archive,confirmed,unconfirmed) VALUES (?,?,?,?,?);';
    var params = [vault.address, vault.type, vault.archive, vault.confirmed, vault.unconfirmed];
    await this.execRun(query, params);
  }

  public async updateVaultArchive(address: string, isArchive: number) {
    await this.execRun("UPDATE contracts SET archive = ? WHERE address = ?;", [isArchive, address]);
  }

  public async updateVaultBalance(address: string, balance: Balance) {
    await this.execRun("UPDATE contracts SET confirmed = ?, unconfirmed = ? WHERE address = ?;", [balance.confirmed, balance.unconfirmed, address]);
  }

  public async upsertToken(token: TokenEntity) {
    var query = 'INSERT OR REPLACE INTO tokens (tokenIdHex,token,name,ticker,iconUrl,decimals,parentGroup,addedTime) VALUES (?,?,?,?,?,?,?,?);';
    var params = [token.tokenIdHex, token.token, token.name, token.ticker, token.iconUrl, token.decimals, token.parentGroup, token.addedTime];
    await this.execRun(query, params);
  }

  public async findTokenById(id: string): Promise<TokenEntity | undefined> {
    let res = await this.execQuery("SELECT * FROM tokens WHERE tokenIdHex = ? OR token = ?;", [id, id]);
    return res ? res[0] : undefined;
  }

  public async getTokens(): Promise<TokenEntity[] | undefined> {
    return await this.execQuery("SELECT * FROM tokens ORDER BY addedTime DESC;");
  }

  public async deleteToken(id: string) {
    await this.execRun('DELETE FROM tokens WHERE tokenIdHex = ? OR token = ?;', [id, id]);
  }

  public async upsertNft(nft: NftEntity) {
    var query = 'INSERT OR REPLACE INTO nfts (tokenIdHex,token,zipData,parentGroup,addedTime) VALUES (?,?,?,?,?);';
    var params = [nft.tokenIdHex, nft.token, nft.zipData, nft.parentGroup, nft.addedTime];
    await this.execRun(query, params);
  }

  public async getNfts(): Promise<NftEntity[] | undefined> {
    return await this.execQuery("SELECT * FROM nfts ORDER BY addedTime DESC;");
  }

  public async deleteNft(id: string) {
    await this.execRun('DELETE FROM nfts WHERE tokenIdHex = ? OR token = ?;', [id, id]);
  }

  private async getDBConnection() {
    let consistency = await this.sqliteConnection.checkConnectionsConsistency();
    let isConn = await this.sqliteConnection.isConnection("nexa-db", false);
    let db;
    if (consistency?.result && isConn.result) {
      db = await this.sqliteConnection.retrieveConnection("nexa-db", false);
    } else {
      await this.sqlitePlugin.addUpgradeStatement({ database: "nexa-db", upgrade: upgradeStatements })
      db = await this.sqliteConnection.createConnection("nexa-db", false, "no-encryption", dbVersion, false);
    }
    return db;
  }

  private async openDBIfNeeded(db: SQLiteDBConnection) {
    var isOpen = (await db.isDBOpen()).result;
    if (!isOpen) {
      console.log("open connection");
      await db.open();
    }
  }

  private async execQuery(query: string, params?: any[]) {
    var db = await this.getDBConnection();
    await this.openDBIfNeeded(db);
    var ret = await db.query(query, params);
    return ret.values;
  }
  
  private async execRun(query: string, params?: any[]) {
    var db = await this.getDBConnection();
    await this.openDBIfNeeded(db);
    var ret = await db.run(query, params);
    return ret.changes?.changes;
  }
  
  private async execSet(set: capSQLiteSet[]) {
    var db = await this.getDBConnection();
    await this.openDBIfNeeded(db);
    var ret = await db.executeSet(set);
    return ret.changes?.changes;
  }
}
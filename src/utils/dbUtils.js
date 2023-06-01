import { SQLiteDBConnection } from "react-sqlite-hook";
import { sqlite } from "../app/App";

export const createSchemaV1 =  [
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

export const upgradeStatements = [
  { toVersion: 1, statements: createSchemaV1 },
  // for future
  //{ toVersion: 2, statements: upgradeSchemaV2 },
];

/**
 * @returns {Promise<SQLiteDBConnection>}
 */
export async function getDBConnection() {
  let consistency = await sqlite.checkConnectionsConsistency();
  let isConn = await sqlite.isConnection("nexa-db", false);
  let db;
  if (consistency?.result && isConn.result) {
    db = await sqlite.retrieveConnection("nexa-db", false);
  } else {
    var version = 1;
    for (const upg of upgradeStatements) {
      await sqlite.addUpgradeStatement("nexa-db", upg);
      version = upg.toVersion;
    }
    db = await sqlite.createConnection("nexa-db", false, "no-encryption", version);
  }
  return db;
}

export async function clearLocalWallet() {
  let db = await getDBConnection();
  let exist = await db.isExists();
  if (exist.result) {
    await openDBIfNeeded(db);

    let table = await db.isTable("transactions");
    if (table.result) {
      await db.run("DELETE FROM transactions");
    }

    table = await db.isTable("contracts");
    if (table.result) {
      await db.run("DELETE FROM contracts");
    }
  }
}

export async function execQuery(query, params) {
  var db = await getDBConnection();
  await openDBIfNeeded(db);
  var ret = await db.query(query, params);
  return ret.values;
}

export async function execRun(query, params) {
  var db = await getDBConnection();
  await openDBIfNeeded(db);
  var ret = await db.run(query, params);
  return ret.values;
}

export async function execSet(set) {
  var db = await getDBConnection();
  await openDBIfNeeded(db);
  var ret = await db.executeSet(set);
  return ret.values;
}

export async function openDBIfNeeded(db) {
  var isOpen = (await db.isDBOpen()).result;
  if (!isOpen) {
    console.log("open connection");
    await db.open();
  }
}
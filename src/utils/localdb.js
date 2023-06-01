import Dexie from 'dexie';
import { Preferences } from '@capacitor/preferences';
import { existingConn, txUpdateTrigger } from '../app/App';
import { isMobilePlatform } from './functions';
import * as dbUtils from './dbUtils';

export const localdb = new Dexie("nexa");
localdb.version(2).stores({
  transactions: 'txIdem, time',
  contracts: 'address, [type+archive]'
});

export async function getEncryptedSeed() {
  if (isMobilePlatform()) {
    var seed = await Preferences.get({ key: "seed" });
    return seed.value;
  }

  var wInfo = localStorage.getItem("wallet");
  if (wInfo !== null) {
      wInfo = JSON.parse(wInfo);
      if (wInfo.mnemonic) {
          return wInfo.mnemonic;
      }
  }
  return null;
}

export function saveEncryptedSeed(seed) {
  if (isMobilePlatform()) {
    Preferences.set({ key: 'seed', value: seed });
  } else {
    localStorage.setItem('wallet', JSON.stringify({mnemonic: seed}));
  }
}

export async function clearCachedWallet() {
  localStorage.clear();
  if (!isMobilePlatform()) {
    await localdb.contracts.clear();
    return await localdb.transactions.clear();
  }
  
  await Preferences.clear();
  return await dbUtils.clearLocalWallet();
}

export async function addLocalTransactions(txs, pending, confirmed, height, total) {
  await setTransactionsState({pending: pending, confirmed: confirmed, height: height, total: total});

  if (isMobilePlatform()) {
    var set = [];
    for (const tx of txs) {
      set.push({
        statement: 'INSERT OR REPLACE INTO transactions (txIdem,address,confirmed,time,height,value) VALUES (?,?,?,?,?,?);',
        values: [tx.txIdem, tx.address, tx.confirmed, tx.time, tx.height, tx.value]
      });
    }
    await dbUtils.execSet(set);
  } else {
    txs.forEach(async tx => {
      try {
          await localdb.transactions.put(tx, tx.txIdem);
      } catch (error) {
          console.log(error);
      }
    });
  }
  txUpdateTrigger.setUpdateTrigger((prev) => prev + 1);
}

export async function addLocalTransaction(tx) {
    try {
      if (isMobilePlatform()) {
        var query = 'INSERT OR REPLACE INTO transactions (txIdem,address,confirmed,time,height,value) VALUES (?,?,?,?,?,?);';
        var params = [tx.txIdem, tx.address, tx.confirmed, tx.time, tx.height, tx.value];
        await dbUtils.execRun(query, params);
      } else {
        await localdb.transactions.put(tx, tx.txIdem);
      }
      txUpdateTrigger.setUpdateTrigger((prev) => prev + 1);
    } catch (error) {
      console.log(error);
    }
}

export async function getLocalTransactions() {
  if (isMobilePlatform()) {
    return await dbUtils.execQuery("SELECT * FROM transactions;");
  }
  return await localdb.transactions.toArray();
}

export async function getPageLocalTransactions(pageNum, pageSize) {
  if (isMobilePlatform()) {
    return await dbUtils.execQuery("SELECT * FROM transactions ORDER BY time DESC LIMIT ? OFFSET ?;", [pageSize, (pageNum-1)*pageSize]);
  }
  return await localdb.transactions.orderBy('time').reverse().offset((pageNum-1)*pageSize).limit(pageSize).toArray();
}

export async function countLocalTransactions() {
  if (isMobilePlatform()) {
    var vals = await dbUtils.execQuery("SELECT COUNT(*) AS c FROM transactions;");
    return vals[0].c;
  }
  return await localdb.transactions.count();
}

export async function setTransactionsState(state) {
  if (isMobilePlatform()) {
    await Preferences.set({key: "tx-state", value: JSON.stringify(state)});
  } else {
    localStorage.setItem("tx-state", JSON.stringify(state));
  }
}

export async function getTransactionsState() {
  var state;
  if (isMobilePlatform()) {
    var t = await Preferences.get({ key: "tx-state" });
    state = t.value;
  } else {
    state = localStorage.getItem("tx-state");
  }
  return state !== null ? JSON.parse(state) : {pending: 0, confirmed: 0, height: 0, total: 0}; 
}

export async function setAddressesIndexes(aIndexes) {
  if (isMobilePlatform()) {
    await Preferences.set({key: "wallet-idx", value: JSON.stringify(aIndexes)});
  } else {
    localStorage.setItem("wallet-idx", JSON.stringify(aIndexes));
  }
}

export async function getAddressesIndexes() {
  var idx;
  if (isMobilePlatform()) {
    var t = await Preferences.get({ key: "wallet-idx" });
    idx = t.value;
  } else {
    idx = localStorage.getItem("wallet-idx");
  }
  return idx !== null ? JSON.parse(idx) : {rIndex: 0, cIndex: 0};
}

export function setLock(lock) {
  if (localStorage.getItem(lock) == null) {
    localStorage.setItem(lock, "true");
    return true;
  }
  return false;
}

export function removeLock(lock) {
  localStorage.removeItem(lock);
}

export function setLastCheck() {
  var time = Math.floor(Date.now() / 1000);
  localStorage.setItem("last-check", time);
}

export function getLastCheck() {
  return localStorage.getItem("last-check");
}

export function setVaultLastCheck() {
  var time = Math.floor(Date.now() / 1000);
  localStorage.setItem("last-check-vault", time);
}

export function getVaultLastCheck() {
  return localStorage.getItem("last-check-vault");
}

export async function getLocalVaults(archive) {
  var isArchive = archive ? 1 : 0;
  if (isMobilePlatform()) {
    return await dbUtils.execQuery("SELECT * FROM contracts WHERE type = 'vault' AND archive = ?;", [isArchive]);
  }
  return await localdb.contracts.where({type: 'vault', archive: isArchive}).toArray();
}

export async function getAllVaultsAddresses() {
  var addrs;
  if (isMobilePlatform()) {
    addrs = await dbUtils.execQuery("SELECT address FROM contracts;");
  } else {
    addrs = await localdb.contracts.toArray();
  }
  return addrs.map(a => a.address);
}

export async function addLocalVault(vault) {
  try {
    if (isMobilePlatform()) {
      var query = 'INSERT OR REPLACE INTO contracts (address,type,archive,confirmed,unconfirmed) VALUES (?,?,?,?,?);';
      var params = [vault.address, vault.type, vault.archive, vault.confirmed, vault.unconfirmed];
      await dbUtils.execRun(query, params);
    } else {
      await localdb.contracts.put(vault, vault.address);
    }
  } catch (error) {
    console.log(error);
  }
}

export async function updateLocalVaultArchive(address, archive) {
  var isArchive = archive ? 1 : 0;
  if (isMobilePlatform()) {
    return await dbUtils.execRun("UPDATE contracts SET archive = ? WHERE address = ?;", [isArchive, address]);
  }
  return await localdb.contracts.update(address, {archive: isArchive});
}

export async function updateLocalVaultBalance(address, balance) {
  if (isMobilePlatform()) {
    return await dbUtils.execRun("UPDATE contracts SET confirmed = ?, unconfirmed = ? WHERE address = ?;", [balance.confirmed, balance.unconfirmed, address]);
  }
  return await localdb.contracts.update(address, {confirmed: balance.confirmed, unconfirmed: balance.unconfirmed});
}

export async function setHodlState(state) {
  if (isMobilePlatform()) {
    await Preferences.set({key: "hodl-state", value: JSON.stringify(state)});
  } else {
    localStorage.setItem("hodl-state", JSON.stringify(state));
  }
}

export async function getHodlState() {
  var state;
  if (isMobilePlatform()) {
    var t = await Preferences.get({ key: "hodl-state" });
    state = t.value;
  } else {
    state = localStorage.getItem("hodl-state");
  }
  return state !== null ? JSON.parse(state) : {idx: 0};
}

export async function initSchema() {
  let db = await dbUtils.getDBConnection();

  let exist = await db.isExists();
  console.log("db exists: " + JSON.stringify(exist));
  await dbUtils.openDBIfNeeded(db);
  
  existingConn.setExistConn(true);
  return true;
}
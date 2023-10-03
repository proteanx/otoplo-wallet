import { Preferences } from "@capacitor/preferences";
import { currentTimestamp, isMobilePlatform } from "../utils/functions";
import { HodlStatus, TxStatus, WalletIndexes } from "../models/wallet.entities";
import { RostrumParams, RostrumScheme } from "../models/rostrum.entities";

export default class StorageProvider {

  public static readonly SYNC_LOCK = "syncing";
  public static readonly VAULT_SCAN_LOCK = "vault-scan";
  public static readonly VAULT_REFRESH_LOCK = "refresh-vaults";

  public static async clearData() {
    localStorage.clear();
    if (isMobilePlatform()) {
      await Preferences.clear();
    }
  }

  public static async getEncryptedSeed(): Promise<string | null> {
    if (isMobilePlatform()) {
      let seed = await Preferences.get({ key: "seed" });
      return seed.value;
    }
  
    let wallet = localStorage.getItem("wallet");
    if (wallet !== null) {
        let wInfo = JSON.parse(wallet);
        if (wInfo.mnemonic) {
            return wInfo.mnemonic;
        }
    }
    return null;
  }

  public static async saveEncryptedSeed(seed: string) {
    if (isMobilePlatform()) {
      await Preferences.set({ key: 'seed', value: seed });
    } else {
      localStorage.setItem('wallet', JSON.stringify({mnemonic: seed}));
    }
  }

  public static async getVersionCode(): Promise<string | null> {
    if (isMobilePlatform()) {
      let t = await Preferences.get({ key: "version-code" });
      return t.value;
    } else {
      return localStorage.getItem("version-code");
    }
  }

  public static async setVersionCode(code: string) {
    if (isMobilePlatform()) {
      await Preferences.set({ key: 'version-code', value: code });
    } else {
      localStorage.setItem('version-code', code);
    }
  }

  public static async setTransactionsState(state: TxStatus) {
    if (isMobilePlatform()) {
      await Preferences.set({key: "tx-state", value: JSON.stringify(state)});
    } else {
      localStorage.setItem("tx-state", JSON.stringify(state));
    }
  }

  public static async getTransactionsState(): Promise<TxStatus> {
    var state;
    if (isMobilePlatform()) {
      var t = await Preferences.get({ key: "tx-state" });
      state = t.value;
    } else {
      state = localStorage.getItem("tx-state");
    }
    return state !== null ? JSON.parse(state) : {height: 0};
  }

  public static async saveWalletIndexes(aIndexes: WalletIndexes) {
    if (isMobilePlatform()) {
      await Preferences.set({key: "wallet-idx", value: JSON.stringify(aIndexes)});
    } else {
      localStorage.setItem("wallet-idx", JSON.stringify(aIndexes));
    }
  }
  
  public static async getWalletIndexes(): Promise<WalletIndexes> {
    var idx;
    if (isMobilePlatform()) {
      var t = await Preferences.get({ key: "wallet-idx" });
      idx = t.value;
    } else {
      idx = localStorage.getItem("wallet-idx");
    }
    return idx !== null ? JSON.parse(idx) : {rIndex: 0, cIndex: 0};
  }

  public static setLock(lock: string) {
    if (localStorage.getItem(lock) == null) {
      localStorage.setItem(lock, "true");
      return true;
    }
    return false;
  }

  public static removeLock(lock: string) {
    localStorage.removeItem(lock);
  }

  public static setLastCheck() {
    var time = currentTimestamp();
    localStorage.setItem("last-check", time.toString());
  }
  
  public static getLastCheck() {
    let time = localStorage.getItem("last-check");
    return time ? parseInt(time) : null;
  }
  
  public static setVaultLastCheck() {
    var time = currentTimestamp();
    localStorage.setItem("last-check-vault", time.toString());
  }
  
  public static getVaultLastCheck() {
    return localStorage.getItem("last-check-vault");
  }

  public static async setHodlState(state: HodlStatus) {
    if (isMobilePlatform()) {
      await Preferences.set({key: "hodl-state", value: JSON.stringify(state)});
    } else {
      localStorage.setItem("hodl-state", JSON.stringify(state));
    }
  }
  
  public static async getHodlState(): Promise<HodlStatus> {
    var state;
    if (isMobilePlatform()) {
      var t = await Preferences.get({ key: "hodl-state" });
      state = t.value;
    } else {
      state = localStorage.getItem("hodl-state");
    }
    return state !== null ? JSON.parse(state) : {idx: 0};
  }

  public static getRostrumParams(): RostrumParams {
    var params = localStorage.getItem("rostrum-params");
    return params !== null ? JSON.parse(params) : {scheme: RostrumScheme.WSS, host: 'rostrum.otoplo.com', port: 443};
  }

  public static saveRostrumParams(params: RostrumParams) {
    localStorage.setItem("rostrum-params", JSON.stringify(params));
  }
}
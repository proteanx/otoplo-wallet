import { Preferences } from "@capacitor/preferences";
import { currentTimestamp, isMobilePlatform } from "../utils/common.utils";
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
    return await this.getValue("version-code");
  }

  public static async setVersionCode(code: string) {
    await this.setValue('version-code', code);
  }

  public static async setTransactionsState(state: TxStatus) {
    await this.setValue("tx-state", JSON.stringify(state));
  }

  public static async getTransactionsState(): Promise<TxStatus> {
    let state = await this.getValue("tx-state");
    return state !== null ? JSON.parse(state) : {height: 0};
  }

  public static async saveWalletIndexes(aIndexes: WalletIndexes) {
    await this.setValue("wallet-idx", JSON.stringify(aIndexes))
  }
  
  public static async getWalletIndexes(): Promise<WalletIndexes> {
    let idx = await this.getValue("wallet-idx");
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
    let time = currentTimestamp();
    localStorage.setItem("last-check", time.toString());
  }
  
  public static getLastCheck() {
    let time = localStorage.getItem("last-check");
    return time ? parseInt(time) : null;
  }
  
  public static setVaultLastCheck() {
    let time = currentTimestamp();
    localStorage.setItem("last-check-vault", time.toString());
  }
  
  public static getVaultLastCheck() {
    return localStorage.getItem("last-check-vault");
  }

  public static async setHodlState(state: HodlStatus) {
    await this.setValue("hodl-state", JSON.stringify(state));
  }
  
  public static async getHodlState(): Promise<HodlStatus> {
    let state = await this.getValue("hodl-state");
    return state !== null ? JSON.parse(state) : {idx: 0};
  }

  public static async getRostrumParams(): Promise<RostrumParams> {
    let params = await this.getValue("rostrum-params");
    return params !== null ? JSON.parse(params) : {scheme: RostrumScheme.WSS, host: 'rostrum.otoplo.com', port: 443};
  }

  public static async saveRostrumParams(params: RostrumParams) {
    await this.setValue("rostrum-params", JSON.stringify(params));
  }

  public static async removeRostrumParams() {
    await this.removeValue("rostrum-params");
  }

  public static async setHideZeroTokenConfig(hide: boolean) {
    await this.setValue("zero-tokens", JSON.stringify(hide));
  }

  public static async getHideZeroTokenConfig() {
    let hide = await this.getValue("zero-tokens");
    return hide === "true";
  }

  private static async setValue(key: string, value: string) {
    if (isMobilePlatform()) {
      await Preferences.set({key: key, value: value});
    } else {
      localStorage.setItem(key, value);
    }
  }

  private static async getValue(key: string) {
    if (isMobilePlatform()) {
      let v = await Preferences.get({ key: key });
      return v.value;
    } else {
      return localStorage.getItem(key);
    }
  }

  private static async removeValue(key: string) {
    if (isMobilePlatform()) {
      await Preferences.remove({ key: key });
    } else {
      localStorage.removeItem(key);
    }
  }
}
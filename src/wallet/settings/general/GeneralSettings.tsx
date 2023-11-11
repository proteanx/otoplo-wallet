import WalletBackup from "./WalletBackup";
import SettingsRow from "../SettingsRow";
import RostrumSettings from "./RostrumSettings";
import RescanTxs from "./RescanTxs";
import WalletReset from "./WalletReset";

export default function GeneralSettings() {
  return (
    <>
      <SettingsRow hr title="Backup Seed" info="Reveal the 12-words seed phrase.">
        <WalletBackup/>
      </SettingsRow>
      <RostrumSettings/>
      <SettingsRow hr title="Rescan Transactions" info="Clear transactions data to force rescan the blockchain.">
        <RescanTxs/>
      </SettingsRow>
      <SettingsRow title="Reset Wallet" info="Erase all wallet data stored on your device, including your vaults, tokens, transaction histories and settings.">
        <WalletReset/>
      </SettingsRow>
    </>
  )
}
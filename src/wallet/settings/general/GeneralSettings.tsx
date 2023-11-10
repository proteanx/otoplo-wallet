import WalletBackup from "./WalletBackup";
import SettingsRow from "../SettingsRow";
import RostrumSettings from "./RostrumSettings";

export default function GeneralSettings() {
  return (
    <>
      <SettingsRow hr
          title="Backup Seed"
          info="Reveal the 12-words seed phrase."
          action={<WalletBackup/>}
      />
      <RostrumSettings/>
    </>
  )
}
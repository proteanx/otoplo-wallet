import SettingsRow from "../SettingsRow";
import ReleaseNotes from "./ReleaseNotes";

export default function AboutSettings() {
  return (
    <>
      <SettingsRow hr title="Version" info={`Otoplo Wallet ${import.meta.env.VITE_VERSION}`}>
        <ReleaseNotes/>
      </SettingsRow>
      <SettingsRow hr title="Otoplo Website" info="Visit our site for news and updates.">
        <a href="https://otoplo.com/" target='_blank'><i className="fa-solid fa-arrow-up-right-from-square"/></a>
      </SettingsRow>
      <SettingsRow title="Otoplo Telegram" info="Visit our Telegram group.">
        <a href="https://t.me/otoplo" target='_blank'><i className="fa-solid fa-arrow-up-right-from-square"/></a>
      </SettingsRow>
    </>
  )
}
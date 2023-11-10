import { Button } from "react-bootstrap";
import SettingsRow from "../SettingsRow";

export default function AboutSettings() {
  return (
    <>
      <SettingsRow hr
          title="Version"
          info={`Otoplo Wallet ${import.meta.env.VITE_VERSION}`}
          action={<Button>Details</Button>}
      />
      <SettingsRow hr
          title="Otoplo Website"
          info="Visit our site for news and updates."
          action={<a href="https://otoplo.com/" target='_blank'><i className="fa-solid fa-arrow-up-right-from-square"/></a>}
      />
      <SettingsRow
          title="Otoplo Telegram"
          info="Visit our Telegram group."
          action={<a href="https://t.me/otoplo" target='_blank'><i className="fa-solid fa-arrow-up-right-from-square"/></a>}
      />
    </>
  )
}
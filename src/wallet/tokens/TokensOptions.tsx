import { Alert, Button, Dropdown, Form, Modal, Spinner } from "react-bootstrap";
import { Balance } from "../../models/wallet.entities";
import StorageProvider from "../../providers/storage.provider";
import { ChangeEvent, ReactElement, useState } from "react";
import { dbProvider } from "../../app/App";
import { getTokenInfo } from "../../utils/token.utils";
import NiftyProvider from "../../providers/nifty.provider";
import { currentTimestamp, isNullOrEmpty } from "../../utils/common.utils";
import { TokenEntity } from "../../models/db.entities";

interface OptionsProps {
  hideZero: boolean;
  setHideZero: (hide: boolean) => void;
  tokensBalance: Record<string, Balance>;
}

export default function TokensOptions({ hideZero, setHideZero, tokensBalance }: OptionsProps) {
  const [showRecoverDialog, setShowRecoverDialog] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState("");
  const [spinner, setSpinner] = useState<ReactElement | string>("");

  const handleChangeZeroConfig = (e: ChangeEvent<HTMLInputElement>) => {
    StorageProvider.setHideZeroTokenConfig(e.target.checked);
    setHideZero(e.target.checked);
  }

  const cancelRecoverDialog = () => {
    setRecoverMsg("");
    setSpinner("");
    setShowRecoverDialog(false);
  }

  const recoverTokens = async () => {
    setSpinner(<Spinner animation="border" size="sm"/>);
    try {
      let newTokens: TokenEntity[] = [];
      let tokens = await dbProvider.getLocalTokens();
      let tokensHex = tokens?.map(t => t.tokenIdHex);

      for (let token in tokensBalance) {
        if (tokensHex?.includes(token)) {
          continue;
        }
        if (NiftyProvider.isNiftySubgroup(token)) {
          continue;
        }

        let newToken = await getTokenInfo(token);
        if (newToken) {
          newToken.addedTime = currentTimestamp();
          newTokens.push(newToken);
        }
      }

      if (!isNullOrEmpty(newTokens)) {
        for (let t of newTokens) {
          await dbProvider.saveToken(t);
        }
        setRecoverMsg("Found new tokens! you can close this window.");
      } else {
        setRecoverMsg("No new tokens found.");
      }
    } catch (e) {
      setRecoverMsg("Failed to scan for tokens. " + (e instanceof Error ? e.message : "Make sure the wallet is online."));
    } finally {
      setSpinner("");
    }
  }

  return (
    <>
      <Dropdown className="ms-1 d-inline-block" data-bs-theme="dark" >
        <Dropdown.Toggle id="dropdown-option" variant="outline-primary">
          <i className="fa-solid fa-ellipsis"/>
        </Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => setShowRecoverDialog(true)}>Recover Tokens</Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.ItemText>
            <Form.Switch style={{ whiteSpace: "nowrap" }} label="Hide zero balance" checked={hideZero} onChange={handleChangeZeroConfig}/>
          </Dropdown.ItemText>
        </Dropdown.Menu>
      </Dropdown>

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showRecoverDialog} onHide={cancelRecoverDialog} backdrop="static" keyboard={false} centered>
        <Modal.Header closeButton={spinner === ""}>
          <Modal.Title>Recover Tokens</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-2">
            If you have tokens that does not appear, you can start discovery process and let the wallet scan for tokens.
          </div>
          <div className='mb-2'>
            {spinner !== "" ? <b>Scanning... This process might take few minutes, do not close this window!</b> : "" }
          </div>
          <Alert show={recoverMsg !== ""} variant={recoverMsg.includes("Failed") ? "danger" : "success"}>
            {recoverMsg}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          { 
            recoverMsg === '' 
              ? <Button disabled={spinner !== ""} onClick={recoverTokens}>{spinner !== "" ? spinner : "Start Scan"}</Button> 
              : <Button variant="secondary" onClick={cancelRecoverDialog}>Close</Button>
          }
        </Modal.Footer>
      </Modal>
    </>
  )
}

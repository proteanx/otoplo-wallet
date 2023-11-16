import { ChangeEvent, useState } from "react";
import { Button, Form, InputGroup, Modal, Spinner } from "react-bootstrap";
import { getTokenInfo } from "../../utils/token.utils";
import { TokenEntity } from "../../models/db.entities";
import dummy from '../../assets/img/token-icon-placeholder.svg';
import { dbProvider } from "../../app/App";
import { currentTimestamp, showToast } from "../../utils/common.utils";
import NiftyProvider from "../../providers/nifty.provider";

export default function TokenImport() {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [tokenData, setTokenData] = useState<TokenEntity | false>(false);
  const [searchVal, setSearchVal] = useState("");

  const closeDialog = () => {
    setTokenData(false);
    setErrMsg("");
    setLoading(false);
    setSearchVal("");
    setShowDialog(false);
  }

  const setToken = (e: ChangeEvent<HTMLInputElement>) => {
    setTokenData(false);
    setErrMsg("");
    setSearchVal(e.target.value);
  }

  const searchToken = async () => {
    if (!searchVal) {
      return;
    }

    setTokenData(false);
    setErrMsg("");
    setLoading(true);
    try {
      let token = await getTokenInfo(searchVal);
      if (token && !NiftyProvider.isNiftySubgroup(token.tokenIdHex)) {
        setTokenData(token);
      } else {
        setErrMsg("Token not found. please validate address or try again later.");
      }
    } finally {
      setLoading(false);
    }
  }
  
  const importToken = async () => {
    if (!tokenData) {
      return;
    }

    try {
      tokenData.addedTime = currentTimestamp();
      await dbProvider.saveToken(tokenData);
      showToast("success", "Token imported successfully");
    } catch (e) {
      console.error(e);
      showToast("error", "Failed to import token");
    } finally {
      closeDialog();
    }
  }

  return (
    <>
      <Button onClick={() => setShowDialog(true)}><i className="me-1 fa-solid fa-plus"/>Add Token</Button>

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showDialog} onHide={closeDialog} backdrop="static" keyboard={false} centered>
        <Modal.Header closeButton>
          <Modal.Title>Import Token</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <InputGroup>
            <Form.Control className="smaller" type="text" placeholder="Token ID / Hex..." autoFocus onChange={setToken}/>
            <InputGroup.Text as='button' onClick={searchToken}><i className="fa-solid fa-magnifying-glass"/></InputGroup.Text>
          </InputGroup>
          { loading && <div className="mt-2 center"><Spinner animation="border" size="sm"/> Searching...</div> }
          { errMsg && <div className="mt-2 bad center">{errMsg}</div> }
          { tokenData && <div className="mt-2 flex-center text-break"><img className="me-1" width={30} src={tokenData.iconUrl || dummy}/> {tokenData.name || tokenData.token} {tokenData.ticker} </div> }
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
          <Button disabled={!tokenData} onClick={importToken}>Import</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

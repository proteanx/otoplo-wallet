import { Alert, Button, FloatingLabel, Form, InputGroup, Modal, Spinner, Table } from "react-bootstrap";
import { NftEntity, TransactionEntity } from "../../models/db.entities";
import { WalletKeys } from "../../models/wallet.entities";
import { ChangeEvent, ReactNode, useState } from "react";
import Transaction from "nexcore-lib/types/lib/transaction/transaction";
import nexcore from "nexcore-lib";
import { currentTimestamp, isMobilePlatform, parseAmountWithDecimals } from "../../utils/common.utils";
import QRScanner, { mobileQrScan } from "../misc/QRScanner";
import { TxTokenType, isValidNexaAddress } from "../../utils/wallet.utils";
import { isPasswordValid } from "../../utils/seed.utils";
import { broadcastTransaction, buildAndSignTransferTransaction } from "../../utils/tx.utils";
import { dbProvider } from "../../app/App";

export default function NftSend({ nftEntity, keys }: { nftEntity: NftEntity, keys: WalletKeys }) {
  const [txMsg, setTxMsg] = useState<ReactNode>("");
  const [txErr, setTxErr] = useState<ReactNode>("");
  const [pwErr, setPwErr] = useState("");

  const [toAddress, setToAddress] = useState('');
  const [finalTx, setFinalTx] = useState<Transaction>(new nexcore.Transaction());
  const [pw, setPw] = useState('');

  const [showPw, setShowPw] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [spinner, setSpinner] = useState<ReactNode>("");
  const [txSpinner, setTxSpinner] = useState<ReactNode>("");

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const handleChangePw = (e: ChangeEvent<HTMLInputElement>) => {
    setPwErr("");
    setPw(e.target.value);
  };

  const closeConfirmDialog = () => {
    setPw("");
    setPwErr("");
    setTxSpinner("");
    setShowConfirmDialog(false);
  }

  const cancelSendDialog = () => {
    setTxErr("");
    setToAddress("");
    setFinalTx(new nexcore.Transaction());
    setTxMsg("");
    setShowSendDialog(false);
  }

  const handleChangeAddress = (e: ChangeEvent<HTMLInputElement>) => {
    setTxErr("");
    setToAddress(e.target.value);
  };

  const scanQR = async () => {
    if (isMobilePlatform()) {
      return await mobileQrScan(handleScan);
    }

    let devices = await navigator.mediaDevices.enumerateDevices();
    setDevices(devices.filter(d => d.kind == 'videoinput'));
    setShowScanDialog(true);
  }

  const handleScan = (data: string) => {
    if (data) {
      var uri = new URL(data);
      var address = uri.protocol + uri.pathname;

      setShowSendDialog(true);
      setShowScanDialog(false);
      setToAddress(address);
      if (!isValidNexaAddress(address)) {
        setTxErr("Invalid Address");
      }
    }
  }

  const scanError = (err: any) => {
    setToAddress("");
    setShowScanDialog(false);
    console.error(err);
  }

  const handleSend = async () => {
    try {
      setSpinner(<Spinner animation="border" size="sm"/>);
      let tx = await buildAndSignTransferTransaction(keys, toAddress, "1", false, nftEntity.token);
      setFinalTx(tx);
      setShowConfirmDialog(true);
    } catch (e) {
      if (e instanceof Error) {
        if (e.message.includes("errorMsg")) {
          let errMsg = JSON.parse(e.message);
          setTxErr(errMsg.errorMsg);      
        } else {
          setTxErr(e.message);
        }
      } else {
        setTxErr("Unable to fetch data. Please try again later and make sure the wallet is online.");
      }
    } finally {
      setSpinner("");
    }
  }

  const confirmSend = async () => {
    if (pw) {
      let decMn = await isPasswordValid(pw);
      if (decMn) {
        try {
          setTxSpinner(<Spinner animation="border" size="sm"/>);
          let res = await broadcastTransaction(finalTx.serialize());
          setTxMsg(<><div>Success. Tx ID:</div><div style={{wordBreak: "break-all"}}>{res}</div></>);
          let t: TransactionEntity = {
            txIdem: res,
            txId: finalTx.id,
            payTo: toAddress,
            value: "0",
            time: currentTimestamp(),
            height: 0,
            extraGroup: "",
            fee: finalTx.getFee(),
            group: nftEntity.token,
            state: 'outgoing',
            tokenAmount: "1",
            txGroupType: TxTokenType.TRANSFER,
          }
          dbProvider.addLocalTransaction(t);
          setToAddress("");
          setFinalTx(new nexcore.Transaction());
          closeConfirmDialog();
        } catch (e) {
          setPwErr("Failed to send transaction. " + (e instanceof Error ? e.message : "Make sure the wallet is online."));
        } finally {
          setTxSpinner("");
        }
      } else {
        setPwErr("Incorrect password.");
      }
    }
  }

  return (
    <>
      <Button className="mx-1" onClick={() => setShowSendDialog(true)}><i className="fa fa-upload"/> Send</Button>

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showSendDialog} onHide={cancelSendDialog} backdrop="static" keyboard={false} centered>
        <Modal.Header closeButton>
          <Modal.Title>Send NFT</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <InputGroup className="mb-2">
            <FloatingLabel controlId="floatingInput" label="To Address (must start with 'nexa:...')">
              <Form.Control disabled={spinner !== ""} type="text" placeholder='nexa:...' value={toAddress} onChange={handleChangeAddress}/>
            </FloatingLabel>
            <InputGroup.Text as='button' onClick={scanQR}><i className="fa-solid fa-camera-retro"/></InputGroup.Text>
          </InputGroup>
          <span className='bad'>
            {txErr}
          </span>
          <Alert show={txMsg !== ""} className='mt-2' variant="success">
            {txMsg}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelSendDialog}>Close</Button>
          <Button disabled={spinner !== ""} onClick={handleSend}>{spinner !== "" ? spinner : "Send"}</Button>
        </Modal.Footer>
      </Modal>

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showConfirmDialog} onHide={closeConfirmDialog} backdrop="static" keyboard={false} centered>
        <Modal.Header closeButton={true}>
          <Modal.Title>Confirmation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table>
            <tbody>
              <tr>
                <td>Send to:</td>
                <td style={{wordBreak: "break-all"}}>{toAddress}</td>
              </tr>
              <tr>
                <td>Fee:</td>
                <td>{parseAmountWithDecimals(finalTx.getFee(), 2)} NEXA</td>
              </tr>
            </tbody>
          </Table>
          <p>Enter your password</p>
          <InputGroup>
            <Form.Control type={!showPw ? "password" : "text"} value={pw} placeholder="Password" autoFocus onChange={handleChangePw}/>
            <InputGroup.Text className='cursor' onClick={() => setShowPw(!showPw)}>{!showPw ? <i className="fa fa-eye" aria-hidden="true"></i> : <i className="fa fa-eye-slash" aria-hidden="true"></i>}</InputGroup.Text>
          </InputGroup>
          <span className='bad'>
            {pwErr}
          </span>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeConfirmDialog}>Cancel</Button>
          <Button onClick={confirmSend}>{txSpinner !== "" ? txSpinner : "Confirm"}</Button>
        </Modal.Footer>
      </Modal>

      <QRScanner
        devices={devices} 
        showScanDialog={showScanDialog} 
        closeScanDialog={() => setShowScanDialog(false)} 
        handleScan={handleScan}
        scanError={scanError}
      />
    </>
  )
}

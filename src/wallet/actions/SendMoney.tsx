import { Alert, Button, FloatingLabel, Form, InputGroup, Modal, Spinner, Table } from "react-bootstrap";
import { Balance, WalletKeys } from "../../models/wallet.entities";
import { ChangeEvent, ReactElement, useState } from "react";
import Transaction from "nexcore-lib/types/lib/transaction/transaction";
import nexcore from "nexcore-lib";
import { currentTimestamp, getRawAmount, isMobilePlatform, isNullOrEmpty, parseAmountWithDecimals } from "../../utils/common.utils";
import { TxTokenType, isValidNexaAddress } from "../../utils/wallet.utils";
import { TokenEntity, TransactionEntity } from "../../models/db.entities";
import { broadcastTransaction, buildAndSignTransferTransaction } from "../../utils/tx.utils";
import { isPasswordValid } from "../../utils/seed.utils";
import { dbProvider } from "../../providers/db.provider";
import QRScanner, { mobileQrScan } from "../misc/QRScanner";

interface SendProps {
  balance: Balance;
  keys: WalletKeys;
  ticker: string;
  decimals: number;
  tokenEntity?: TokenEntity;
  tokenBalance?: Balance;
  isMobile?: boolean
}

export default function SendMoney({ balance, keys, ticker, decimals, tokenEntity, tokenBalance, isMobile }: SendProps) {
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const [spinner, setSpinner] = useState<ReactElement | string>("");
  const [txSpinner, setTxSpinner] = useState<ReactElement | string>("");

  const [txMsg, setTxMsg] = useState<ReactElement | string>("");
  const [txErr, setTxErr] = useState<ReactElement | string>("");
  const [pwErr, setPwErr] = useState("");

  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [sendRawAmount, setSendRawAmount] = useState('');
  const [feeFromAmount, setFeeFromAmount] = useState(false);
  const [finalTx, setFinalTx] = useState<Transaction>(new nexcore.Transaction());
  const [pw, setPw] = useState('');

  const amountRegx1 = decimals ? new RegExp(`^0\.[0-9]{1,${decimals}}$`) : /^[1-9][0-9]*$/;
  const amountRegx2 = decimals ? new RegExp(`^[1-9][0-9]*(\.[0-9]{1,${decimals}})?$`) : /^[1-9][0-9]*$/;

  const cancelSendDialog = () => {
    setTxErr("");
    setToAddress("");
    setAmount("");
    setSendRawAmount("");
    setFinalTx(new nexcore.Transaction());
    setTxMsg("");
    setFeeFromAmount(false);
    setShowSendDialog(false);
  }

  const closeConfirmDialog = () => {
    setPw("");
    setPwErr("");
    setTxSpinner("");
    setShowConfirmDialog(false);
  }

  const handleChangePw = (e: ChangeEvent<HTMLInputElement>) => {
    setPwErr("");
    setPw(e.target.value);
  };

  const handleChangeAddress = (e: ChangeEvent<HTMLInputElement>) => {
    setTxErr("");
    setToAddress(e.target.value);
  };

  const handleChangeAmount = (e: ChangeEvent<HTMLInputElement>) => {
    setTxErr("");
    if (e.target.value === '0' || amountRegx1.test(e.target.value) || amountRegx2.test(e.target.value)) {
      setAmount(e.target.value)
    } else if (isNullOrEmpty(e.target.value)) {
      setAmount('');
    }
  };

  const handleChangeFeeMode = (e: ChangeEvent<HTMLInputElement>) => {
    setTxErr("");
    setFeeFromAmount(e.target.checked);
  }

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
      var amount = uri.searchParams.get('amount');

      if (amount && (amountRegx1.test(amount) || amountRegx2.test(amount))){
        setAmount(amount);
      }
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
    setAmount("");
    setShowScanDialog(false);
    console.error(err);
  }

  const handleSend = async () => {
    try {
      if (!amountRegx1.test(amount) && !amountRegx2.test(amount)) {
        throw new Error("Invalid Amount.");
      }

      let rawAmount = getRawAmount(amount, decimals);
      let amt = BigInt(rawAmount);
      let totalBalance = BigInt(balance.confirmed) + BigInt(balance.unconfirmed);
      if (tokenEntity) {
        totalBalance = 0n;
        if (tokenBalance) {
          totalBalance = BigInt(tokenBalance.confirmed) + BigInt(tokenBalance.unconfirmed);
        }
      }

      if (amt > totalBalance) {
        throw new Error("Insufficient balance.");
      }

      setSpinner(<Spinner animation="border" size="sm"/>);
      let tx = await buildAndSignTransferTransaction(keys, toAddress, amt.toString(), feeFromAmount, tokenEntity?.token);

      setSendRawAmount(tokenEntity ? rawAmount : BigInt(tx.outputs[0].satoshis).toString());
      setFinalTx(tx);
      setShowConfirmDialog(true);
    } catch (e) {
      if (e instanceof Error) {
        if (e.message.includes("errorMsg")) {
          let errMsg = JSON.parse(e.message);
          if (tokenEntity) {
            setTxErr(errMsg.errorMsg);
          } else {
            let err = <><div>Insufficient balance ({parseAmountWithDecimals(BigInt(balance.confirmed) + BigInt(balance.unconfirmed), 2)} NEXA).</div>
                      <div>Amount: {errMsg.amount} NEXA, Fee: {errMsg.fee} NEXA.</div></>
            setTxErr(err);
          }          
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
            value: tokenEntity ? "0" : sendRawAmount,
            time: currentTimestamp(),
            height: 0,
            extraGroup: "",
            fee: finalTx.getFee(),
            group: tokenEntity?.token ?? "",
            state: 'outgoing',
            tokenAmount: tokenEntity ? sendRawAmount : "0",
            txGroupType: tokenEntity ? TxTokenType.TRANSFER : TxTokenType.NO_GROUP,
          }
          dbProvider.addLocalTransaction(t);
          setToAddress("");
          setAmount("");
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
      { isMobile ? (
        <div className='act-btn'>
          <Button onClick={() => setShowSendDialog(true)}><i className="fa fa-upload"/></Button>
          <br/>
          <span>Send</span>
        </div>
      ) : (
        <Button className='ms-2' onClick={() => setShowSendDialog(true)}><i className="fa fa-upload"/> Send</Button>
      )}

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showSendDialog} onHide={cancelSendDialog} backdrop="static" keyboard={false} centered>
        <Modal.Header closeButton>
          <Modal.Title>Send</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <InputGroup className="mb-3">
            <FloatingLabel controlId="floatingInput" label="To Address (must start with 'nexa:...')">
              <Form.Control disabled={spinner !== ""} type="text" placeholder='nexa:...' value={toAddress} onChange={handleChangeAddress}/>
            </FloatingLabel>
            <InputGroup.Text as='button' onClick={scanQR}><i className="fa-solid fa-camera-retro"/></InputGroup.Text>
          </InputGroup>
          <FloatingLabel  controlId="floatingInput" label="Amount" className="mb-2">
            <Form.Control disabled={spinner !== ""} type="number" step={'0.01'} min='0.00' placeholder='0' value={amount} onChange={handleChangeAmount}/>
          </FloatingLabel>
          { !tokenEntity && <Form.Switch label="Subtract fee from amount" disabled={spinner !== ""} onChange={handleChangeFeeMode}/> }
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
              { tokenEntity && 
                <tr>
                  <td>Token:</td>
                  <td style={{wordBreak: "break-all"}}>{tokenEntity.name ?? tokenEntity.token}</td>
                </tr>
              }
              <tr>
                <td>Pay to:</td>
                <td style={{wordBreak: "break-all"}}>{toAddress}</td>
              </tr>
              <tr>
                <td>Amount:</td>
                <td>{parseAmountWithDecimals(sendRawAmount, decimals)} {ticker}</td>
              </tr>
              <tr>
                <td>Fee:</td>
                <td>{parseAmountWithDecimals(finalTx.getFee(), 2)} NEXA</td>
              </tr>
              { !tokenEntity &&
                <tr>
                  <td>Total:</td>
                  <td>{parseAmountWithDecimals(BigInt(sendRawAmount) + BigInt(finalTx.getFee()), 2)} NEXA</td>
                </tr>
              }
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

import { ReactElement, useRef, useState } from 'react';
import Spinner from 'react-bootstrap/Spinner';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import { currentTimestamp, getRawAmount, isMobilePlatform, parseAmountWithDecimals } from '../../utils/common.utils';
import FloatingLabel from 'react-bootstrap/esm/FloatingLabel';
import bigDecimal from 'js-big-decimal';
import nexcore from 'nexcore-lib';
import Alert from 'react-bootstrap/Alert';
import { BarcodeFormat, BarcodeScanner, LensFacing } from '@capacitor-mlkit/barcode-scanning';
import { Dialog } from '@capacitor/dialog';
import { Container, Dropdown, Table } from 'react-bootstrap';
import { Balance, WalletKeys } from '../../models/wallet.entities';
import { TxTokenType, isValidNexaAddress } from '../../utils/wallet.utils';
import { isPasswordValid } from '../../utils/seed.utils';
import { dbProvider } from '../../providers/db.provider';
import { TransactionEntity } from '../../models/db.entities';
import Transaction from 'nexcore-lib/types/lib/transaction/transaction';
import { broadcastTransaction, buildAndSignTransferTransaction } from '../../utils/tx.utils';
import { QrScanner } from '@yudiel/react-qr-scanner';

export default function SendMoney({ balance, keys, isMobile }: { balance: Balance, keys: WalletKeys, isMobile?: boolean}) {
  const [scannedAddress, setScannedAddress] = useState("");
  const [scannedAmount, setScannedAmount] = useState("");
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showPwSeed, setShowPwSeed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [txErr, setTxErr] = useState<ReactElement | string>("");
  const [customFeeEnabled, setCustomFeeEnabled] = useState(false);
  const [spinner, setSpinner] = useState<ReactElement | string>("");
  const [finalTx, setFinalTx] = useState<Transaction>(new nexcore.Transaction());
  const [toAddress, setToAddress] = useState("");
  const [txSize, setTxSize] = useState(new bigDecimal(0));
  const [txAmount, setTxAmount] = useState(new bigDecimal(0));
  const [requiredFee, setRequiredFee] = useState(new bigDecimal(0));
  const [totalFee, setTotalFee] = useState(new bigDecimal(0));
  const [txMsg, setTxMsg] = useState<ReactElement | string>("");
  const [txSpinner, setTxSpinner] = useState<ReactElement | string>("");

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  const pwRef = useRef<HTMLInputElement>(null);
  const toAddressRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);;
  const feeFromAmount = useRef<HTMLInputElement>(null);
  const customFeeRef = useRef<HTMLInputElement>(null);

  const scanError = (err: any) => {
    setScannedAddress("");
    setScannedAmount("");
    setShowScanDialog(false);
    console.error(err);
  }

  const handleScan = (data: string) => {
    if (data) {
      var uri = new URL(data);
      var address = uri.protocol + uri.pathname;
      var amount = uri.searchParams.get('amount');

      if (amount){
        setScannedAmount(amount);
      }
      setShowSendDialog(true);
      setShowScanDialog(false);
      setScannedAddress(address);
      if (!isValidNexaAddress(address)) {
        setTxErr("Invalid Address");
      }
    }
  }

  const sendNexa = async () => {
    if (pwRef.current?.value) {
      let decMn = await isPasswordValid(pwRef.current.value);
      if (decMn) {
        try {
          setTxSpinner(<Spinner animation="border" size="sm"/>);
          let res = await broadcastTransaction(finalTx.serialize());
          setTxMsg(<><div>Success. Tx ID:</div><div style={{wordBreak: "break-all"}}>{res}</div></>);
          let t: TransactionEntity = {
            txIdem: res,
            txId: finalTx.id,
            payTo: toAddress,
            value: txAmount.getValue(),
            time: currentTimestamp(),
            height: 0,
            extraGroup: "",
            fee: finalTx.getFee(),
            group: "",
            state: 'outgoing',
            tokenAmount: "0",
            txGroupType: TxTokenType.NO_GROUP,
          }
          dbProvider.addLocalTransaction(t);
          toAddressRef.current!.value = "";
          amountRef.current!.value = "";
          setScannedAddress("");
          setScannedAmount("");
          setFinalTx(new nexcore.Transaction());
          closePasswordDialog();
        } catch (e: any) {
          setPwErr("Failed to send transaction. " + (e instanceof Error ? e.message : "Make sure the wallet is online."));
        } finally {
          setTxSpinner("");
        }
      } else {
        setPwErr("Incorrect password.");
      }
    }
  }

  const closePasswordDialog = () => {
    setPwErr("");
    setTxSpinner("");
    setShowPwSeed(false);
  }

  const showPasswordDialog = async () => {
    if (txErr === "" && toAddressRef.current?.value && amountRef.current?.value && (!customFeeEnabled || customFeeRef.current?.value)) {
      var refAmount = new bigDecimal(amountRef.current.value).multiply(new bigDecimal(100));
      if (refAmount.compareTo(new bigDecimal(nexcore.Transaction.DUST_AMOUNT)) < 0) {
        setTxErr("The amount is too small.");
        return;
      }
      if (refAmount.compareTo(new bigDecimal(nexcore.Transaction.MAX_MONEY)) >= 0) {
        setTxErr("the amount is too big.");
        return;
      }

      setSpinner(<Spinner animation="border" size="sm"/>);
      let sendAmount = getRawAmount(amountRef.current.value, 2);
      let subtractFromAmount = feeFromAmount.current?.checked;
      let manualFee = customFeeEnabled && customFeeRef.current?.value ? getRawAmount(customFeeRef.current.value, 2) : '';
      try {
        let tx = await buildAndSignTransferTransaction(keys, toAddressRef.current.value, sendAmount, manualFee, subtractFromAmount);
        setFinalTx(tx);
        setTxSize(new bigDecimal(tx._estimateSize()));
        setToAddress(toAddressRef.current.value);
        setTxAmount(new bigDecimal(sendAmount));
        setTotalFee(new bigDecimal(tx._getUnspentValue()));
        setRequiredFee(new bigDecimal(tx._estimateSize() * 3));
        setShowPwSeed(true);
      } catch (e) {
        if (e instanceof Error) {
          if (e.message.includes("errorMsg")) {
            let errMsg = JSON.parse(e.message);
            let err = <><div>Insufficient balance ({parseAmountWithDecimals(BigInt(balance.confirmed) + BigInt(balance.unconfirmed), 2)} NEXA).</div>
                      <div>Amount: {errMsg.amount} NEXA, Fee: {errMsg.fee} NEXA.</div></>
            setTxErr(err);
          } else {
            setTxErr(e.message)
          }
        } else {
          setTxErr("Unable to fetch data. Please try again later and make sure the wallet is online.");
        }
      } finally {
        setSpinner("");
      }
    }
  }

  const cancelSendDialog = () => {
    setTxErr("");
    setScannedAddress("");
    setScannedAmount("");
    setCustomFeeEnabled(false);
    setTotalFee(new bigDecimal(0));
    setRequiredFee(new bigDecimal(0));
    setFinalTx(new nexcore.Transaction());
    setTxMsg("");
    setShowSendDialog(false);
  }

  const switchFee = () => {
    setCustomFeeEnabled(!customFeeEnabled);
  }

  const checkAddress = () => {
    if (toAddressRef.current?.value) {
      setTxErr(isValidNexaAddress(toAddressRef.current.value) ? "" : "Invalid Address.");
    }
  }

  const formatAmount = () => {
    if (amountRef.current?.value) {
      if (amountRef.current.value.includes(".") && amountRef.current.value.split(".")[1].length > 2) {
        amountRef.current.value = parseFloat(amountRef.current.value).toFixed(2);
      } else if (amountRef.current.value.startsWith("-") || (amountRef.current.value !== "0" && amountRef.current.value.startsWith("0") && !amountRef.current.value.startsWith("0."))) {
        amountRef.current.value = amountRef.current.value.substring(1);
      }

      let total = new bigDecimal(0);
      if (customFeeEnabled && customFeeRef.current?.value) {
        total = new bigDecimal(amountRef.current.value).add(new bigDecimal(customFeeRef.current.value));
        total = total.multiply(new bigDecimal(100));
      } else {
        total = new bigDecimal(amountRef.current.value).multiply(new bigDecimal(100));
      }

      if (total.compareTo(new bigDecimal(balance.confirmed)) > 0) {
        setTxErr("Insufficient balance.");
      } else if (txErr !== "") {
        setTxErr("");
      } 
    }
  }

  const formatFee = () => {
    if (customFeeRef.current?.value) {
      if (customFeeRef.current.value.includes(".") && customFeeRef.current.value.split(".")[1].length > 2) {
        customFeeRef.current.value = parseFloat(customFeeRef.current.value).toFixed(2);
      } else if (customFeeRef.current.value.startsWith("-") || (customFeeRef.current.value !== "0" && customFeeRef.current.value.startsWith("0") && !customFeeRef.current.value.startsWith("0."))) {
        customFeeRef.current.value = customFeeRef.current.value.substring(1);
      }

      if (amountRef.current?.value && (!feeFromAmount.current || !feeFromAmount.current.checked)) {
        var total = new bigDecimal(amountRef.current.value).add(new bigDecimal(customFeeRef.current.value));
        total = total.multiply(new bigDecimal(100));
        if (total.compareTo(new bigDecimal(balance.confirmed)) > 0) {
          setTxErr("Insufficient balance.");
        } else if (txErr !== "") {
          setTxErr("");
        }
      } else {
        setTxErr("");
      }
    }
  }

  const scanQR = async () => {
    if (!isMobilePlatform()) {
      let devices = await navigator.mediaDevices.enumerateDevices();
      setDevices(devices.filter(d => d.kind == 'videoinput'));
      setShowScanDialog(true);
      return;
    }

    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== 'granted' && camera !== 'limited') {
      await Dialog.alert({ title: 'Permission denied', message: 'Please grant camera permission to use the barcode scanner.' });
      return;
    }

    document.querySelector('body')!.classList.add('barcode-scanning-active');
    document.getElementById('barcode-scanning-modal')!.classList.remove('barcode-scanning-modal-hidden');
    document.getElementById('barcode-scanning-modal')!.classList.add('barcode-scanning-modal');

    const squareElementBoundingClientRect = document.getElementById('barcode-square')!.getBoundingClientRect();
    const scaledRect = squareElementBoundingClientRect
      ? {
          left: squareElementBoundingClientRect.left * window.devicePixelRatio,
          right: squareElementBoundingClientRect.right * window.devicePixelRatio,
          top: squareElementBoundingClientRect.top * window.devicePixelRatio,
          bottom: squareElementBoundingClientRect.bottom * window.devicePixelRatio,
          width: squareElementBoundingClientRect.width * window.devicePixelRatio,
          height: squareElementBoundingClientRect.height * window.devicePixelRatio,
        }
      : undefined;
    const detectionCornerPoints = scaledRect
      ? [
          [scaledRect.left, scaledRect.top],
          [scaledRect.left + scaledRect.width, scaledRect.top],
          [scaledRect.left + scaledRect.width, scaledRect.top + scaledRect.height],
          [scaledRect.left, scaledRect.top + scaledRect.height],
        ]
      : undefined;

    const listener = await BarcodeScanner.addListener('barcodeScanned',
      async (result) => {
        const cornerPoints = result.barcode.cornerPoints;
        if (detectionCornerPoints && cornerPoints) {
          if (
            detectionCornerPoints[0][0] > cornerPoints[0][0] ||
            detectionCornerPoints[0][1] > cornerPoints[0][1] ||
            detectionCornerPoints[1][0] < cornerPoints[1][0] ||
            detectionCornerPoints[1][1] > cornerPoints[1][1] ||
            detectionCornerPoints[2][0] < cornerPoints[2][0] ||
            detectionCornerPoints[2][1] < cornerPoints[2][1] ||
            detectionCornerPoints[3][0] > cornerPoints[3][0] ||
            detectionCornerPoints[3][1] < cornerPoints[3][1]
          ) {
            return;
          }
        }

        closeScanner(result.barcode.rawValue);
      }
    );

    await BarcodeScanner.startScan({ formats: [BarcodeFormat.QrCode], lensFacing: LensFacing.Back });
  }

  const closeScanner = async (barcode: string) => {
    await BarcodeScanner.removeAllListeners();
    document.getElementById('barcode-scanning-modal')!.classList.remove('barcode-scanning-modal');
    document.getElementById('barcode-scanning-modal')!.classList.add('barcode-scanning-modal-hidden');
    document.querySelector('body')!.classList.remove('barcode-scanning-active');
    await BarcodeScanner.stopScan();
    handleScan(barcode);
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

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showSendDialog} onHide={cancelSendDialog} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton>
          <Modal.Title>Send Nexa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <InputGroup className="mb-3">
            <FloatingLabel controlId="floatingInput" label="To Address (must start with 'nexa:...')">
              <Form.Control disabled={spinner !== ""} type="text" placeholder='nexa:...' defaultValue={scannedAddress} ref={toAddressRef} onChange={checkAddress}/>
            </FloatingLabel>
            <InputGroup.Text as='button' onClick={scanQR}><i className="fa-solid fa-camera-retro"/></InputGroup.Text>
          </InputGroup>
          <FloatingLabel  controlId="floatingInput" label="Amount (NEXA)" className="mb-2">
            <Form.Control disabled={spinner !== ""} type="number" step={'0.01'} min='0.00' placeholder='0' defaultValue={scannedAmount} ref={amountRef} onChange={formatAmount}/>
          </FloatingLabel>
          <Form.Switch label="Use recommended fee rate (3 sats/B)" disabled={spinner !== ""} defaultChecked onChange={switchFee}/>
          {customFeeEnabled ? (
            <FloatingLabel controlId="floatingInput" label="Fee (NEXA)" className="mb-2">
              <Form.Control disabled={spinner !== ""} type="number" step={'0.01'} min='0.00' placeholder='0' ref={customFeeRef} onChange={formatFee}/>
            </FloatingLabel>
          ) : '' }
          <Form.Switch label="Subtract fee from amount" disabled={spinner !== ""} ref={feeFromAmount}/>
          <span className='bad'>
            {txErr}
          </span>
          <Alert show={txMsg !== ""} className='mt-2' variant="success">
            {txMsg}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelSendDialog}>Close</Button>
          <Button disabled={spinner !== ""} onClick={showPasswordDialog}>{spinner !== "" ? spinner : "Send"}</Button>
        </Modal.Footer>
      </Modal>

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showPwSeed} onHide={closePasswordDialog} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton={true}>
          <Modal.Title>Confirmation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table>
            <tbody>
              <tr>
                <td>Pay to:</td>
                <td style={{wordBreak: "break-all"}}>{toAddress}</td>
              </tr>
              <tr>
                <td>Amount:</td>
                <td>{parseAmountWithDecimals(txAmount.getValue(), 2)} NEXA</td>
              </tr>
              <tr>
                <td>Fee:</td>
                <td>
                  <div>{parseAmountWithDecimals(totalFee.getValue(), 2)} NEXA</div>
                  <div>(Recommended: {parseAmountWithDecimals(requiredFee.getValue(), 2)} NEXA, Size: {parseAmountWithDecimals(txSize.getValue(), 3)} kB)</div>
                </td>
              </tr>
              <tr>
                <td>Total:</td>
                <td>{parseAmountWithDecimals(txAmount.add(totalFee).getValue(), 2)} NEXA</td>
              </tr>
            </tbody>
          </Table>
          <p>Enter your password</p>
          <InputGroup>
            <Form.Control type={!showPw ? "password" : "text"} ref={pwRef} placeholder="Password" autoFocus/>
            <InputGroup.Text className='cursor' onClick={() => setShowPw(!showPw)}>{!showPw ? <i className="fa fa-eye" aria-hidden="true"></i> : <i className="fa fa-eye-slash" aria-hidden="true"></i>}</InputGroup.Text>
          </InputGroup>
          <span className='bad'>
            {pwErr}
          </span>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closePasswordDialog}>Cancel</Button>
          <Button onClick={sendNexa}>{txSpinner !== "" ? txSpinner : "Confirm"}</Button>
        </Modal.Footer>
      </Modal>

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' size='sm' show={showScanDialog} onHide={() => setShowScanDialog(false)} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton={true}>
          <Modal.Title>Scan QR</Modal.Title>
        </Modal.Header>
        <Modal.Body className='center'>
          <QrScanner containerStyle={{ width: 250, marginBottom: "5px" }} constraints={{ deviceId: selectedDevice, facingMode: 'environment' }} onError={scanError} onDecode={handleScan}/>
          <Dropdown className="d-inline mx-2" onSelect={eventKey => setSelectedDevice(eventKey ?? '')}>
            <Dropdown.Toggle id="dropdown-autoclose-true">
              Select Camera Device
            </Dropdown.Toggle>
            <Dropdown.Menu>
              { devices.map((d, i) => <Dropdown.Item key={i} eventKey={d.deviceId}>{d.label}</Dropdown.Item>) }
            </Dropdown.Menu>
          </Dropdown>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowScanDialog(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      <div id="barcode-scanning-modal" className="barcode-scanning-modal-hidden">
        <Button className='barcode-close' variant='secondary' onClick={() => closeScanner('')}><i className="fa-solid fa-xmark"/></Button>
        <Container>
          <div id="barcode-square"></div>
        </Container>
      </div>
    </>
  )
}

import React, { useRef, useState } from 'react';
import Spinner from 'react-bootstrap/Spinner';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import QrReader from 'react-qr-scanner';
import { broadcastTransaction, decryptMnemonic, isMnemonicValid, isMobilePlatform, isValidAddress } from '../utils/functions';
import FloatingLabel from 'react-bootstrap/esm/FloatingLabel';
import bigDecimal from 'js-big-decimal';
import { Transaction } from 'nexcore-lib';
import Table from 'react-bootstrap/esm/Table';
import Alert from 'react-bootstrap/Alert';
import { addLocalTransaction, getEncryptedSeed } from '../utils/localdb';
import { buildAndSignTx } from '../utils/walletUtils';
import { BarcodeFormat, BarcodeScanner, LensFacing } from '@capacitor-mlkit/barcode-scanning';
import { Dialog } from '@capacitor/dialog';
import { CloseButton, Container } from 'react-bootstrap';

export default function SendMoney({ balance, keys }) {
  const [scannedAddress, setScannedAddress] = useState("");
  const [scannedAmount, setScannedAmount] = useState("");
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showPwSeed, setShowPwSeed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [txErr, setTxErr] = useState("");
  const [customFeeEnabled, setCustomFeeEnabled] = useState(false);
  const [spinner, setSpinner] = useState("");
  const [finalTx, setFinalTx] = useState(new Transaction());
  const [toAddress, setToAddress] = useState("");
  const [txSize, setTxSize] = useState(new bigDecimal(0));
  const [txAmount, setTxAmount] = useState(new bigDecimal(0));
  const [totalAmount, setTotalAmount] = useState(new bigDecimal(0));
  const [requiredFee, setRequiredFee] = useState(new bigDecimal(0));
  const [totalFee, setTotalFee] = useState(new bigDecimal(0));
  const [txMsg, setTxMsg] = useState("");
  const [txSpinner, setTxSpinner] = useState("");

  const pwRef = useRef("");
  const toAddressRef = useRef("");
  const amountRef = useRef(0);
  const feeFromAmount = useRef("");
  const customFeeRef = useRef("");

  const scanError = (err) => {
    setScannedAddress("");
    setScannedAmount("");
    setShowScanDialog(false);
    console.error(err);
  }

  const handleScan = (data) => {
    if (data != null && data.text) {
      var uri = new URL(data.text);
      var address = uri.protocol + uri.pathname;
      var amount = uri.searchParams.get('amount');

      if (amount){
        setScannedAmount(amount);
      }
      setShowSendDialog(true);
      setShowScanDialog(false);
      setScannedAddress(address);
      if (!isValidAddress(address)) {
        setTxErr("Invalid Address");
      }
    }
  }

  const sendNexa = async () => {
    if (pwRef.current.value) {
      try {
        var encSeed = await getEncryptedSeed();
        var decMn = decryptMnemonic(encSeed, pwRef.current.value);
        if (decMn && isMnemonicValid(decMn)) {
          setTxSpinner(<Spinner animation="border" size="sm"/>);
          broadcastTransaction(finalTx.toString()).then(res => {
            setTxMsg(<><div>Success. Tx ID:</div><div style={{wordBreak: "break-all"}}>{res}</div></>);
            var t = {
              txIdem: res,
              confirmed: false,
              address: toAddress,
              value: totalAmount.negate().getValue(),
              time: Math.floor(Date.now() / 1000),
              height: 0
            }
            addLocalTransaction(t);
            toAddressRef.current.value = "";
            amountRef.current.value = "";
            setScannedAddress("");
            setScannedAmount("");
            setFinalTx(new Transaction());
            closePasswordDialog();
          }).catch(e => {
            setPwErr("Failed to send transaction. " + (!e.response ? "Make sure the wallet is online." : e.response.data));
          }).finally(() => {
            setTxSpinner("");
          })
        } else {
          setPwErr("Incorrect password.")
        }
      } catch {
        setPwErr("Incorrect password.")
      }
    }
  }

  const closePasswordDialog = () => {
    setPwErr("");
    setTxSpinner("");
    setShowPwSeed(false);
  }

  const showPasswordDialog = () => {
    if (txErr === "" && toAddressRef.current.value && amountRef.current.value && (!customFeeEnabled || customFeeRef.current.value)) {
      var refAmount = new bigDecimal(amountRef.current.value).multiply(new bigDecimal(100));
      if (refAmount.compareTo(new bigDecimal(Transaction.DUST_AMOUNT)) < 0) {
        setTxErr("The amount is too small.");
        return;
      }
      if (refAmount.compareTo(new bigDecimal(Transaction.MAX_MONEY)) >= 0) {
        setTxErr("the amount is too big.");
        return;
      }
      if (!isValidAddress(toAddressRef.current.value)) {
        setTxErr("Invalid address.");
        return;
      }

      setSpinner(<Spinner animation="border" size="sm"/>);
      calculateTx().then(t => {
        if (t.amount.compareTo(new bigDecimal(Transaction.DUST_AMOUNT)) < 0) {
          setTxErr("The transaction amount is too small to send after the fee has been deducted.");
          return;
        }
        
        var txFee = new bigDecimal(t.tx.getFee());
        var txTotal = t.amount.add(txFee);
        var total = t.amount.add(t.totalFee);
        if (total.compareTo(new bigDecimal(balance.confirmed)) > 0) {
          var err = <><div>Insufficient balance ({new bigDecimal(balance.confirmed).divide(new bigDecimal(100), 2).getPrettyValue()} NEX).</div>
                    <div>Amount: {t.amount.divide(new bigDecimal(100), 2).getPrettyValue()} NEX, Fee: {t.totalFee.divide(new bigDecimal(100), 2).getPrettyValue()} NEX.</div></>
          setTxErr(err);
        } else {
          setFinalTx(t.tx);
          setTxSize(new bigDecimal(t.tx.toBuffer().length));
          setToAddress(toAddressRef.current.value);
          setTxAmount(t.amount.divide(new bigDecimal(100), 2));
          setTotalAmount(txTotal.divide(new bigDecimal(100), 2));
          setTotalFee(txFee.divide(new bigDecimal(100), 2));
          setRequiredFee(t.requiredFee.divide(new bigDecimal(100), 2));
          setShowPwSeed(true);
        }
      }).catch(e => {
        console.log(e)
        if (e.response ) {
          setTxErr(e.response.data);
        } else {
          setTxErr("Unable to fetch data. Please try again later and make sure the wallet is online.");
        }
      }).finally(() => {
        setSpinner("");
      })
    }
  }

  const cancelSendDialog = () => {
    setTxErr("");
    setScannedAddress("");
    setScannedAmount("");
    setCustomFeeEnabled(false);
    setTotalAmount(new bigDecimal(0));
    setTotalFee(new bigDecimal(0));
    setRequiredFee(new bigDecimal(0));
    setFinalTx(new Transaction());
    setTxMsg("");
    setShowSendDialog(false);
  }

  const switchFee = () => {
    setCustomFeeEnabled(!customFeeEnabled);
  }

  const checkAddress = () => {
    if (toAddressRef.current.value) {
      setTxErr(isValidAddress(toAddressRef.current.value) ? "" : "Invalid Address.");
    }
  }

  const formatAmount = () => {
    if (amountRef.current.value) {
      if (amountRef.current.value.includes(".") && amountRef.current.value.split(".")[1].length > 2) {
        amountRef.current.value = parseFloat(amountRef.current.value).toFixed(2);
      } else if (amountRef.current.value.startsWith("-") || (amountRef.current.value !== "0" && amountRef.current.value.startsWith("0") && !amountRef.current.value.startsWith("0."))) {
        amountRef.current.value = amountRef.current.value.substring(1);
      }

      var total = 0;
      if (customFeeEnabled && customFeeRef.current.value) {
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
    if (customFeeRef.current.value) {
      if (customFeeRef.current.value.includes(".") && customFeeRef.current.value.split(".")[1].length > 2) {
        customFeeRef.current.value = parseFloat(customFeeRef.current.value).toFixed(2);
      } else if (customFeeRef.current.value.startsWith("-") || (customFeeRef.current.value !== "0" && customFeeRef.current.value.startsWith("0") && !customFeeRef.current.value.startsWith("0."))) {
        customFeeRef.current.value = customFeeRef.current.value.substring(1);
      }

      if (amountRef.current.value && (!feeFromAmount.current || !feeFromAmount.current.checked)) {
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

  const calculateTx = async () => {
    var sendAmount = new bigDecimal(amountRef.current.value).multiply(new bigDecimal(100));
    var subtractFromAmount = feeFromAmount.current && feeFromAmount.current.checked;
    var manualFee = customFeeEnabled && customFeeRef.current.value ? new bigDecimal(customFeeRef.current.value).multiply(new bigDecimal(100)).getValue() : "-1";
    
    return await buildAndSignTx(toAddressRef.current.value, sendAmount, keys, subtractFromAmount, manualFee);
  }

  const scanQR = async () => {
    if (!isMobilePlatform()) {
      setShowScanDialog(true);
      return;
    }

    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== 'granted' && camera !== 'limited') {
      await Dialog.alert({ title: 'Permission denied', message: 'Please grant camera permission to use the barcode scanner.' });
      return;
    }

    document.querySelector('body').classList.add('barcode-scanning-active');
    document.getElementById('barcode-scanning-modal').classList.remove('barcode-scanning-modal-hidden');
    document.getElementById('barcode-scanning-modal').classList.add('barcode-scanning-modal');

    const squareElementBoundingClientRect = document.getElementById('barcode-square').getBoundingClientRect();
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

  const closeScanner = async (barcode) => {
    await BarcodeScanner.removeAllListeners();
    document.getElementById('barcode-scanning-modal').classList.remove('barcode-scanning-modal');
    document.getElementById('barcode-scanning-modal').classList.add('barcode-scanning-modal-hidden');
    document.querySelector('body').classList.remove('barcode-scanning-active');
    await BarcodeScanner.stopScan();
    if (barcode) {
      handleScan({ text: barcode });
    }
  }

  return (
    <>
      <Button className='ms-2' onClick={() => setShowSendDialog(true)}>Send</Button>

      <Modal show={showSendDialog} onHide={cancelSendDialog} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton>
          <Modal.Title>Send Nexa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <InputGroup className="mb-3">
            <FloatingLabel controlId="floatingInput" label="To Address (must start with 'nexa:...')">
              <Form.Control disabled={spinner !== ""} type="text" placeholder='nexa:...' defaultValue={scannedAddress} ref={toAddressRef} onChange={checkAddress}/>
            </FloatingLabel>
            <InputGroup.Text as='Button' onClick={scanQR}><i className="fa-solid fa-camera-retro"/></InputGroup.Text>
          </InputGroup>
          <FloatingLabel  controlId="floatingInput" label="Amount (NEXA)" className="mb-2">
            <Form.Control disabled={spinner !== ""} type="number" step={'0.01'} min='0.00' placeholder='0' defaultValue={scannedAmount} ref={amountRef} onChange={formatAmount}/>
          </FloatingLabel>
          <Form.Switch label="Use minimum required fee (3 sats/B)" disabled={spinner !== ""} defaultChecked onChange={switchFee}/>
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

      <Modal show={showPwSeed} onHide={closePasswordDialog} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
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
                <td>{txAmount.getPrettyValue()} NEXA</td>
              </tr>
              <tr>
                <td>Fee:</td>
                <td>{totalFee.getPrettyValue()} NEXA (Required: {requiredFee.getPrettyValue()} NEXA, Size: {txSize.divide(new bigDecimal(1000), 3).getPrettyValue()} kB)</td>
              </tr>
              <tr>
                <td>Total:</td>
                <td>{totalAmount.getPrettyValue()} NEXA</td>
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

      <Modal size='sm' show={showScanDialog} onHide={() => setShowScanDialog(false)} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton={true}>
          <Modal.Title>Scan QR</Modal.Title>
        </Modal.Header>
        <Modal.Body className='center'>
          <QrReader style={{height: 200, width: 250}} constraints={{video: { facingMode: "environment" }}} onError={scanError} onScan={handleScan}/>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowScanDialog(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      <div id="barcode-scanning-modal" className="barcode-scanning-modal-hidden">
        <Button className='barcode-close' variant='secondary' onClick={closeScanner}><i className="fa-solid fa-xmark"/></Button>
        <Container>
          <div id="barcode-square"></div>
        </Container>
      </div>
    </>
  )
}

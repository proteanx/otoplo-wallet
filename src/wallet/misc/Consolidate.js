import React, { useRef, useState } from 'react';
import { consolidateUtxos } from '../../utils/walletUtils';
import { Alert, Button, Form, InputGroup, Modal, Spinner, Table } from 'react-bootstrap';
import bigDecimal from 'js-big-decimal';
import { broadcastTransaction, decryptMnemonic, isMnemonicValid } from '../../utils/functions';
import { addLocalTransaction, getEncryptedSeed } from '../../utils/localdb';
import { Transaction } from 'nexcore-lib';

export default function Consolidate({ nexKeys, balance }) {
  const [showError, setShowError] = useState(false);
  const [showPwSeed, setShowPwSeed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [txErr, setTxErr] = useState("");
  const [spinner, setSpinner] = useState("");
  const [txSpinner, setTxSpinner] = useState("");
  const [txMsg, setTxMsg] = useState("");

  const [finalTx, setFinalTx] = useState(new Transaction());
  const [toAddress, setToAddress] = useState("");
  const [totalAmount, setTotalAmount] = useState(new bigDecimal(0));
  const [totalFee, setTotalFee] = useState(new bigDecimal(0));

  const pwRef = useRef("");

  const closePasswordDialog = () => {
    setPwErr("");
    setTxSpinner("");
    setSpinner("");
    setTxErr("");
    setTxMsg("");
    setToAddress("");
    setFinalTx(new Transaction());
    setShowPwSeed(false);
  }

  const consolidate = () => {
    setSpinner(<Spinner animation="border" size="sm"/>);

    var toAddress = nexKeys.receiveKeys[nexKeys.receiveKeys.length - 1].address;

    consolidateUtxos(toAddress, nexKeys).then(res => {
      if (res.amount.compareTo(new bigDecimal(Transaction.DUST_AMOUNT)) < 0) {
        setTxErr("The transaction amount is too small to send after the fee has been deducted.");
        setShowError(true);
        return;
      }
      setToAddress(toAddress);
      setFinalTx(res.tx);
      setTotalAmount(res.amount.divide(new bigDecimal(100), 2));
      setTotalFee(res.totalFee.divide(new bigDecimal(100), 2));
      setShowPwSeed(true);
    }).catch(e => {
      console.log(e)
      setTxErr(e.response ? e.response.data : "Unable to fetch data. Please try again later and make sure the wallet is online.");
      setShowError(true);
    }).finally(() => {
      setSpinner("");
    })
  }

  const sendNexa = async () => {
    if (pwRef.current.value && toAddress) {
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
              address: "Payment to yourself",
              value: totalFee.negate().getValue(),
              time: Math.floor(Date.now() / 1000),
              height: 0
            }
            addLocalTransaction(t);
            setToAddress("");
            setFinalTx(new Transaction());
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

  var disabled = spinner !== "" || new bigDecimal(balance.confirmed).add(new bigDecimal(balance.unconfirmed)).compareTo(new bigDecimal(Transaction.DUST_AMOUNT)) < 0;

  return (
    <>
      <Button disabled={disabled} className='mx-2' onClick={consolidate}>{spinner !== "" ? spinner : "Consolidate"}</Button>

      <Modal show={showPwSeed} onHide={closePasswordDialog} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='mb-2'>
            <b>This will consolidate multiple transaction UTXOs of your NEXA balance by sending them back to your wallet as one UTXO.
               This will prevent any wallet errors when trying to use too many inputs in a transaction.</b>
          </div>
          <Table>
            <tbody>
              <tr>
                <td>Pay to (own):</td>
                <td style={{wordBreak: "break-all"}}>{toAddress}</td>
              </tr>
              <tr>
                <td>Amount:</td>
                <td>{totalAmount.getPrettyValue()} NEXA</td>
              </tr>
              <tr>
                <td>Fee:</td>
                <td>{totalFee.getPrettyValue()} NEXA (3 sat/Byte)</td>
              </tr>
              <tr>
                <td>Total:</td>
                <td>{totalAmount.add(totalFee).getPrettyValue()} NEXA</td>
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
          <Alert show={txMsg !== ""} className='mt-2' variant="success">
            {txMsg}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closePasswordDialog}>{ txMsg === "" ? "Cancel" : "Close" }</Button>
          {txMsg === "" && <Button onClick={sendNexa}>{txSpinner !== "" ? txSpinner : "Confirm"}</Button>}
        </Modal.Footer>
      </Modal>

      <Modal show={showError} onHide={() => setShowError(false)} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton={true}>
          <Modal.Title>Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <span className='bad'>
            {txErr}
          </span>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowError(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

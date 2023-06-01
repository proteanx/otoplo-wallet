import React, { useRef, useState } from 'react';
import Spinner from 'react-bootstrap/Spinner';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import { broadcastTransaction, decryptMnemonic, isMnemonicValid } from '../../utils/functions';
import bigDecimal from 'js-big-decimal';
import { Transaction } from 'nexcore-lib';
import Table from 'react-bootstrap/esm/Table';
import Alert from 'react-bootstrap/Alert';
import { consolidateUtxos } from '../../utils/walletUtils';
import { generateHodlConstraint, generateVisibleArgs, getHodlTemplate } from '../../utils/vaultUtils';
import { addLocalTransaction, getEncryptedSeed } from '../../utils/localdb';

export default function Claim({ eta, balance, vaultKey, vaultAddress, vaultInfo, nexKeys, refreshVaults }) {
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

  const claimVault = () => {
    setSpinner(<Spinner animation="border" size="sm"/>);

    var toAddress = nexKeys.receiveKeys[nexKeys.receiveKeys.length - 1].address;
    var vaultKeys = {receiveKeys: [{key: vaultKey, address: vaultAddress}], changeKeys: []};

    var templateData = {
      templateScript: getHodlTemplate(),
      constraintScript: generateHodlConstraint(vaultKey.publicKey),
      visibleArgs: generateVisibleArgs([vaultInfo.block, vaultInfo.index]),
      publicKey: vaultKey.publicKey,
    }

    consolidateUtxos(toAddress, vaultKeys, templateData).then(res => {
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
              address: toAddress,
              value: totalAmount.getValue(),
              time: Math.floor(Date.now() / 1000),
              height: 0
            }
            addLocalTransaction(t);
            setToAddress("");
            setFinalTx(new Transaction());
            refreshVaults();
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

  var disabled = spinner !== "" || eta || balance.confirmed.add(balance.unconfirmed).compareTo(new bigDecimal(Transaction.DUST_AMOUNT / 100)) < 0;

  return (
    <>
      <Button disabled={disabled} className='mx-2' onClick={claimVault}>{spinner !== "" ? spinner : "Claim"}</Button>
      
      <Modal show={showPwSeed} onHide={closePasswordDialog} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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

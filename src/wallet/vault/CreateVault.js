import React, { useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import InputGroup from 'react-bootstrap/InputGroup';
import Table from 'react-bootstrap/esm/Table';
import { generateHodlAddress, generateHodlKey, getHodlNextIndex, getVaultBlockAndIndex, saveHodlAddress } from '../../utils/vaultUtils';
import { addLocalTransaction, getEncryptedSeed } from '../../utils/localdb';
import bigDecimal from 'js-big-decimal';
import { broadcastTransaction, decryptMnemonic, isMnemonicValid, isValidAddress } from '../../utils/functions';
import { Transaction } from 'nexcore-lib';
import { buildAndSignTx } from '../../utils/walletUtils';

export default function CreateVault({ keys, balance, vaultAccountKey, heightVal, refreshVaults }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [byBlockHeight, setByBlockHeight] = useState(true);
  const [spinner, setSpinner] = useState("");
  const [showPwSeed, setShowPwSeed] = useState(false);

  const [finalTx, setFinalTx] = useState(new Transaction());
  const [toAddress, setToAddress] = useState("");
  const [totalAmount, setTotalAmount] = useState(new bigDecimal(0));
  const [totalFee, setTotalFee] = useState(new bigDecimal(0));

  const [createMsg, setCreateMsg] = useState("");
  const [createErr, setCreateErr] = useState("");
  const [estimateMsg, setEstimateMsg] = useState("");
  const [hodlBlock, setHodlBlock] = useState(0);

  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [txSpinner, setTxSpinner] = useState("");

  const blockHeightRef = useRef(0);
  const dateRef = useRef(0);
  const pwRef = useRef("");

  const closePasswordDialog = () => {
    setPwErr("");
    setTxSpinner("");
    setShowPwSeed(false);
  }

  const cancelCreateDialog = () => {
    setCreateMsg("");
    setCreateErr("");
    setHodlBlock(0);
    setEstimateMsg("");
    setSpinner("");
    setByBlockHeight(true);
    setShowCreateDialog(false);
    setTotalAmount(new bigDecimal(0));
    setTotalFee(new bigDecimal(0));
    setFinalTx(new Transaction());
    setToAddress("");
  }

  const changeCreateBy = () => {
    setByBlockHeight(!byBlockHeight);
    setHodlBlock(0);
    setEstimateMsg("");
    if (blockHeightRef.current) {
      blockHeightRef.current.value = '';
    }
    if (dateRef.current) {
      dateRef.current.value = '';
    }
  }

  const changeDate = () => {
    if (dateRef.current && heightVal > 0 && dateRef.current.valueAsNumber > Date.now()) {
      var estimateBlocks = (dateRef.current.valueAsNumber - Date.now()) / 1000 / 60 / 2;
      var block = parseInt(heightVal + estimateBlocks);
      setHodlBlock(block);
      setEstimateMsg("Estimate block: " + block);
    } else {
      setHodlBlock(0);
      setEstimateMsg("");
    }
  }

  const changeBlock = () => {
    if (blockHeightRef.current && heightVal > 0 && blockHeightRef.current.value > heightVal) {
      var block = Number(blockHeightRef.current.value);
      var estimateMins = (block - heightVal) * 2
      var time = new Date();
      time.setMinutes(time.getMinutes() + estimateMins);
      setHodlBlock(block);
      setEstimateMsg("Estimate date: " + time.toLocaleDateString());
    } else {
      setHodlBlock(0);
      setEstimateMsg("");
    }
  }

  const showPasswordDialog = async () => {
    if (nexBalance.compareTo(nexAmount) < 0) {
      setCreateErr("Insufficient balance.");
      return;
    }
    if (hodlBlock <= 0) {
      return;
    }

    var block = hodlBlock;
    var idx = await getHodlNextIndex();
    var key = generateHodlKey(vaultAccountKey, idx);
    var address = generateHodlAddress(key.publicKey, [block, idx]);

    if (!isValidAddress(address)) {
      setCreateErr("Invalid address.");
      return;
    }
    setSpinner(<Spinner animation="border" size="sm"/>);

    calculateTx(address).then(tx => {
      var txFee = new bigDecimal(tx.getFee()).divide(new bigDecimal(100), 2);
      var txTotal = nexAmount.add(txFee);
      if (txTotal.compareTo(nexBalance) > 0) {
        var err = <><div>Insufficient balance ({nexBalance.getPrettyValue()} NEXA).</div>
                  <div>Amount: {nexAmount.getPrettyValue()} NEXA, Fee: {txFee.getPrettyValue()} NEXA.</div></>
        setCreateErr(err);
      } else {
        setFinalTx(tx);
        setToAddress(address);
        setTotalAmount(txTotal);
        setTotalFee(txFee);
        setShowPwSeed(true);
      }
    }).catch(e => {
      console.log(e)
      setCreateErr(e.response ? e.response.data : "Unable to fetch data. Please try again later and make sure the wallet is online.");
    }).finally(() => {
      setSpinner("");
    })
  }

  const sendNexa = async () => {
    if (pwRef.current.value) {
      try {
        var encSeed = await getEncryptedSeed();
        var decMn = decryptMnemonic(encSeed, pwRef.current.value);
        if (decMn && isMnemonicValid(decMn)) {
          setTxSpinner(<Spinner animation="border" size="sm"/>);
          try {
            var res = await broadcastTransaction(finalTx.toString());
            var t = {
              txIdem: res,
              confirmed: false,
              address: toAddress,
              value: totalAmount.negate().getValue(),
              time: Math.floor(Date.now() / 1000),
              height: 0
            }
            addLocalTransaction(t);
            var idx = getVaultBlockAndIndex(toAddress).index;
            await saveHodlAddress(idx, toAddress);

            setCreateMsg(<>
              <div className='center mb-2'>
                <div className='mb-1'><b>Vault created successfully!</b></div>
                <div style={{wordBreak: 'break-all'}}><b>Address:</b> {toAddress}</div>
                <div><b>Locked until block:</b> {hodlBlock}</div>
                <div><b>Index:</b> {idx}</div>
                <div style={{wordBreak: 'break-all'}}><b>Tx ID:</b> {res}</div>
              </div>
            </>);

            refreshVaults();
            setHodlBlock(0);
            setEstimateMsg("");
            setToAddress("")
            closePasswordDialog();
          } catch (e) {
            setPwErr("Failed to send transaction. " + (!e.response ? "Make sure the wallet is online." : e.response.data));
          } finally {
            setTxSpinner("");
          }
        } else {
          setPwErr("Incorrect password.")
        }
      } catch {
        setPwErr("Incorrect password.")
      }
    }
  }

  const calculateTx = async (address) => {
    var t = await buildAndSignTx(address, nexAmount.multiply(new bigDecimal(100)), keys, false, "-1");
    return t.tx;
  }

  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate()+1);
  var tomorrowDate = tomorrow.getFullYear()+'-'+(tomorrow.getMonth()+1 < 10 ? '0' : '')+(tomorrow.getMonth()+1)+'-'+tomorrow.getDate();

  var nexBalance = new bigDecimal(balance.confirmed).add(new bigDecimal(balance.unconfirmed)).divide(new bigDecimal(100), 2);
  var nexAmount = new bigDecimal(20);

  return (
    <>
      <Button onClick={() => setShowCreateDialog(true)}>Create</Button>

      <Modal show={showCreateDialog} onHide={cancelCreateDialog} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Vault</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-2">
            To create a Vault, 20 NEXA (+fees) will be sent to the Vault.<br/>
            After creation you will see the 20 NEXA in the Vault address balance.<br/><br/>
            <b>Current balance:</b> {nexBalance.getPrettyValue()} NEXA
          </div>
          <div className="mb-2">
            <span className='me-3'><b>Lock Until:</b></span>
            <Form.Check inline label="Block Height" name="lockby" type="radio" id="inline-radio-height" defaultChecked onChange={changeCreateBy}/>
            <Form.Check inline label="Future Date" name="lockby" type="radio" id="inline-radio-date" onChange={changeCreateBy}/>
          </div>
          <div className='center pb-2' style={{width: '50%'}}>
            { (byBlockHeight && <Form.Control placeholder={'e.g. '+(heightVal+1)} type="number" step='1' min={heightVal+1} ref={blockHeightRef} onChange={changeBlock}/>)
              || 
              <Form.Control className='center' type="date" min={tomorrowDate} ref={dateRef} onChange={changeDate}/>
            }
            <div className="mt-2">
              {estimateMsg}
            </div>
          </div>
          <div className='bad'>
            {createErr}
          </div>
          <Alert show={createMsg !== ""} className='mt-2' variant="success">
            {createMsg}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cancelCreateDialog}>Close</Button>
          { createMsg === '' ? <Button disabled={spinner !== ""} onClick={showPasswordDialog}>{spinner !== "" ? spinner : "Create"}</Button> : ''}
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
                <td>New HODL Vault</td>
              </tr>
              <tr>
                <td>Locked until:</td>
                <td>Block {new bigDecimal(hodlBlock).getPrettyValue()}</td>
              </tr>
              <tr>
                <td>Amount:</td>
                <td>{nexAmount.getPrettyValue()} NEXA</td>
              </tr>
              <tr>
                <td>Fee:</td>
                <td>{totalFee.getPrettyValue()} NEXA (3 sat/Byte)</td>
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
    </>
  )
}

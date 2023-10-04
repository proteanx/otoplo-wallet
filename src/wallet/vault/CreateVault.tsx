import { ReactElement, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import InputGroup from 'react-bootstrap/InputGroup';
import Table from 'react-bootstrap/esm/Table';
import bigDecimal from 'js-big-decimal';
import { currentTimestamp, getRawAmount, parseAmountWithDecimals } from '../../utils/common.utils';
import { Balance, WalletKeys } from '../../models/wallet.entities';
import HDPrivateKey from 'nexcore-lib/types/lib/hdprivatekey';
import nexcore from 'nexcore-lib';
import { generateHodlAddress, generateHodlKey, getHodlNextIndex, getVaultBlockAndIndex, saveHodlAddress } from '../../utils/vault.utils';
import { TxTokenType } from '../../utils/wallet.utils';
import { isPasswordValid } from '../../utils/seed.utils';
import { dbProvider } from '../../providers/db.provider';
import { TransactionEntity } from '../../models/db.entities';
import { broadcastTransaction, buildAndSignTransferTransaction } from '../../utils/tx.utils';

interface CreateVaultProps {
  keys: WalletKeys;
  balance: Balance;
  vaultAccountKey: HDPrivateKey;
  heightVal: number;
  refreshVaults: () => Promise<void>;
}

export default function CreateVault({ keys, balance, vaultAccountKey, heightVal, refreshVaults }: CreateVaultProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [byBlockHeight, setByBlockHeight] = useState(true);
  const [spinner, setSpinner] = useState<ReactElement | string>("");
  const [showPwSeed, setShowPwSeed] = useState(false);

  const [finalTx, setFinalTx] = useState(new nexcore.Transaction());
  const [toAddress, setToAddress] = useState("");
  const [totalFee, setTotalFee] = useState(0);

  const [createMsg, setCreateMsg] = useState<ReactElement | string>("");
  const [createErr, setCreateErr] = useState<ReactElement | string>("");
  const [estimateMsg, setEstimateMsg] = useState("");
  const [hodlBlock, setHodlBlock] = useState(0);

  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [txSpinner, setTxSpinner] = useState<ReactElement | string>("");

  const blockHeightRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const pwRef = useRef<HTMLInputElement>(null);

  let nexBalance = new bigDecimal(balance.confirmed).add(new bigDecimal(balance.unconfirmed)).divide(new bigDecimal(100), 2);
  let nexAmount = 20;

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
    setTotalFee(0);
    setFinalTx(new nexcore.Transaction());
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
      console.log(dateRef.current.valueAsNumber)
      let estimateBlocks = Math.ceil((dateRef.current.valueAsNumber - Date.now()) / 1000 / 60 / 2);
      var block = heightVal + estimateBlocks;
      setHodlBlock(block);
      setEstimateMsg("Estimate block: " + block);
    } else {
      setHodlBlock(0);
      setEstimateMsg("");
    }
  }

  const changeBlock = () => {
    if (blockHeightRef.current && heightVal > 0 && blockHeightRef.current.valueAsNumber > heightVal) {
      var block = parseInt(blockHeightRef.current.value);
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
    if (nexBalance.compareTo(new bigDecimal(nexAmount)) < 0) {
      setCreateErr("Insufficient balance.");
      return;
    }
    if (hodlBlock <= 0) {
      return;
    }

    let block = hodlBlock;
    let idx = await getHodlNextIndex();
    let key = generateHodlKey(vaultAccountKey, idx);
    let address = generateHodlAddress(key.getPublicKey(), [block, idx]) ?? '';

    setSpinner(<Spinner animation="border" size="sm"/>);
    try {
      let tx = await buildAndSignTransferTransaction(keys, address, getRawAmount(nexAmount, 2));
      console.log(tx.serialize())
      setFinalTx(tx);
      setToAddress(address);
      setTotalFee(tx.getFee());
      setShowPwSeed(true);
    } catch (e) {
      console.log(e);
      setCreateErr(e instanceof Error ? e.message : "Unable to fetch data. Please try again later and make sure the wallet is online.");
    } finally {
      setSpinner("");
    }
  }

  const sendNexa = async () => {
    if (pwRef.current?.value) {
      let decMn = await isPasswordValid(pwRef.current.value);
      if  (decMn) {
        setTxSpinner(<Spinner animation="border" size="sm"/>);
        try {
          var res = await broadcastTransaction(finalTx.serialize());
          var t: TransactionEntity = {
            txIdem: res,
            txId: finalTx.id,
            payTo: toAddress,
            value: nexAmount.toString(),
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

  let tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate()+1);
  let tomorrowDate = tomorrow.getFullYear()+'-'+(tomorrow.getMonth()+1 < 10 ? '0' : '')+(tomorrow.getMonth()+1)+'-'+tomorrow.getDate();

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
                <td>{nexAmount.toString()} NEXA</td>
              </tr>
              <tr>
                <td>Fee:</td>
                <td>{parseAmountWithDecimals(totalFee, 2)} NEXA (3 sat/Byte)</td>
              </tr>
              <tr>
                <td>Total:</td>
                <td>{parseAmountWithDecimals((nexAmount*100) + totalFee, 2)} NEXA</td>
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

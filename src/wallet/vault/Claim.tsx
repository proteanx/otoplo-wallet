import { ReactElement, useRef, useState } from 'react';
import Spinner from 'react-bootstrap/Spinner';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import { currentTimestamp, parseAmountWithDecimals } from '../../utils/functions';
import bigDecimal from 'js-big-decimal';
import Table from 'react-bootstrap/esm/Table';
import Alert from 'react-bootstrap/Alert';
import { Balance, WalletKeys } from '../../models/wallet.entities';
import HDPrivateKey from 'nexcore-lib/types/lib/hdprivatekey';
import { generateHodlConstraint, generateVisibleArgs, getHodlTemplate } from '../../utils/vault.utils';
import { isPasswordValid } from '../../utils/seed.utils';
import { TxTokenType } from '../../utils/wallet.utils';
import { dbProvider } from '../../providers/db.provider';
import { TransactionEntity } from '../../models/db.entities';
import nexcore from 'nexcore-lib';
import { TxTemplateData, broadcastTransaction, buildAndSignConsolidateTransaction } from '../../utils/tx.utils';

interface ClaimProps {
  eta: string;
  balance: Balance;
  vaultKey: HDPrivateKey;
  vaultAddress: string;
  vaultInfo: { block: number, index: number };
  nexKeys: WalletKeys;
  refreshVaults: () => Promise<void>;
}

export default function Claim({ eta, balance, vaultKey, vaultAddress, vaultInfo, nexKeys, refreshVaults }: ClaimProps) {
  const [showError, setShowError] = useState(false);
  const [showPwSeed, setShowPwSeed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [txErr, setTxErr] = useState("");
  const [spinner, setSpinner] = useState<ReactElement | string>("");
  const [txSpinner, setTxSpinner] = useState<ReactElement | string>("");
  const [txMsg, setTxMsg] = useState<ReactElement | string>("");

  const [finalTx, setFinalTx] = useState(new nexcore.Transaction());
  const [toAddress, setToAddress] = useState("");
  const [totalAmount, setTotalAmount] = useState(new bigDecimal(0));
  const [totalFee, setTotalFee] = useState(new bigDecimal(0));

  const pwRef = useRef<HTMLInputElement>(null);

  const closePasswordDialog = () => {
    setPwErr("");
    setTxSpinner("");
    setSpinner("");
    setTxErr("");
    setTxMsg("");
    setToAddress("");
    setFinalTx(new nexcore.Transaction());
    setShowPwSeed(false);
  }

  const claimVault = async () => {
    setSpinner(<Spinner animation="border" size="sm"/>);

    let toAddress = nexKeys.receiveKeys[nexKeys.receiveKeys.length - 1].address;
    let vaultKeys = {receiveKeys: [{key: vaultKey, address: vaultAddress}], changeKeys: []};

    let templateData: TxTemplateData = {
      templateScript: getHodlTemplate(),
      constraintScript: generateHodlConstraint(vaultKey.getPublicKey()),
      visibleArgs: generateVisibleArgs([vaultInfo.block, vaultInfo.index]),
      publicKey: vaultKey.getPublicKey(),
    }

    try {
      let tx = await buildAndSignConsolidateTransaction(vaultKeys, toAddress, templateData);
      if (!tx.getChangeOutput()) {
        throw new Error("The transaction amount is too small to send after the fee has been deducted.");
      }
      setToAddress(toAddress);
      setFinalTx(tx);
      setTotalAmount(new bigDecimal(tx.outputAmount));
      setTotalFee(new bigDecimal(tx.getFee()));
      setShowPwSeed(true);
    } catch (e) {
      setTxErr(e instanceof Error ? e.message : "Unable to fetch data. Please try again later and make sure the wallet is online.");
      setShowError(true);
    } finally {
      setSpinner("");
    }
  }

  const sendNexa = async () => {
    if (pwRef.current?.value && toAddress) {
      let decMn = await isPasswordValid(pwRef.current.value);
      if (decMn) {
        setTxSpinner(<Spinner animation="border" size="sm"/>);
        try {
          let res = await broadcastTransaction(finalTx.serialize());
          setTxMsg(<><div>Success. Tx ID:</div><div style={{wordBreak: "break-all"}}>{res}</div></>);
            var t: TransactionEntity = {
              txIdem: res,
              txId: finalTx.id,
              payTo: toAddress,
              value: totalAmount.getValue(),
              time: currentTimestamp(),
              height: 0,
              extraGroup: "",
              fee: finalTx.getFee(),
              group: "",
              state: 'incoming',
              tokenAmount: "0",
              txGroupType: TxTokenType.NO_GROUP,
            }
            dbProvider.addLocalTransaction(t);
            setFinalTx(new nexcore.Transaction());
            refreshVaults();
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

  let disabled = spinner !== "" || eta !== "" || (BigInt(balance.confirmed) + BigInt(balance.unconfirmed) < BigInt(nexcore.Transaction.DUST_AMOUNT));

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
                <td>{parseAmountWithDecimals(totalAmount.getValue(), 2)} NEXA</td>
              </tr>
              <tr>
                <td>Fee:</td>
                <td>{parseAmountWithDecimals(totalFee.getValue(), 2)} NEXA (3 sat/Byte)</td>
              </tr>
              <tr>
                <td>Total:</td>
                <td>{parseAmountWithDecimals(totalAmount.add(totalFee).getValue(), 2)} NEXA</td>
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

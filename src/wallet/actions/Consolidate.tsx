import { ReactElement, useRef, useState } from 'react';
import { Alert, Button, Form, InputGroup, Modal, Spinner, Table } from 'react-bootstrap';
import bigDecimal from 'js-big-decimal';
import { currentTimestamp, parseAmountWithDecimals } from '../../utils/common.utils';
import { Balance, WalletKeys } from '../../models/wallet.entities';
import nexcore from 'nexcore-lib';
import { isPasswordValid } from '../../utils/seed.utils';
import { dbProvider } from "../../app/App";
import { TxTokenType } from '../../utils/wallet.utils';
import { TransactionEntity } from '../../models/db.entities';
import { broadcastTransaction, buildAndSignConsolidateTransaction } from '../../utils/tx.utils';
import { useAppDispatch } from '../../store/hooks';
import { fetchBalance } from '../../store/slices/wallet.slice';

export default function Consolidate({ nexKeys, balance, isMobile }: { nexKeys: WalletKeys, balance: Balance, isMobile?: boolean }) {
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

  const dispatch = useAppDispatch();

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

  const consolidate = async () => {
    setSpinner(<Spinner animation="border" size="sm"/>);
    let toAddress = nexKeys.receiveKeys.at(-1)!.address;

    try {
      let tx = await buildAndSignConsolidateTransaction(nexKeys);
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
          let t: TransactionEntity = {
            txIdem: res,
            txId: finalTx.id,
            payTo: "Payment to yourself",
            value: "0",
            time: currentTimestamp(),
            height: 0,
            extraGroup: "",
            fee: finalTx.getFee(),
            token: "",
            state: 'both',
            tokenAmount: "0",
            txGroupType: TxTokenType.NO_GROUP,
          }
          dbProvider.addLocalTransaction(t);
          dispatch(fetchBalance(true));
          setToAddress("");
          setFinalTx(new nexcore.Transaction());
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

  let disabled = spinner !== "" || new bigDecimal(balance.confirmed).add(new bigDecimal(balance.unconfirmed)).compareTo(new bigDecimal(nexcore.Transaction.DUST_AMOUNT)) < 0;

  return (
    <>
      { isMobile ? (
        <div className='act-btn'>
          <Button disabled={disabled} onClick={consolidate}>{spinner !== "" ? spinner : <i className="fa fa-repeat"/>}</Button>
          <br/>
          <span>Consolidate</span>
        </div>
      ) : (
        <Button disabled={disabled} className='mx-2'  onClick={consolidate}>{spinner !== "" ? spinner : <><i className="fa fa-repeat"/> Consolidate</>}</Button>
      )}

      <Modal contentClassName="text-bg-dark" data-bs-theme='dark' show={showPwSeed} onHide={closePasswordDialog} backdrop="static" keyboard={false} centered>
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

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showError} onHide={() => setShowError(false)} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
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

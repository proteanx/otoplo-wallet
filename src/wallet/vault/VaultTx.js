import React, { useEffect, useState } from 'react';
import { Button, Card, Spinner, Table } from 'react-bootstrap';
import TxRecord from '../../tx/TxRecord';
import { Script } from 'nexcore-lib';
import { checkBalanceAndTransactions } from '../../utils/functions';

export default function VaultTx({ heightVal, closeTx, vaultAddress }) {
  const [spinner, setSpinner] = useState(<Spinner animation="border" size="sm"/>);
  const [transactions, setTransactions] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    var addr = {address: vaultAddress, hex: Script.fromAddress(vaultAddress).toHex()};

    checkBalanceAndTransactions([addr], [], 0).then(res => {
      var txs = res.transactions.txs;
      txs.sort((a, b) => b.time - a.time);
      setTransactions(txs);
    }).catch(e => {
      console.log(e);
      setErr("Unable to fetch transactions. Make sure the wallet is online.");
    }).finally(() => {
      setSpinner("");
    });  
  }, []);
  
  return (
    <>
      <Button className='mt-3' variant='outline-primary' onClick={closeTx}><i className="me-1 fa-solid fa-circle-arrow-left"></i> Back to Vault</Button>

      <Card className='mt-3 text-white' bg="custom-card">
        <Card.Body>
          <Card.Title className='center'>Transactions ({transactions.length})</Card.Title>
          <hr/>
          { spinner !== "" ? (
            <div className='center'>{spinner} Loading...</div>
          ) : err === "" ? (
            <Table borderless responsive striped className='text-white'>
              <tbody>
                { transactions?.map((tx, i) => <TxRecord key={i} record={tx} height={heightVal}/>) }
              </tbody>
            </Table>
          ) : ( 
            <div className='center'>{err}</div>
          )}
          
        </Card.Body>
      </Card>
    </>
  )
}

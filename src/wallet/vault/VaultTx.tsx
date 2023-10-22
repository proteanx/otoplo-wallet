import { ReactElement, useEffect, useState } from 'react';
import { Button, Card, Spinner, Table } from 'react-bootstrap';
import TxRecord from '../tx/TxRecord';
import { fetchVaultTransactions } from '../../utils/vault.utils';
import { TransactionEntity } from '../../models/db.entities';

interface VaultTxProps {
  heightVal: number;
  closeTx: () => void;
  vaultAddress: string;
}

export default function VaultTx({ heightVal, closeTx, vaultAddress }: VaultTxProps) {
  const [spinner, setSpinner] = useState<ReactElement | string>(<Spinner animation="border" size="sm"/>);
  const [transactions, setTransactions] = useState<TransactionEntity[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetchVaultTransactions(vaultAddress).then(res => {
      res.sort((a, b) => b.time - a.time);
      setTransactions(res);
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
            <Table borderless responsive className='text-white' variant='dark'>
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

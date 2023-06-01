import React, { useEffect, useState } from 'react';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import CreateVault from './CreateVault';
import { getHodlVaults, getVaultBlockAndIndex } from '../../utils/vaultUtils';
import { checkBalances } from '../../utils/functions';
import VaultEntry from './VaultEntry';
import RecoverVault from './RecoverVault';
import { getVaultLastCheck, removeLock, setLock, setVaultLastCheck, updateLocalVaultBalance } from '../../utils/localdb';
import Archive from './Archive';
import VaultTx from './VaultTx';
import { Clipboard } from '@capacitor/clipboard';

export default function Vault({ heightVal, price, balance, keys, vaultAccountKey }) {
  const [tmpVal, setTmpVal] = useState(0);
  const [vaults, setVaults] = useState([]);
  const [archive, setArchive] = useState(false);
  const [showTx, setShowTx] = useState(false);
  const [vaultTx, setVaultTx] = useState("");

  useEffect(() => {
    getHodlVaults().then(res => {
      var vals = res.map(v => ({address: v.address, balance: {confirmed: v.confirmed, unconfirmed: v.unconfirmed}}));
      setVaults(vals);
    })

    var lastChecked = getVaultLastCheck();
    if (lastChecked == null || parseInt(lastChecked) < (Math.floor(Date.now() / 1000) - 90)) {
      refreshVaults();
    }

    const myInterval = setInterval(() => {
      setTmpVal((prevVal) => prevVal + 1);
    }, 30 * 1000);

    return () => clearInterval(myInterval);
  }, []);

  useEffect(() => {
    if (tmpVal !== 0) {
      refreshVaults();
    }
  }, [tmpVal]);

  const refreshVaults = async () => {
    var hodls = await getHodlVaults();
    if (!hodls || hodls.length === 0) {
      setVaults([]);
      return;
    }

    if (setLock('refresh-vaults')) {
      hodls.sort((a, b) => {
        var aInfo = getVaultBlockAndIndex(a.address);
        var bInfo = getVaultBlockAndIndex(b.address);
        return aInfo.block - bInfo.block;
      });

      var addresses = hodls.map(h => h.address);
      try {
        var res = await checkBalances(addresses);
        for (const v of res) {
          var oldConfirmed = hodls.find(h => h.address === v.address).confirmed;
          var oldUnconfirmed =  hodls.find(h => h.address === v.address).unconfirmed;
          if (v.balance.confirmed !== oldConfirmed || v.balance.unconfirmed !== oldUnconfirmed) {
            await updateLocalVaultBalance(v.address, v.balance);
          }
        }
        setVaultLastCheck();
        setVaults(res);
      } catch (e) {
        console.log(e);
      } finally {
        removeLock("refresh-vaults");
      }
    }
  }

  const copy = async (value, elemId) => {
    await Clipboard.write({ string: value });
    document.getElementById(elemId).classList.remove("hidden");
    setTimeout(() => {
      document.getElementById(elemId).classList.add("hidden");
    }, 1000)
  }

  const openTx = (address) => {
    setVaultTx(address);
    setShowTx(true);
  }

  const closeTx = () => {
    setVaultTx("");
    setShowTx(false);
  }

  if (archive) {
    return (
      <Archive setArchive={setArchive} refreshVaults={refreshVaults}/>
    )
  }

  if (showTx) {
    return (
      <VaultTx heightVal={heightVal} closeTx={closeTx} vaultAddress={vaultTx}/>
    )
  }
  
  return (
    <>
      <Card bg="custom-card" className='text-white mt-3'>
        <Card.Body>
          <Row>
            <Col className='center'>
              <Card.Title>HODL Vault</Card.Title>
              <hr/>
              <div className="my-3">
                Overcome your own weak hands by using the HODL Vault. Keep your funds safe...even from yourself.<br/>
                Simply set the amount of time you want to lock your funds for and they'll stay safe and locked ready for the future.
              </div>
              <Button variant='outline-primary' onClick={() => setArchive(true)}>Archive</Button>
              <RecoverVault keys={keys} vaultAccountKey={vaultAccountKey} refreshVaults={refreshVaults}/>
              <CreateVault keys={keys} balance={balance} vaultAccountKey={vaultAccountKey} heightVal={heightVal} refreshVaults={refreshVaults}/>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      <div className="my-1 pt-3 center text-white">
        <Card.Title>My Vaults</Card.Title>
      </div>
      { vaults?.map((hv, i) => <VaultEntry key={i} keys={keys} entry={i} copy={copy} heightVal={heightVal} price={price} vault={hv} vaultAccountKey={vaultAccountKey} refreshVaults={refreshVaults} openTx={openTx}/>) }
    </>
  )
}

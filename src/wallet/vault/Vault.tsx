import { useEffect, useState } from 'react';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import CreateVault from './CreateVault';
import { currentTimestamp, isNullOrEmpty } from '../../utils/common.utils';
import VaultEntry from './VaultEntry';
import RecoverVault from './RecoverVault';
import Archive from './Archive';
import VaultTx from './VaultTx';
import { Clipboard } from '@capacitor/clipboard';
import { Balance } from '../../models/wallet.entities';
import HDPrivateKey from 'nexcore-lib/types/lib/hdprivatekey';
import { fetchAllVaultsBalances, getHodlVaults, getVaultBlockAndIndex } from '../../utils/vault.utils';
import StorageProvider from '../../providers/storage.provider';
import { dbProvider } from '../../providers/db.provider';
import { useAppSelector } from '../../store/hooks';
import { walletState } from '../../store/slices/wallet.slice';

export interface VaultInfo {
  address: string;
  balance: Balance;
}

export default function Vault({ vaultAccountKey }: { vaultAccountKey: HDPrivateKey }) {
  const [tmpVal, setTmpVal] = useState(0);
  const [vaults, setVaults] = useState<VaultInfo[]>([]);
  const [archive, setArchive] = useState(false);
  const [showTx, setShowTx] = useState(false);
  const [vaultTx, setVaultTx] = useState("");

  const wallet = useAppSelector(walletState);

  useEffect(() => {
    getHodlVaults().then(res => {
      let vals = res?.map(v => ({address: v.address, balance: {confirmed: v.confirmed, unconfirmed: v.unconfirmed}}));
      if (vals) {
        setVaults(vals);
      }
    })

    var lastChecked = StorageProvider.getVaultLastCheck();
    if (lastChecked == null || parseInt(lastChecked) < (currentTimestamp() - 90)) {
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
    let hodls = await getHodlVaults();
    if (isNullOrEmpty(hodls)) {
      setVaults([]);
      return;
    }

    if (StorageProvider.setLock(StorageProvider.VAULT_REFRESH_LOCK)) {
      hodls!.sort((a, b) => {
        let aInfo = getVaultBlockAndIndex(a.address);
        let bInfo = getVaultBlockAndIndex(b.address);
        return aInfo.block - bInfo.block;
      });

      let addresses = hodls!.map(h => h.address);
      try {
        let res = await fetchAllVaultsBalances(addresses);
        for (const v of res) {
          let oldConfirmed = hodls!.find(h => h.address === v.address)!.confirmed;
          let oldUnconfirmed =  hodls!.find(h => h.address === v.address)!.unconfirmed;
          if (v.balance.confirmed !== oldConfirmed || v.balance.unconfirmed !== oldUnconfirmed) {
            await dbProvider.updateLocalVaultBalance(v.address, v.balance);
          }
        }
        StorageProvider.setVaultLastCheck();
        setVaults(res);
      } catch (e) {
        console.log(e);
      } finally {
        StorageProvider.removeLock(StorageProvider.VAULT_REFRESH_LOCK);
      }
    }
  }

  const copy = async (value: string, elemId: string) => {
    await Clipboard.write({ string: value });
    document.getElementById(elemId)!.classList.remove("hidden");
    setTimeout(() => {
      document.getElementById(elemId)!.classList.add("hidden");
    }, 1000);
  }

  const openTx = (address: string) => {
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
      <VaultTx heightVal={wallet.height} closeTx={closeTx} vaultAddress={vaultTx}/>
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
              <RecoverVault keys={wallet.keys} vaultAccountKey={vaultAccountKey} refreshVaults={refreshVaults}/>
              <CreateVault keys={wallet.keys} balance={wallet.balance} vaultAccountKey={vaultAccountKey} heightVal={wallet.height} refreshVaults={refreshVaults}/>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      <div className="my-1 pt-3 center text-white">
        <Card.Title>My Vaults</Card.Title>
      </div>
      { vaults?.map((hv, i) => <VaultEntry key={i} keys={wallet.keys} entry={i} copy={copy} heightVal={wallet.height} price={wallet.price} vault={hv} vaultAccountKey={vaultAccountKey} refreshVaults={refreshVaults} openTx={openTx}/>) }
    </>
  )
}

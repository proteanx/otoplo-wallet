import { useEffect, useState } from 'react';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import WalletData from './WalletData';
import TxList from './tx/TxList';
import WalletLoader from './WalletLoader';
import Vault from './vault/Vault';
import { useAppDispatch } from '../store/hooks';
import StorageProvider from '../providers/storage.provider';
import { fetchBalance, fetchHeightAndPrice, setAccountKey, setKeys, setSync, syncWallet } from '../store/slices/wallet.slice';
import { discoverWallet, generateAccountKey, generateKeysAndAddresses, generateMasterKey } from '../utils/wallet.utils';
import { rostrumProvider } from '../providers/rostrum.provider';
import { discoverVaults, saveHodlAddress } from '../utils/vault.utils';
import { Id, toast } from 'react-toastify';
import Tokens from './tokens/Tokens';
import Settings from './settings/Settings';
import Nfts from './nfts/Nfts';

interface WalletProps {
  seed: string;
  item: string;
}

export default function Wallet({ seed, item }: WalletProps) {
  const [blocker, setBlocker] = useState(true);
  const [tmpVal, setTmpVal] = useState(0);

  const dispatch = useAppDispatch();

  let masterKey = generateMasterKey(seed);

  const initWallet = async () => {
    let accountKey = generateAccountKey(masterKey, 0);
    dispatch(setAccountKey(accountKey));

    let recoverVaults = false;
    let indexes = await StorageProvider.getWalletIndexes();
    let toastId: Id = 0;
    if (indexes.rIndex === 0) {
      toastId = toast.loading("Discovering Wallet...", {
        position: 'top-center',
        autoClose: false,
        hideProgressBar: true,
        closeOnClick: false,
        pauseOnHover: false,
        draggable: false,
        progress: undefined,
        theme: "dark",
      });
      dispatch(setSync());
      recoverVaults = (await StorageProvider.getHodlState()).idx === 0;
      indexes = await discoverWallet(accountKey);
    }
    let walletKeys = generateKeysAndAddresses(accountKey, 0, indexes.rIndex, 0, indexes.cIndex);

    if (recoverVaults && StorageProvider.setLock(StorageProvider.VAULT_SCAN_LOCK)) {
      let vaultAccountKey = generateAccountKey(masterKey, 1);
      try {
        let rAddrs = walletKeys.receiveKeys.map(k => k.address);
        let cAddrs = walletKeys.changeKeys.map(k => k.address);
        let vRes = await discoverVaults(rAddrs.concat(cAddrs), vaultAccountKey);
        for (const v of vRes.vaults) {
          await saveHodlAddress(vRes.index, v);
        }
      } catch (e) {
        console.log(e);
      } finally {
        StorageProvider.removeLock(StorageProvider.VAULT_SCAN_LOCK);
      }
    }
    
    dispatch(setKeys(walletKeys));
    dispatch(fetchBalance());
    if (toastId !== 0) {
      toast.update(toastId, { autoClose: 1, type: 'default', isLoading: false });
    }
  }

  const refreshWallet = () => {
    dispatch(fetchHeightAndPrice());
    if (!StorageProvider.setLock(StorageProvider.SYNC_LOCK)) {
      return; // already running
    }
    dispatch(syncWallet());
  }
  
  useEffect(() => {
    if (seed !== '') {
      StorageProvider.removeLock(StorageProvider.SYNC_LOCK);
      StorageProvider.removeLock(StorageProvider.VAULT_SCAN_LOCK);
      StorageProvider.removeLock(StorageProvider.VAULT_REFRESH_LOCK);

      rostrumProvider.connect().then(() => {
        dispatch(fetchHeightAndPrice());
        initWallet().then(() => {
          var lastSynced = StorageProvider.getLastCheck();
          if (lastSynced == null || lastSynced < (Math.floor(Date.now() / 1000) - 90)) {
              refreshWallet();
          }
          setBlocker(false);
        });
      }).catch(e => {
        console.log(e);
        let accountKey = generateAccountKey(masterKey, 0);
        StorageProvider.getWalletIndexes().then(res => {
          let walletKeys = res.rIndex === 0 ? generateKeysAndAddresses(accountKey, 0, 1, 0, 1) : generateKeysAndAddresses(accountKey, 0, res.rIndex, 0, res.cIndex);
          dispatch(setKeys(walletKeys));
        });
      });
  
      const myInterval = setInterval(() => {
        setTmpVal((prevVal) => prevVal + 1);
      }, 60 * 1000);
  
      return () => clearInterval(myInterval);
    }
    return;
  }, [seed]);

  useEffect(() => {
    if (tmpVal !== 0) {
      refreshWallet();
    }
  }, [tmpVal]);

  if ((!import.meta.env.VITE_IS_DESKTOP || import.meta.env.VITE_IS_DESKTOP === "false") && blocker) {
    return <WalletLoader/>;
  }

  if (item === 'TOKEN') {
    return <Tokens/>;
  }

  if (item === 'NFT') {
    return <Nfts/>;
  }

  if (item === 'VAULT') {
    let vaultAccountKey = generateAccountKey(masterKey, 1);
    return (
      <Vault vaultAccountKey={vaultAccountKey}/>
    )
  }

  if (item === 'SETTINGS') {
    return <Settings/>
  }

  // NEXA WALLET
  return (
    <>
      <Card bg="custom-card" className='text-white mt-3'>
        <Card.Body>
          <Row>
            <Col className='center'>
              <WalletData />
            </Col>
          </Row>
        </Card.Body>
      </Card>
      <TxList />
    </>
  )
}

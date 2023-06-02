import React, { useEffect, useState } from 'react';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import WalletData from './WalletData';
import TxList from '../tx/TxList';
import { Script } from 'nexcore-lib';
import { checkAddresses, checkBalanceAndTransactions, generateAccountKey, generateKeysAndAddresses } from '../utils/functions';
import bigDecimal from 'js-big-decimal';
import { getLocalTransactions, addLocalTransactions, getAddressesIndexes, setAddressesIndexes, getTransactionsState, setTransactionsState, setLock, removeLock, getLastCheck, setLastCheck, getHodlState } from '../utils/localdb';
import WalletLoader from './WalletLoader';
import TokenData from './token/TokenData';
import Vault from './vault/Vault';
import { discoverVaults, saveHodlAddress } from '../utils/vaultUtils';

export default function Wallet({ heightVal, price, masterKey, item }) {
  const [keys, setKeys] = useState({});
  const [mainAddress, setMainAddress] = useState("");
  const [balance, setBalance] = useState({confirmed: 0, unconfirmed: 0});
  const [txState, setTxState] = useState({pending: 0, confirmed: 0, height: 0, total: 0});
  const [blocker, setBlocker] = useState(true);
  const [tmpVal, setTmpVal] = useState(0);

  var accountKey = generateAccountKey(masterKey, 0);
  
  useEffect(() => {
    removeLock("refreshing");
    removeLock("vault-scan");
    removeLock("refresh-vaults");
    loadCachedWallet().then(res => {
      if (res) {
        setBlocker(false);
        var lastChecked = getLastCheck();
        if (lastChecked == null || parseInt(lastChecked) < (Math.floor(Date.now() / 1000) - 90)) {
            refreshWallet();
        }
      } else {
        refreshWallet();
      }
    });

    const myInterval = setInterval(() => {
      setTmpVal((prevVal) => prevVal + 1);
    }, 30 * 1000);

    return () => clearInterval(myInterval);
  }, []);

  useEffect(() => {
    if (tmpVal !== 0) {
      refreshWallet();
    }
  }, [tmpVal]);
  
  async function loadCachedWallet() {
    var idx = await getAddressesIndexes();
    if (idx.rIndex === 0) {
      return false;
    }
    
    console.log("load wallet from cache");
    var myKeys = generateKeysAndAddresses(accountKey, 0, idx.rIndex, 0, idx.cIndex);

    setKeys(myKeys);
    setMainAddress(myKeys.receiveKeys[myKeys.receiveKeys.length-1].address);

    var allTransactions = await getLocalTransactions();
    var transactionsState = await getTransactionsState();
    setTxState(transactionsState);

    if (allTransactions.length > 0) {
      var available = new bigDecimal(0);
      var pending = new bigDecimal(0);
      for (let i = 0; i < allTransactions.length; i++) {
        if (allTransactions[i].confirmed) {
          available = available.add(new bigDecimal(allTransactions[i].value));
        } else {
          pending = pending.add(new bigDecimal(allTransactions[i].value));
        }
      }
      
      setBalance({confirmed: available.multiply(new bigDecimal(100)).getValue(), unconfirmed: pending.multiply(new bigDecimal(100)).getValue()});
    }
    return true;
  }

  async function refreshWallet() {
    if (!setLock("refreshing")) {
      return; // already running
    }
    var idx = await getAddressesIndexes();
    
    var autoRecoverVaults = false;
    if (idx.rIndex === 0) {
      // first wallet creation / recovery
      idx = {rIndex: 50, cIndex: 50};
      autoRecoverVaults = process.env.REACT_APP_IS_HODL_ACTIVE === "true" && (await getHodlState()).idx === 0;
    }

    var myKeys = generateKeysAndAddresses(accountKey, 0, idx.rIndex, 0, idx.cIndex);

    var rAddrs = myKeys.receiveKeys.map(k => ({address: k.address, hex: Script.fromAddress(k.address).toHex()}));
    var cAddrs = myKeys.changeKeys.map(k => ({address: k.address, hex: Script.fromAddress(k.address).toHex()}));
    var st = await getTransactionsState();
    try {
      var res = await checkBalanceAndTransactions(rAddrs, cAddrs, st.height);
      setLastCheck();
      if (res.receiveIndex !== idx.rIndex || res.changeIndex !== idx.cIndex) {
        await setAddressesIndexes({rIndex: res.receiveIndex, cIndex: res.changeIndex});
        myKeys = generateKeysAndAddresses(accountKey, 0, res.receiveIndex, 0, res.changeIndex);
      }
      if (!keys.receiveKeys || keys.receiveKeys.length !== myKeys.receiveKeys.length || keys.changeKeys.length !== myKeys.changeKeys.length) {
        setKeys(myKeys);
      }
      if (mainAddress !== myKeys.receiveKeys[myKeys.receiveKeys.length-1].address) {
        setMainAddress(myKeys.receiveKeys[myKeys.receiveKeys.length-1].address);
      }
      if (balance.confirmed !== res.balance.confirmed || balance.unconfirmed !== res.balance.unconfirmed) {
        setBalance(res.balance);
      }
      if (txState.height !== res.transactions.height || txState.total !== res.transactions.total || txState.confirmed !== res.transactions.confirmed || txState.pending !== res.transactions.pending) {
        await addLocalTransactions(res.transactions.txs, res.transactions.pending, res.transactions.confirmed, res.transactions.height, res.transactions.total);
        setTxState({pending: res.transactions.pending, confirmed: res.transactions.confirmed, height: res.transactions.height, total: res.transactions.total});
      }
    } catch (e) {
      if (mainAddress === "") {
        setMainAddress(myKeys.receiveKeys[0].address);
      }
      console.log(e);
    } finally {
      removeLock("refreshing");
    }

    if (autoRecoverVaults && setLock("vault-scan")) {
      var vaultAccountKey = generateAccountKey(masterKey, 1);
      try {
        var vRes = await discoverVaults(rAddrs, cAddrs, vaultAccountKey);
        for (const v of vRes.vaults) {
          await saveHodlAddress(vRes.index, v);
        }
      } catch (e) {
        console.log(e);
      } finally {
        removeLock("vault-scan");
      }
    }

    if (blocker) {
      setBlocker(false);
    }
  }

  async function scanAddresses() {
    var idx = await getAddressesIndexes();
    var myKeys = generateKeysAndAddresses(accountKey, idx.rIndex, idx.rIndex + 20, idx.cIndex, idx.cIndex + 20);
    var rAddrs = myKeys.receiveKeys.map(k => ({address: k.address, hex: Script.fromAddress(k.address).toHex()}));
    var cAddrs = myKeys.changeKeys.map(k => ({address: k.address, hex: Script.fromAddress(k.address).toHex()}));

    var scanResult = await checkAddresses(rAddrs, cAddrs);
    var state = await getTransactionsState();
    if (scanResult.minHeight > 0) {
      if (scanResult.minHeight < state.height) {
        state.height = scanResult.minHeight;
        await setTransactionsState(state);
      }
      if (scanResult.receiveIndex > 0 || scanResult.changeIndex > 0) {
        await setAddressesIndexes({rIndex: idx.rIndex + scanResult.receiveIndex, cIndex: idx.cIndex + scanResult.changeIndex});
      }
      return true;
    }
    return false;
  }

  if ((!process.env.REACT_APP_IS_DESKTOP || process.env.REACT_APP_IS_DESKTOP === "false") && blocker) {
    return (
      <WalletLoader/>
    )
  }

  // if (item.token !== 'NEXA') {
  //   return (
  //     <TokenData item={item} mainAddr={mainAddress} keys={keys}/>
  //   )
  // }

  if (item.token === 'VAULT') {
    var vaultAccountKey = generateAccountKey(masterKey, 1);
    return (
      <Vault heightVal={heightVal} price={price} balance={balance} keys={keys} vaultAccountKey={vaultAccountKey}/>
    )
  }

  // NEXA WALLET
  return (
    <>
      <Card bg="custom-card" className='text-white mt-3'>
        <Card.Body>
          <Row>
            <Col className='center'>
              <WalletData scanAddresses={scanAddresses} price={price} balance={balance} mainAddr={mainAddress} keys={keys}/>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      <TxList heightVal={heightVal}/>
    </>
  )
}

import { useState, useEffect } from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import bigDecimal from 'js-big-decimal';
import nex from '../assets/img/nex.svg';
import Consolidate from './actions/Consolidate';
import { ListGroup, Offcanvas, Table } from 'react-bootstrap';
import { isMobileScreen } from '../utils/common.utils';
import { useAppSelector } from '../store/hooks';
import { walletState } from '../store/slices/wallet.slice';
import SendMoney from './actions/SendMoney';
import { scanForNewAddresses } from '../utils/wallet.utils';
import ReceiveMoney from './actions/ReceiveMoney';
import TxExport from './tx/TxExport';
import StorageProvider from '../providers/storage.provider';
import { getSelectedCurrency, getCurrencySymbol } from '../utils/price.utils';

export default function WalletData() {
  let isMobile = isMobileScreen();
  const [selectedCurrency, setSelectedCurrency] = useState("USD");

  const [showOffCanvas, setShowOffCanvas] = useState(false);
  const [showAddrs, setShowAddrs] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  const wallet = useAppSelector(walletState);
  const mainAddr = wallet.keys.receiveKeys[wallet.keys.receiveKeys.length - 1]?.address ?? '';

  useEffect(() => {
    getSelectedCurrency().then(setSelectedCurrency);
  }, []);

  const scanMoreAddresses = () => {
    setShowOffCanvas(false)
    setScanMsg("Scanning the next 20 addresses...");
    scanForNewAddresses(wallet.accountKey!).then(res => {
      if (res) {
        setScanMsg("Found addresses. the data will be loaded soon.");
      } else {
        setScanMsg("No results.");
      }
    }).catch(_ => {
      setScanMsg("Scan failed, please try again later and make sure the wallet is online.");
    }).finally(() => {
      setTimeout(() => {
        setScanMsg("");
      }, 3000);
    });
  }

  let val = {confirmed: new bigDecimal(wallet.balance.confirmed).divide(new bigDecimal(100), 2), unconfirmed: new bigDecimal(wallet.balance.unconfirmed).divide(new bigDecimal(100), 2)}
  if (val.unconfirmed.compareTo(new bigDecimal(0)) < 0) {
    val.confirmed = val.confirmed.add(val.unconfirmed);
    val.unconfirmed = new bigDecimal(0);
  }

  const currencySymbol = getCurrencySymbol(selectedCurrency);

  let rAddrs = wallet.keys.receiveKeys?.map(key => key.address).reverse();

  return (
    <>
      <Card.Title className='mb-4'><img width={25} src={nex} alt=''/> Nexa {wallet.sync && <i className="fas fa-sync fa-spin"/>}</Card.Title>
      <Card.Title>
        <div className='larger'>
          {val.confirmed.round(2, bigDecimal.RoundingModes.HALF_DOWN).getPrettyValue()} NEXA
        </div>
        <div className='smaller' style={{fontWeight: "400"}}>
          {wallet.price[selectedCurrency.toLowerCase()]?.compareTo(new bigDecimal(0)) > 0 && `(${currencySymbol}${wallet.price[selectedCurrency.toLowerCase()].multiply(val.confirmed).round(2, bigDecimal.RoundingModes.HALF_DOWN).getPrettyValue()})`}
        </div>
      </Card.Title>
      { val.unconfirmed.compareTo(new bigDecimal(0)) > 0 && 
        <div className="my-2">
          <i title='Pending' className="fa-regular fa-clock nx"/> {val.unconfirmed.round(2, bigDecimal.RoundingModes.HALF_DOWN).getPrettyValue()} NEXA
        </div>
      }
      <div className='pt-4'>
        <SendMoney balance={wallet.balance} keys={wallet.keys} ticker='NEXA' decimals={2} isMobile={isMobile}/>
        <ReceiveMoney address={mainAddr} isMobile={isMobile}/>
        <Consolidate nexKeys={wallet.keys} balance={wallet.balance} isMobile={isMobile}/>
        { isMobile ? (
          <div className='act-btn'>
            <Button onClick={() => setShowOffCanvas(true)}><i className="fa-solid fa-ellipsis"/></Button>
            <br/>
            <span>More</span>
          </div>
        ) : (
          <Button onClick={() => setShowOffCanvas(true)}><i className="fa-solid fa-ellipsis"/> More</Button>
        )}

        <Offcanvas data-bs-theme='dark' show={showOffCanvas} onHide={() => setShowOffCanvas(false)} placement='bottom'>
          <Offcanvas.Header className='pb-0 pt-2'>
            <Offcanvas.Title className='center' style={{fontSize: "1.7rem"}}>Wallet Options</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className='center' style={{fontSize: "1.2rem"}}>
            <ListGroup variant="flush">
              <ListGroup.Item onClick={() => setShowAddrs(true)} action>
                My Addresses
              </ListGroup.Item>
              <ListGroup.Item action onClick={scanMoreAddresses} disabled={scanMsg !== ''}>
                Scan More Addresses
              </ListGroup.Item>
              <TxExport/>
            </ListGroup>
          </Offcanvas.Body>
        </Offcanvas>
      </div>
      <div className='mt-1'>
        {scanMsg}
      </div>

      <Modal data-bs-theme='dark' scrollable contentClassName='modal-max-height text-bg-dark' show={showAddrs} onHide={() => setShowAddrs(false)} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton>
          <Modal.Title>Receive Addresses</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table borderless responsive striped hover>
            <tbody>
              {rAddrs?.map((addr, i) => <tr key={i}><td key={i} className='smaller'>{addr}</td></tr>)}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowAddrs(false)}>Ok</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
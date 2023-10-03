import React, { useState } from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Table from 'react-bootstrap/esm/Table';
import bigDecimal from 'js-big-decimal';
import { QRCode } from 'react-qrcode-logo';
import nex from '../assets/img/nex.svg';
import Consolidate from './send/Consolidate';
import { Clipboard } from '@capacitor/clipboard';
import { ListGroup, Offcanvas } from 'react-bootstrap';
import { isMobileScreen } from '../utils/functions';
import { useAppSelector } from '../store/hooks';
import { walletState } from '../store/slices/wallet';
import SendMoney from './send/SendMoney';
import { scanForNewAddresses } from '../utils/wallet.utils';

export default function WalletData() {
  let isMobile = isMobileScreen();

  const [showOffCanvas, setShowOffCanvas] = useState(false);
  const [showAddrs, setShowAddrs] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  const wallet = useAppSelector(walletState);
  const mainAddr = wallet.keys.receiveKeys.at(-1)?.address ?? '';

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

  const copy = async (value: string) => {
    await Clipboard.write({ string: value });
    document.getElementById("copy")!.classList.remove("hidden");
    setTimeout(() => {
      document.getElementById("copy")!.classList.add("hidden");
    }, 1000);
  }

  let val = {confirmed: new bigDecimal(wallet.balance.confirmed).divide(new bigDecimal(100), 2), unconfirmed: new bigDecimal(wallet.balance.unconfirmed).divide(new bigDecimal(100), 2)}
  if (val.unconfirmed.compareTo(new bigDecimal(0)) < 0) {
    val.confirmed = val.confirmed.add(val.unconfirmed);
    val.unconfirmed = new bigDecimal(0);
  }
  let rAddrs = wallet.keys.receiveKeys?.map(key => key.address).reverse();

  return (
    <>
      <Card.Title>Available</Card.Title>
      <Card.Title>{val.confirmed.round(2, bigDecimal.RoundingModes.HALF_DOWN).getPrettyValue()} NEXA
        <div style={{fontSize: "0.9rem", fontWeight: "400"}}>
          {wallet.price.compareTo(new bigDecimal(0)) > 0 && "($"+wallet.price.multiply(val.confirmed).round(2, bigDecimal.RoundingModes.HALF_DOWN).getPrettyValue()+")"}
        </div>
      </Card.Title>
      <div className="my-3">
        Pending
        <div>{val.unconfirmed.round(2, bigDecimal.RoundingModes.HALF_DOWN).getPrettyValue()} NEXA</div>
      </div>
      <div className="my-3">
        Receiving Address
        <i className="mx-1 fa-solid fa-qrcode cursor" title='QR code' onClick={() => setShowQR(true)}/>
        <div>                    
          <span className='text-monospace nx'>{mainAddr}</span>
          <i className="fa-regular fa-copy ms-1 cursor" aria-hidden="true" title='copy' onClick={() => copy(mainAddr)}/>
          <i id="copy" className="mx-1 fa fa-check nx hidden"/>
        </div>
      </div>
      { isMobile ? (
          <>
            <SendMoney balance={wallet.balance} keys={wallet.keys}/>
            <Consolidate nexKeys={wallet.keys} balance={wallet.balance}/>
            <Button onClick={() => setShowOffCanvas(true)}><i className="fa-solid fa-ellipsis"></i></Button>

            <Offcanvas show={showOffCanvas} onHide={() => setShowOffCanvas(false)} placement='bottom'>
              <Offcanvas.Header>
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
                </ListGroup>
              </Offcanvas.Body>
            </Offcanvas>
          </>
        ) : (
          <>
            <Button className='mx-2' variant="outline-primary" onClick={() => setShowAddrs(true)}>My Addresses</Button>
            <Button variant="outline-primary" onClick={scanMoreAddresses} disabled={scanMsg !== ''}>Scan More Addresses</Button>
            <SendMoney balance={wallet.balance} keys={wallet.keys}/>
            <Consolidate nexKeys={wallet.keys} balance={wallet.balance}/>
          </>
        )
      }
      <div className='mt-1'>
        {scanMsg}
      </div>

      <Modal show={showAddrs} onHide={() => setShowAddrs(false)} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton>
          <Modal.Title>Receive Addresses</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table borderless responsive striped hover>
            <tbody>
              {rAddrs?.map((addr, i) => <tr key={i}><td key={i}>{addr}</td></tr>)}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowAddrs(false)}>Ok</Button>
        </Modal.Footer>
      </Modal>

      <Modal size='sm' show={showQR} onHide={() => setShowQR(false)} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton>
          <Modal.Title>Address QR Code</Modal.Title>
        </Modal.Header>
        <Modal.Body className='center'>
          <QRCode value={mainAddr} size={200} logoImage={nex} logoWidth={35} logoPadding={1}/>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowQR(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

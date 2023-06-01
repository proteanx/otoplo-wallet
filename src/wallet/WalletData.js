import React, { useState } from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Table from 'react-bootstrap/esm/Table';
import bigDecimal, { RoundingModes } from 'js-big-decimal';
import { QRCode } from 'react-qrcode-logo';
import SendMoney from './SendMoney';
import nex from '../img/nex.svg';
import Consolidate from './misc/Consolidate';
import { Clipboard } from '@capacitor/clipboard';
import { ListGroup, Offcanvas } from 'react-bootstrap';

export default function WalletData({ scanAddresses, price, balance, mainAddr, keys }) {
  const [width] = useState(window.innerWidth);
  const isMobile = (width <= 768);

  const [showOffCanvas, setShowOffCanvas] = useState(false);
  const [showAddrs, setShowAddrs] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  const scanMoreAddresses = () => {
    setShowOffCanvas(false)
    setScanMsg("Scanning the next 20 addresses...");
    scanAddresses().then(res => {
      if (res) {
        setScanMsg("Found addresses. the data will be loaded soon.");
      } else {
        setScanMsg("No results.");
      }
      setTimeout(() => {
        setScanMsg("");
      }, 3000)
    }).catch(_ => {
      setScanMsg("Scan failed, please try again later and make sure the wallet is online.");
      setTimeout(() => {
        setScanMsg("");
      }, 3000)
    })
  }

  const copy = async (value) => {
    await Clipboard.write({ string: value });
    document.getElementById("copy").classList.remove("hidden");
    setTimeout(() => {
      document.getElementById("copy").classList.add("hidden");
    }, 1000)
  }

  var val = {confirmed: new bigDecimal(balance.confirmed).divide(new bigDecimal(100), 2), unconfirmed: new bigDecimal(balance.unconfirmed).divide(new bigDecimal(100), 2)}
  if (val.unconfirmed.compareTo(new bigDecimal(0)) < 0) {
    val.confirmed = val.confirmed.add(val.unconfirmed);
    val.unconfirmed = new bigDecimal(0);
  }
  var rAddrs = keys?.receiveKeys?.map(key => key.address).reverse();

  return (
    <>
      <Card.Title>Available</Card.Title>
      <Card.Title>{val.confirmed.round(2, RoundingModes.HALF_DOWN).getPrettyValue()} NEXA
        <div style={{fontSize: "0.9rem", fontWeight: "400"}}>
          {price.compareTo(new bigDecimal(0)) > 0 && "($"+price.multiply(val.confirmed).round(2, RoundingModes.HALF_DOWN).getPrettyValue()+")"}
        </div>
      </Card.Title>
      <div className="my-3">
        Pending
        <div>{val.unconfirmed.round(2, RoundingModes.HALF_DOWN).getPrettyValue()} NEXA</div>
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
            <SendMoney balance={balance} keys={keys}/>
            <Consolidate nexKeys={keys} balance={balance}/>
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
            <SendMoney balance={balance} keys={keys}/>
            <Consolidate nexKeys={keys} balance={balance}/>
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
          <Table borderless responsive striped>
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

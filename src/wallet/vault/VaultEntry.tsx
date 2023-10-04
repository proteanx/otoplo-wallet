import React, { useState } from 'react';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import bigDecimal from 'js-big-decimal';
import nex from '../../assets/img/nex.svg';
import { QRCode } from 'react-qrcode-logo';
import Claim from './Claim';
import { ListGroup, Offcanvas } from 'react-bootstrap';
import { isMobileScreen } from '../../utils/common.utils';
import { WalletKeys } from '../../models/wallet.entities';
import { VaultInfo } from './Vault';
import HDPrivateKey from 'nexcore-lib/types/lib/hdprivatekey';
import { estimateDateByFutureBlock, generateHodlKey, getVaultBlockAndIndex } from '../../utils/vault.utils';
import { dbProvider } from '../../providers/db.provider';

interface VaultEntryProps {
  keys: WalletKeys;
  entry: number;
  copy: (value: string, elemId: string) => Promise<void>;
  heightVal: number;
  price: bigDecimal;
  vault: VaultInfo;
  vaultAccountKey: HDPrivateKey;
  refreshVaults: () => Promise<void>;
  openTx: (address: string) => void
}

export default function VaultEntry({ keys, entry, copy, heightVal, price, vault, vaultAccountKey, refreshVaults, openTx }: VaultEntryProps) {
  let isMobile = isMobileScreen();

  const [showQR, setShowQR] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showOffCanvas, setShowOffCanvas] = useState(false);

  let vaultAddress = vault.address;
  let vaultInfo = getVaultBlockAndIndex(vaultAddress);

  let block = vaultInfo.block;
  let keyIndex = vaultInfo.index;

  let vaultKey = generateHodlKey(vaultAccountKey, keyIndex);

  let val = {confirmed: new bigDecimal(vault.balance.confirmed).divide(new bigDecimal(100), 2), unconfirmed: new bigDecimal(vault.balance.unconfirmed).divide(new bigDecimal(100), 2)}
  if (val.unconfirmed.compareTo(new bigDecimal(0)) < 0) {
    val.confirmed = val.confirmed.add(val.unconfirmed);
    val.unconfirmed = new bigDecimal(0);
  }

  let eta = '';
  if (block > heightVal) {
    eta = estimateDateByFutureBlock(heightVal, block);
  }

  const moveToArchive = async () => {
    await dbProvider.updateLocalVaultArchive(vaultAddress, true);
    refreshVaults();
    setShowArchiveDialog(false);
    setShowOffCanvas(false);
  }

  return (
    <>
      <Card bg="custom-card" className='text-white mt-3'>
        <Card.Body>
          <Row>
            <Col className='center'>
              <div>
                Vault Address
                <i className="mx-1 fa-solid fa-qrcode cursor" title='QR code' onClick={() => setShowQR(true)}/>
                <div className='center' style={isMobile ? {width: '95%'} : {width: '70%'}} >                    
                  <span className='text-monospace nx'>{vaultAddress}</span>
                  <i className="fa-regular fa-copy ms-1 cursor" aria-hidden="true" title='copy' onClick={() => copy(vaultAddress, "copy_v_" + entry)}/>
                  <i id={"copy_v_" + entry} className="mx-1 fa fa-check nx hidden"/>
                </div>
              </div>
              <div className='mt-2'>
                Balance
                <div>
                  <b>{val.confirmed.round(2, bigDecimal.RoundingModes.HALF_DOWN).getPrettyValue()} NEXA @ {"$"+price.multiply(val.confirmed).round(2, bigDecimal.RoundingModes.HALF_DOWN).getPrettyValue()}</b>
                </div>
              </div>
              <div className="mt-2">
                Pending
                <div style={{fontWeight: "300"}}>{val.unconfirmed.round(2, bigDecimal.RoundingModes.HALF_DOWN).getPrettyValue()} NEXA</div>
              </div>
              <div className='mt-2'>
                { eta ? "Locked until block: " + new bigDecimal(block).getPrettyValue() + " (estimate date: "+ eta +")" : "🔓 Unlocked" }
              </div>
              <div className='mt-3'>
                { isMobile ? (<>
                    <Claim eta={eta} balance={vault.balance} vaultKey={vaultKey} vaultAddress={vaultAddress} vaultInfo={vaultInfo} nexKeys={keys} refreshVaults={refreshVaults}/>
                    <Button onClick={() => setShowOffCanvas(true)}><i className="fa-solid fa-ellipsis"></i></Button>
                    
                      <Offcanvas show={showOffCanvas} onHide={() => setShowOffCanvas(false)} placement='bottom'>
                        <Offcanvas.Header>
                          <Offcanvas.Title className='center' style={{fontSize: "1.7rem"}}>Vault Options</Offcanvas.Title>
                        </Offcanvas.Header>
                        <Offcanvas.Body className='center' style={{fontSize: "1.2rem"}}>
                          <ListGroup variant="flush">
                            <ListGroup.Item onClick={() => openTx(vaultAddress)} action>
                              Show Transactions
                            </ListGroup.Item>
                            <ListGroup.Item action onClick={() => setShowArchiveDialog(true)} disabled={!(!eta && val.confirmed.add(val.unconfirmed).compareTo(new bigDecimal(0)) === 0)}>
                              Move to Archive
                            </ListGroup.Item>
                          </ListGroup>
                        </Offcanvas.Body>
                      </Offcanvas>
                  </>) : (<>
                    { (!eta && val.confirmed.add(val.unconfirmed).compareTo(new bigDecimal(0)) === 0) && <Button variant="outline-primary" onClick={() => setShowArchiveDialog(true)}>Move to Archive</Button> }
                    <Claim eta={eta} balance={vault.balance} vaultKey={vaultKey} vaultAddress={vaultAddress} vaultInfo={vaultInfo} nexKeys={keys} refreshVaults={refreshVaults}/>
                    <Button onClick={() => openTx(vaultAddress)}>Show Transactions</Button>
                  </>) }
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Modal size='sm' show={showQR} onHide={() => setShowQR(false)} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton>
          <Modal.Title>Address QR Code</Modal.Title>
        </Modal.Header>
        <Modal.Body className='center'>
          <QRCode value={vaultAddress} size={200} logoImage={nex} logoWidth={35} logoPadding={1}/>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowQR(false)}>Close</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showArchiveDialog} onHide={() => setShowArchiveDialog(false)} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton>
          <Modal.Title>Move to Archive</Modal.Title>
        </Modal.Header>
        <Modal.Body className='center'>
          Are you sure you want to move the Vault: <div style={{wordBreak: 'break-all'}}><b>{vaultAddress}</b></div> to Archive?
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowArchiveDialog(false)}>Cancel</Button>
          <Button onClick={moveToArchive}>Confirm</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

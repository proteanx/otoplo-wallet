import { Button, Form, InputGroup, Modal } from "react-bootstrap";
import { QRCode } from "react-qrcode-logo";
import nex from '../../assets/img/nex.svg';
import { copy } from "../../utils/common.utils";
import { useState } from "react";

export default function ReceiveMoney({ address, isMobile }: { address: string, isMobile?: boolean }) {
  const [showQR, setShowQR] = useState(false);

  return (
    <>
      { isMobile ? (
        <div className='act-btn'>
          <Button onClick={() => setShowQR(true)}><i className="fa fa-download"/></Button>
          <br/>
          <span>Receive</span>
        </div>
      ) : (
        <Button className='ms-2' onClick={() => setShowQR(true)}><i className="fa fa-download"/> Receive</Button>
      )}

      <Modal contentClassName="text-bg-dark" data-bs-theme='dark' show={showQR} onHide={() => setShowQR(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Receive Address</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className='center mb-2'>
            <QRCode value={address} size={220} logoImage={nex} logoWidth={35} logoPadding={1}/>
          </div>
          <InputGroup>
            <Form.Control className="smaller" disabled type="text" defaultValue={address}/>
            <InputGroup.Text as='button' onClick={() => copy(address, 'top-center')}><i className="fa-regular fa-copy"/></InputGroup.Text>
          </InputGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowQR(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

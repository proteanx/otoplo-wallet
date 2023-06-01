import React, { useState } from 'react'
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';

export default function Donation() {
  const [show, setShow] = useState(false);

  const handleShow = () => setShow(true);
  const handleClose = () => setShow(false);

  return (
    <>
      <Button size="sm" onClick={handleShow}><i className="fa fa-heart"/> Donate</Button>

      <Modal contentClassName='bg-dark text-white text-dev' show={show} onHide={handleClose} size="lg" aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton>
          <Modal.Title>Support Developer</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className='text-info text-dev'>
            This Wallet developed and maintained by vgrunner, a Nexa community developer.
            <br/>Please consider a donation to help with the costs of keep maintaining and developing the wallet,
            as well as buy me a coffee and show me some love for my work. :)
          </p>
          <h6 className='mt-4 text-dev'>Donate by address</h6>
          <div className='text-monospace url'>
            NEXA: <a rel="noreferrer" target={"_blank"} href='https://explorer.nexa.org/address/nexa:nqtsq5g5402qrtfrhfd4uusvdgs0cal5r6g27auyy6cuuzxn'>nexa:nqtsq5g5402qrtfrhfd4uusvdgs0cal5r6g27auyy6cuuzxn</a>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

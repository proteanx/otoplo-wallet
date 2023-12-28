import { useState } from "react";
import { Button, Modal } from "react-bootstrap";

export default function ReleaseNotes() {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>Details</Button>

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showDialog} onHide={() => setShowDialog(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="ms-auto">Release Notes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="larger mb-3">Otoplo Wallet {import.meta.env.VITE_VERSION}</div>
          <div className="mb-3 smaller">
            <div className="bold mb-1">NEWS</div>
            <div className='light-txt'>- Add option to export transactions to CSV file</div>
          </div>
          {/* <div className="mb-3 smaller">
            <div className="bold mb-1">FIXES</div>
            <div className='light-txt'>- Fixed crashing issue on old devices</div>
          </div> */}
          <div className='mb-1 url'>
            <a href='https://gitlab.com/otoplo/otoplo-wallet/otoplo-wallet/-/blob/main/RELEASE-NOTES.md' target='_blank'>Full Release notes <i className="va fa-solid fa-arrow-up-right-from-square fa-xs"/></a>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDialog(false)}>Close</Button> 
        </Modal.Footer>
      </Modal>
    </>
  )
}

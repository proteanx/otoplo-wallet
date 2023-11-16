import { CapacitorHttp } from "@capacitor/core";
import { useState } from "react";
import { Button, Modal, Spinner } from "react-bootstrap";

interface INotes {
  version: string;
  feats: string[];
  fixes: string[];
}

export default function ReleaseNotes() {
  const [showDialog, setShowDialog] = useState(false);
  const [notes, setNotes] = useState<INotes>();
  const [err, setErr] = useState('');

  const fetchNotes = async () => {
    setErr('');
    setShowDialog(true)
    try {
      if (!notes) {
        let res = await CapacitorHttp.get({ url: `https://release.otoplo.com/otoplo-wallet/${import.meta.env.VITE_VERSION}/info.json` });
        if (res.status !== 200) {
            throw new Error("Failed to fetch notes");
        }
        setNotes(res.data);
      }
    } catch (e) {
      console.error(e);
      setErr("Failed to fetch release notes.");
    }
  }

  return (
    <>
      <Button onClick={fetchNotes}>Details</Button>

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showDialog} onHide={() => setShowDialog(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="ms-auto">Release Notes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {notes ? (
            <>
              <div className="larger mb-3">Otoplo Wallet {notes.version}</div>
              <div className="mb-3 smaller">
                <div className="bold mb-1">NEWS</div>
                {notes.feats.map((f, i) => <div className='light-txt' key={i}>- {f}</div>)}
              </div>
              <div className="mb-1 smaller">
                <div className="bold mb-1">FIXES</div>
                {notes.fixes.map((f, i) => <div className='light-txt' key={i}>- {f}</div>)}
              </div>
            </>
          ) : (
            <div className="center">{err || <Spinner animation="grow"/>}</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDialog(false)}>Close</Button> 
        </Modal.Footer>
      </Modal>
    </>
  )
}

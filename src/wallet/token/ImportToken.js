import React, { useRef, useState } from 'react';
import FloatingLabel from 'react-bootstrap/esm/FloatingLabel';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import { Spinner } from 'react-bootstrap';
import { fetchTokenData, isTokenExist, saveLocalToken } from '../../utils/tokensUtils';

export default function ImportToken({ showDialog, setShowDialog, rebuildItems }) {
  const [spinner, setSpinner] = useState("");
  const [tErr, setTErr] = useState("");

  const tokenAddressRef = useRef("");

  const cancelDialog = () => {
    setTErr("");
    setShowDialog(false);
  }

  const addToken = () => {
    if (tokenAddressRef.current.value) {
      setSpinner(<Spinner animation="border" size="sm"/>);
      if (isTokenExist(tokenAddressRef.current.value)) {
        setTErr("Token already exists.");
        setSpinner("");
      } else {
        fetchTokenData([tokenAddressRef.current.value]).then(res => {
          saveLocalToken(res.token);
          rebuildItems();
          cancelDialog();
        }).catch(e => {
          setTErr("Failed to import token. " + (!e.response ? "Make sure the wallet is online." : e.response.data));
        }).finally(() => {
          setSpinner("");
        });
      }
    }
  }

  return (
    <Modal show={showDialog} onHide={cancelDialog} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
      <Modal.Header closeButton>
        <Modal.Title>Import Token</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <FloatingLabel controlId="floatingInput" label="Token Address (must start with 'nexa:t...') or Token ID hex" className="mb-3">
          <Form.Control disabled={spinner !== ""} type="text" placeholder='nexa:t...' ref={tokenAddressRef}/>
        </FloatingLabel>
        <span className='bad'>
          {tErr}
        </span>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={cancelDialog}>Close</Button>
        <Button disabled={spinner !== ""} onClick={addToken}>{spinner !== "" ? spinner : "Add"}</Button>
      </Modal.Footer>
    </Modal>
  )
}

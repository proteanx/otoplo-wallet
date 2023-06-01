import React, { useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import Col from 'react-bootstrap/esm/Col';
import Row from 'react-bootstrap/esm/Row';
import { MenuItem } from 'react-pro-sidebar';
import { decryptMnemonic, isMnemonicValid } from '../utils/functions';
import { getEncryptedSeed } from '../utils/localdb';

export default function WalletBackup() {
  const [width] = useState(window.innerWidth);
  const isMobile = (width <= 768);

  const [showPwSeed, setShowPwSeed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [seedContent, setSeedContent] = useState("");
  const [pwErr, setPwErr] = useState("");

  const pwRef = useRef("");

  const showBackup = async () => {
    if (pwRef.current.value) {
      try {
        var encSeed = await getEncryptedSeed();
        var decMn = decryptMnemonic(encSeed, pwRef.current.value);
        if (decMn && isMnemonicValid(decMn)) {
          setSeedContent(buildSeed(decMn.split(" ")));
          setShowPwSeed(false);
          setPwErr("");
          setShowSeed(true);
        } else {
          setPwErr("Incorrect password.")
        }
      } catch {
        setPwErr("Incorrect password.")
      }
    }
  }

  function buildSeed(words) {
    let content = [], columns = [];
    words.forEach ((word, i) => {
      columns.push(
        <Col key ={i}>{i+1}<div>{word}</div></Col>
      );
        
      if((i+1) % (isMobile ? 3 : 4) === 0) {
        content.push(<Row key={i} className='py-2'>{columns}</Row>);
        columns = [];
      }
    });
    return content;
  }

  return (
    <>
      <MenuItem prefix={<i className="fa fa-file-shield"></i>} onClick={() => setShowPwSeed(true)}>Backup Seed</MenuItem>

      <Modal show={showPwSeed} onHide={() => setShowPwSeed(false)} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton={true}>
          <Modal.Title>Backup Seed</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Enter your password to decrypt the wallet</p>
          <InputGroup>
            <Form.Control type={!showPw ? "password" : "text"} ref={pwRef} placeholder="Password" autoFocus/>
            <InputGroup.Text className='cursor' onClick={() => setShowPw(!showPw)}>{!showPw ? <i className="fa fa-eye" aria-hidden="true"></i> : <i className="fa fa-eye-slash" aria-hidden="true"></i>}</InputGroup.Text>
          </InputGroup>
          <span className='bad'>
            {pwErr}
          </span>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPwSeed(false)}>Cancel</Button>
          <Button onClick={showBackup}>Next</Button>
        </Modal.Footer>
      </Modal>

      <Modal className='center' show={showSeed} onHide={() => setShowSeed(false)} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton={true}>
          <Modal.Title>Backup Seed</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {seedContent}
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={() => setShowSeed(false)}>Ok</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

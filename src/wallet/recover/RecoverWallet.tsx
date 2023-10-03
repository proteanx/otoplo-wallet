import React, { useRef, useState, Dispatch, SetStateAction } from 'react'
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/esm/Col';
import Row from 'react-bootstrap/esm/Row';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import InputGroup from 'react-bootstrap/InputGroup';
import { isMobileScreen } from '../../utils/functions';
import { clearLocalWallet } from '../../utils/wallet.utils';
import { encryptAndStoreMnemonic, isMnemonicValid, validatePassword } from '../../utils/seed.utils';

export default function RecoverWallet({ cancelRecover, setDecSeed }: { cancelRecover: () => void, setDecSeed: Dispatch<SetStateAction<string>> }) {
  let isMobile = isMobileScreen();

  const [phrase, setPhrase] = useState("");
  const [show, setShow] = useState(false);
  const [mnErr, setMnErr] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwErr, setPwErr] = useState("")

  const pwRef = useRef<HTMLInputElement>(null);
  const pwValidRef = useRef<HTMLInputElement>(null);

  const refs = useRef<React.RefObject<HTMLInputElement>[]>([]);
  refs.current = [...Array(12)].map((_, i) => refs.current[i] ?? React.createRef<HTMLInputElement>());

  let content = [], columns = [];
  for (let i = 0; i < 12; i++) {
    columns.push(
      <Col key ={i}>{i+1}<Form.Control ref={refs.current[i]} type="text"/></Col>
    );

    if((i+1) % (isMobile ? 3 : 4) === 0) {
      content.push(<Row key={i} className='py-2'>{columns}</Row>);
      columns = [];
    }
  }

  const next = () => {
    let words = [];
    for (let i = 0; i < refs.current.length; i++) {
      if (!refs.current[i].current || !refs.current[i].current!.value) {
        return;
      }
      words[i] = refs.current[i].current!.value.trim().toLowerCase();
    }
    if (!isMnemonicValid(words.join(' '))) {
      setMnErr("Invalide seed.");
    } else {
      setPhrase(words.join(' '));
      setShow(true);
    }
  }

  const confirm = () => {
    if (pwRef.current?.value && pwValidRef.current?.value) {
      var err = validatePassword(pwRef.current.value, pwValidRef.current.value);
      setPwErr(err);
      if (err === "") {
        clearLocalWallet().then(_ => {
          encryptAndStoreMnemonic(phrase, pwRef.current!.value);
          setDecSeed(phrase);
          setShow(false);
          cancelRecover();
        })
      }
    }
  }

  const keyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if(event.key === 'Enter'){
      event.preventDefault()
      confirm();
    }
  }

  const handleClose = () => setShow(false);
  const reveal = () => setShowPw(!showPw);

  return (
    <>
      <Card.Title className='pt-3'>Recover Wallet</Card.Title>
      <hr/>
      <Card.Body>
        <p>Please enter your seed phrase.</p>
        {content}
        <Card.Text className='bad'>
          {mnErr}
        </Card.Text>
      </Card.Body>
      <div className='mb-3'>
        <Button variant="outline-primary" className='mx-1' onClick={cancelRecover}>Cancel</Button>
        <Button className='mx-1' onClick={next}>Next</Button>
      </div>

    <Modal show={show} onHide={handleClose} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
      <Modal.Header closeButton={true}>
        <Modal.Title>Protect wallet</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Enter password to protect your wallet.</p>
        <p>Note: Password is not part of your seed, it only encrypts the seed locally in your device.</p>
        <InputGroup>
          <Form.Control type={!showPw ? "password" : "text"} ref={pwRef} placeholder="Password" autoFocus/>
          <InputGroup.Text className='cursor' onClick={reveal}>{!showPw ? <i className="fa fa-eye" aria-hidden="true"></i> : <i className="fa fa-eye-slash" aria-hidden="true"></i>}</InputGroup.Text>
        </InputGroup>
        <InputGroup className='mt-3'>
          <Form.Control type={!showPw ? "password" : "text"} ref={pwValidRef} placeholder="Confirm Password" onKeyDown={keyDown}/>
          <InputGroup.Text className='cursor' onClick={reveal}>{!showPw ? <i className="fa fa-eye" aria-hidden="true"></i> : <i className="fa fa-eye-slash" aria-hidden="true"></i>}</InputGroup.Text>
        </InputGroup>
        <span className='bad'>
          {pwErr}
        </span>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Cancel</Button>
        <Button onClick={confirm}>Confirm</Button>
      </Modal.Footer>
    </Modal>
    </>
  )
}

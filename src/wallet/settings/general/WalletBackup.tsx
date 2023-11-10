import { ReactElement, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import Col from 'react-bootstrap/esm/Col';
import Row from 'react-bootstrap/esm/Row';
import { isMobileScreen } from '../../../utils/common.utils';
import { isPasswordValid } from '../../../utils/seed.utils';

export default function WalletBackup() {
  let isMobile = isMobileScreen();

  const [showPwSeed, setShowPwSeed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showSeed, setShowSeed] = useState(false);
  const [seedContent, setSeedContent] = useState<ReactElement[] | string>("");
  const [pwErr, setPwErr] = useState("");

  const pwRef = useRef<HTMLInputElement>(null);

  const showBackup = async () => {
    if (pwRef.current?.value) {
      let decMn = await isPasswordValid(pwRef.current.value);
      if (decMn) {
        setSeedContent(buildSeed(decMn.split(" ")));
        setShowPwSeed(false);
        setPwErr("");
        setShowSeed(true);
      } else {
        setPwErr("Incorrect password.");
      }
    }
  }

  function buildSeed(words: string[]) {
    let content: ReactElement[] = [], columns: ReactElement[] = [];
    words.forEach((word, i) => {
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
      <Button onClick={() => setShowPwSeed(true)}>Show</Button>

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showPwSeed} onHide={() => setShowPwSeed(false)} backdrop="static" keyboard={false} centered>
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

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' className='center' show={showSeed} onHide={() => setShowSeed(false)} backdrop="static" keyboard={false} centered>
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

import React, { Dispatch, SetStateAction, useRef, useState } from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import Step1 from './Step1';
import { clearLocalWallet } from '../../utils/wallet.utils';
import { encryptAndStoreMnemonic, generateWords, validatePassword } from '../../utils/seed.utils';

export default function CreateWallet({ cancelCreate, setDecSeed }: { cancelCreate: () => void, setDecSeed: Dispatch<SetStateAction<string>> }) {

  const [step1, setStep1] = useState(false);
  const [words, setWords] = useState<string[]>([]);
  const [pwErr, setPwErr] = useState("");
  const [pwEnc, setPwEnc] = useState("");
  const [showPw, setShowPw] = useState(false);

  const pwRef = useRef<HTMLInputElement>(null);
  const pwValidRef = useRef<HTMLInputElement>(null);

  const next = () => {
    if (pwRef.current?.value && pwValidRef.current?.value) {
      var err = validatePassword(pwRef.current.value, pwValidRef.current.value);
      setPwErr(err);
      if (err === "") {
        setPwEnc(pwRef.current.value);
        setWords(generateWords().split(' '));
        setStep1(true);
      }
    }
  }

  const handleSeed = () => {
    var phrase = words.join(' ');
    clearLocalWallet(false).then(_ => {
      encryptAndStoreMnemonic(phrase, pwEnc);
      setDecSeed(phrase);
      cancelCreate();
    });
  }

  const keyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if(event.key === 'Enter'){
      event.preventDefault()
      next();
    }
  }

  const reveal = () => setShowPw(!showPw);

  if (step1) {
    return (
      <Step1 words={words} handleSeed={handleSeed}></Step1>
    )
  }

  return (
    <>
      <Card.Title className='pt-3'>Create a new wallet</Card.Title>
      <hr/>
      <Form className='px-3 pb-3'>
        <Form.Group className="mb-2">
          <Form.Label>Create new password for your wallet</Form.Label>
          <InputGroup>
            <Form.Control type={!showPw ? "password" : "text"} ref={pwRef} placeholder="Password" autoFocus/>
            <InputGroup.Text className='cursor' onClick={reveal}>{!showPw ? <i className="fa fa-eye" aria-hidden="true"></i> : <i className="fa fa-eye-slash" aria-hidden="true"></i>}</InputGroup.Text>
          </InputGroup>
          <Form.Text>
              * Must contain at least one number, one uppercase and lowercase letter, and at least 8 or more characters.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Validate password</Form.Label>
          <InputGroup>
            <Form.Control type={!showPw ? "password" : "text"} ref={pwValidRef} placeholder="Confirm Password" onKeyDown={keyDown}/>
            <InputGroup.Text className='cursor' onClick={reveal}>{!showPw ? <i className="fa fa-eye" aria-hidden="true"></i> : <i className="fa fa-eye-slash" aria-hidden="true"></i>}</InputGroup.Text>
          </InputGroup>
          <Form.Text className="text-red">
            {pwErr}
          </Form.Text>
          <p className='mt-2'><i>* The password is not part of your seed, it only encrypts the seed locally in your device.</i></p>
        </Form.Group>

        <Button variant="outline-primary" className='mx-2' onClick={cancelCreate}>Cancel</Button>
        <Button className='mx-2' onClick={next}>Next</Button>
      </Form>
    </>
  )
}

import React, { Dispatch, SetStateAction, useRef, useState } from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import InputGroup from 'react-bootstrap/InputGroup';
import CreateWallet from './create/CreateWallet';
import RecoverWallet from './recover/RecoverWallet';
import { isMobilePlatform } from '../utils/common.utils';
import { decryptMnemonic, isMnemonicValid } from '../utils/seed.utils';

export default function OpenWallet({ encSeed, setDecSeed }: { encSeed: string, setDecSeed: Dispatch<SetStateAction<string>> }) {
  const [makeNew, setMakeNew] = useState(false)
  const [recover, setRecover] = useState(false)
  const [pwErr, setPwErr] = useState("")
  const [showPw, setShowPw] = useState(false)

  const pwRef = useRef<HTMLInputElement>(null);

  const open = () => {
    if (pwRef.current?.value) {
      try {
        var decMn = decryptMnemonic(encSeed, pwRef.current.value);
        if (decMn && isMnemonicValid(decMn)) {
          setDecSeed(decMn);
        } else {
          setPwErr("Incorrect password.")
        }
      } catch {
        setPwErr("Incorrect password.")
      }
    }
  }

  const keyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if(event.key === 'Enter'){
      event.preventDefault()
      open();
    }
  }

  const show = () => setShowPw(!showPw);
  const newWallet = () => setMakeNew(true);
  const recoverWallet = () => setRecover(true);
  const cancelNewWallet = () => setMakeNew(false);
  const cancelRecoverWallet = () => setRecover(false);

  if (makeNew) {
    return (
      <CreateWallet cancelCreate={cancelNewWallet} setDecSeed={setDecSeed} />
    )
  }

  if (recover) {
    return (
      <RecoverWallet cancelRecover={cancelRecoverWallet} setDecSeed={setDecSeed} />
    )
  }

  return (
    <>
      <Card.Title className='pt-3'>Open Wallet</Card.Title>
      <hr/>
      <Form className='px-3 pb-3'>
        <Form.Group className="mb-2">
          <Form.Label>Unlock with your password</Form.Label>
          <InputGroup>
            <Form.Control type={!showPw ? "password" : "text"} ref={pwRef} placeholder="Password" autoFocus={!isMobilePlatform()} onKeyDown={keyDown}/>
            <InputGroup.Text className='cursor' onClick={show}>{!showPw ? <i className="fa fa-eye" aria-hidden="true"></i> : <i className="fa fa-eye-slash" aria-hidden="true"></i>}</InputGroup.Text>
            <Button onClick={open}>Open</Button>
          </InputGroup>
          <Form.Text className="text-red">
            {pwErr}
          </Form.Text>
        </Form.Group>

        <div className='mt-3'>
          <Button variant="outline-primary" className='mx-2' onClick={recoverWallet}>Recover from Seed</Button>
          <Button variant="outline-primary" className='mx-2' onClick={newWallet}>New Wallet</Button>
        </div>
      </Form>
    </>
  )
}

import React, { ReactElement, useState } from 'react';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/esm/Col';
import Row from 'react-bootstrap/esm/Row';
import Button from 'react-bootstrap/Button';
import Step2 from './Step2';
import { isMobileScreen } from '../../utils/functions';

export default function Step1({ words, handleSeed }: { words: string[], handleSeed: () => void }) {
  let isMobile = isMobileScreen();

  const [step2, setStep2] = useState(false);

  const next = () => setStep2(true);
  const back = () => setStep2(false);

  let content: ReactElement[] = [], columns: ReactElement[] = [];
  words.forEach ((word, i) => {
    columns.push(
      <Col key ={i}>{i+1}<div className='nx'>{word}</div></Col>
    );

    if((i+1) % (isMobile ? 3 : 4) === 0) {
      content.push(<Row key={i} className='py-2'>{columns}</Row>);
      columns = [];
    }
  });
  
  if (step2) {
    return (
      <Step2 words={words} goBack={back} handleSeed={handleSeed}></Step2>
    )
  }

  return (
    <>
      <Card.Title className='pt-3'>Wallet Seed</Card.Title>
      <hr/>
      <Card.Body>
        <p>Your wallet is accessible by a seed phrase. Please store your 12-word seed in a safe location.</p>
        It is important to keep your seed phrase secure and not share it with anyone.
        If someone else gets access to your seed phrase, they can access your wallet and steal your funds.
        {content}
      </Card.Body>
      <div>
        <Button className='mb-2' onClick={next}>Next</Button>
      </div>
    </>
  )
}

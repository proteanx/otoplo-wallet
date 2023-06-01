import React, { useRef, useState } from 'react';
import Card from 'react-bootstrap/Card';
import Col from 'react-bootstrap/esm/Col';
import Row from 'react-bootstrap/esm/Row';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Step3 from './Step3';

export default function Step2({ words, goBack, handleSeed }) {
  const [width] = useState(window.innerWidth);
  const isMobile = (width <= 768);

  const [step3, setStep3] = useState(false);
  const [mnErr, setMnErr] = useState("");

  const refs = useRef([]);
  refs.current = words.map((_, i) => refs.current[i] ?? React.createRef());

  let content = [], columns = [];
  words.forEach((_, i) => {
    if (i % 2 === 0) {
      columns.push(
        <Col key ={i}>{i+1}<Form.Control disabled defaultValue={'hidden'} type="text"/></Col>
      );
    } else {
      columns.push(
        <Col key ={i}>{i+1}<Form.Control ref={refs.current[i]} type="text"/></Col>
      );
    }

    if((i+1) % (isMobile ? 3 : 4) === 0) {
      content.push(<Row key={i} className='py-2'>{columns}</Row>);
      columns = [];
    }
  });

  const next = () => {
    for (let i = 1; i < words.length; i+=2) {
      if (!refs.current[i].current || !refs.current[i].current.value) {
        return;
      }
      if (words[i] !== refs.current[i].current.value.trim().toLowerCase()) {
        setMnErr("Wrong seed phrase.");
        return;
      }
    }
    setStep3(true);
  }

  if (step3) {
    return (
      <Step3 handleSeed={handleSeed}></Step3>
    )
  }

  return (
    <>
      <Card.Title className='pt-3'>Wallet Seed Validation</Card.Title>
      <hr/>
      <Card.Body>
        <p>Please enter every second word of your seed phrase in the same order.</p>
        {content}
        <Card.Text className='bad'>
          {mnErr}
        </Card.Text>
      </Card.Body>
      <div className='mb-3'>
        <Button variant="outline-primary" className='mx-1' onClick={goBack}>Return to words</Button>
        <Button className='mx-1' onClick={next}>Next</Button>
      </div>
    </>
  )
}

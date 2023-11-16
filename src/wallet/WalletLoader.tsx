import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Placeholder from 'react-bootstrap/Placeholder';
import nex from '../assets/img/nex.svg';

export default function WalletLoader() {
  return (
    <>
      <Card bg="custom-card" className='text-white mt-3'>
        <Card.Body>
          <Row>
            <Col className='center'>
              <Card.Title className='mb-4'><img width={20} src={nex} alt=''/> Nexa</Card.Title>
              <Placeholder as={Card.Title} animation="glow">
                <Placeholder xs={5} size="lg"/>
              </Placeholder>
              <Placeholder className='pt-4' as={Card.Text} animation="glow">
                <Placeholder.Button xs={2} />
              </Placeholder>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      <Card className='mt-3 text-white' bg="custom-card">
        <Card.Body>
          <Card.Title className='center'>Transactions</Card.Title>
          <hr/>
          <Placeholder as={Card.Title} animation="glow">
            <Placeholder xs={12} size="lg"/>
          </Placeholder>
        </Card.Body>
      </Card>
    </>
  )
}

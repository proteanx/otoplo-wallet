import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Placeholder from 'react-bootstrap/Placeholder';

export default function WalletLoader() {
  return (
    <>
      <Card bg="custom-card" className='text-white mt-3'>
        <Card.Body>
          <Row>
            <Col className='center'>
              <Card.Title>Available</Card.Title>
              <Placeholder as={Card.Title} animation="glow">
                <Placeholder xs={5} size="lg"/>
              </Placeholder>
              <div className="my-3">
                Pending
                <div>
                  <Placeholder as={Card.Text} animation="glow">
                    <Placeholder xs={5}/>
                  </Placeholder>
                </div>
              </div>
              <div className="my-3">
                Receiving Address
                <div>                    
                  <Placeholder as={Card.Text} animation="glow">
                    <Placeholder xs={8} size="lg"/>
                  </Placeholder>
                </div>
              </div>
              <Placeholder as={Card.Text} animation="glow">
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

import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';

export default function Step3({ handleSeed }: { handleSeed: () => void }) {

  const done = () => handleSeed();

  return (
    <>
      <Card.Title className='pt-3'>Create Wallet</Card.Title>
      <hr/>
      <Card.Body>
        <p>Wallet created successfully!</p>
        Remember, it is important to keep your seed phrase secure and not share it with anyone.
        If someone else gets access to your seed phrase, they can access your wallet and steal your funds.
      </Card.Body>
      <div className='mb-3'>
        <Button className='mx-1' onClick={done}>Done</Button>
      </div>
    </>
  )
}

import { Card, Col, Container, Row, Spinner } from 'react-bootstrap'
import { NftEntity } from '../../models/db.entities';
import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { syncNfts, walletState } from '../../store/slices/wallet.slice';
import { nftUpdateTrigger } from '../../app/App';
import NftFigure from './NftFigure';
import NftPage from './NftPage';
import ReceiveMoney from '../actions/ReceiveMoney';
import { isNullOrEmpty } from '../../utils/common.utils';

export default function Nfts() {
  const [selectedNft, setSelectedNft] = useState<NftEntity | false>(false);

  const dispatch = useAppDispatch();
  const wallet = useAppSelector(walletState);

  const mainAddr = wallet.keys.receiveKeys[wallet.keys.receiveKeys.length - 1]?.address ?? '';

  useEffect(() => {
    if (!wallet.syncNfts) {
      dispatch(syncNfts());
    }
    
  }, [wallet.tokensBalance, nftUpdateTrigger.updateTrigger]);

  const selectNft = (nft: NftEntity | false) => {
    setSelectedNft(nft);
  }

  if (wallet.fetchNfts) {
    return <div className="text-white center mt-3"><Spinner animation="border" size="sm"/> Loading...</div>
  }

  if (selectedNft) {
    return <NftPage nftEntity={selectedNft} keys={wallet.keys} back={() => selectNft(false)}/>
  }

  return (
    <>
      <Container className="text-white my-3">
        <Row>
          <Col className="xlarge bold px-0">NFTs{ !isNullOrEmpty(wallet.nfts) ? ` (${wallet.nfts.length})` : "" }</Col>
          <Col className="px-0 right"><ReceiveMoney address={mainAddr}/></Col>
        </Row>
      </Container>
      <div className="pt-3">
        { !isNullOrEmpty(wallet.nfts) ? (
          <>
          { wallet.syncNfts && <div className="text-white center"><Spinner animation="border" size="sm"/> Loading...</div> }
          { wallet.nfts.map((nft, i) => <NftFigure key={i} nftEntity={nft} tokenBalance={wallet.tokensBalance[nft.tokenIdHex]} onClick={() => selectNft(nft)}/>) }
          </>
        ) : (
          <Card bg="custom-card" className='text-white'>
            <Card.Body className="center">
              Nothing here...
            </Card.Body>
          </Card>
        )}
      </div>
    </>
  )
}

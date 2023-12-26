import { Card, Col, Container, Row } from 'react-bootstrap'
import { NftEntity } from '../../models/db.entities';
import { useEffect, useState } from 'react';
import { useAppSelector } from '../../store/hooks';
import { walletState } from '../../store/slices/wallet.slice';
import { nftUpdateTrigger } from '../../app/App';
import { dbProvider } from "../../app/App";
import NftFigure from './NftFigure';
import NftPage from './NftPage';
import ReceiveMoney from '../actions/ReceiveMoney';
import { isNullOrEmpty } from '../../utils/common.utils';

export default function Nfts() {
  const [nfts, setNfts] = useState<NftEntity[]>();
  const [selectedNft, setSelectedNft] = useState<NftEntity | false>(false);

  const wallet = useAppSelector(walletState);
  const mainAddr = wallet.keys.receiveKeys[wallet.keys.receiveKeys.length - 1]?.address ?? '';

  useEffect(() => {
    async function init() {
      let res = await dbProvider.getLocalNfts();
      setNfts(res);
    }

    init();
  }, [wallet.tokensBalance, nftUpdateTrigger.updateTrigger]);

  const selectNft = (nft: NftEntity | false) => {
    setSelectedNft(nft);
  }

  if (selectedNft) {
    return <NftPage nftEntity={selectedNft} keys={wallet.keys} back={() => selectNft(false)}/>
  }

  return (
    <>
      <Container className="text-white my-3">
        <Row>
          <Col className="xlarge bold px-0">NFTs</Col>
          <Col className="px-0 right"><ReceiveMoney address={mainAddr}/></Col>
        </Row>
      </Container>
      <div className="pt-2">
        { !isNullOrEmpty(nfts) ? (
          nfts!.map((nft, i) => <NftFigure key={i} nftEntity={nft} tokenBalance={wallet.tokensBalance[nft.tokenIdHex]} onClick={() => selectNft(nft)}/>)
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

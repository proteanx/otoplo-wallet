import { Button, Card, Col, Container, Row, Table } from "react-bootstrap";
import { TokenEntity } from "../../models/db.entities";
import { Balance } from "../../models/wallet.entities";
import { useAppSelector } from "../../store/hooks";
import { walletState } from "../../store/slices/wallet.slice";
import { isMobileScreen, parseAmountWithDecimals, truncateStringMiddle } from "../../utils/common.utils";
import dummy from '../../assets/img/token-icon-placeholder.svg';
import TxList from "../tx/TxList";
import ReceiveMoney from "../actions/ReceiveMoney";
import SendMoney from "../actions/SendMoney";
import TokenInfo from "./TokenInfo";

export default function TokenPage({ tokenEntity, tokenBalance, back }: { tokenEntity: TokenEntity, tokenBalance?: Balance, back: () => void }) {
  let isMobile = isMobileScreen();

  const wallet = useAppSelector(walletState);
  const mainAddr = wallet.keys.receiveKeys.at(-1)?.address ?? '';

  let amtStr = "0", pending = "0";
  if (tokenBalance) {
    amtStr = parseAmountWithDecimals(tokenBalance.confirmed, tokenEntity.decimals);
    pending = parseAmountWithDecimals(tokenBalance.unconfirmed, tokenEntity.decimals);
  }

  return (
    <>
      <Container className="text-white mt-3">
        <Row>
          <Col className="left p-0">
            <Button className="float-start" variant='outline-primary' onClick={back}><i className="fa-solid fa-circle-arrow-left"/></Button>
          </Col>
          <Col xs={8} className="flex-center">
            <img className="me-1" width={30} src={tokenEntity.iconUrl || dummy} alt=''/>
            <span className="bold larger">{tokenEntity.name || truncateStringMiddle(tokenEntity.token, isMobile ? 20 : 70)}</span>
          </Col>
          <Col className="right p-0">
            <TokenInfo tokenEntity={tokenEntity}/>
          </Col>
        </Row>
      </Container>
      <Card bg="custom-card" className='text-white mt-3'>
        <Card.Body>
          <Row>
            <Col className='center'>
              <Card.Title>
                <div className='larger'>
                  {amtStr} {tokenEntity.ticker}
                </div>
              </Card.Title>
              { pending != "0" && 
                <div className="my-2">
                  <i title='Pending' className="fa-regular fa-clock nx"/> {pending} {tokenEntity.ticker}
                </div>
              }
              <div className='pt-4'>
                <SendMoney balance={wallet.balance} keys={wallet.keys} isMobile={isMobile}/>
                <ReceiveMoney address={mainAddr} isMobile={isMobile}/>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      <TxList token={tokenEntity}/>
    </>
  )
}

import { Col, Container, Row } from "react-bootstrap";
import TokenRow from "./TokenRow";
import { useAppSelector } from "../../store/hooks";
import { walletState } from "../../store/slices/wallet.slice";
import { useEffect, useState } from "react";
import { TokenEntity } from "../../models/db.entities";
import { dbProvider } from "../../providers/db.provider";
import TokenImport from "./TokenImport";
import { tokenUpdateTrigger } from "../../app/App";
import TokenPage from "./TokenPage";

export default function Tokens() {
  const [tokens, setTokens] = useState<TokenEntity[]>();
  const [selectedToken, setSelectedToken] = useState<TokenEntity | false>(false);

  const wallet = useAppSelector(walletState);

  useEffect(() => {
    dbProvider.getLocalTokens().then(res => {
      setTokens(res);
    });
  }, [wallet.tokensBalance, tokenUpdateTrigger.updateTrigger]);

  const selectToken = (t: TokenEntity | false) => {
    setSelectedToken(t);
  }

  if (selectedToken) {
    return <TokenPage tokenEntity={selectedToken} tokenBalance={wallet.tokensBalance[selectedToken.tokenIdHex]} back={() => selectToken(false)}/>
  }

  return (
    <>
      <Container className="text-white my-3">
        <Row>
          <Col className="xlarge bold">Tokens</Col>
          <Col className="right">
            <TokenImport />
          </Col>
        </Row>
      </Container>
      <div className="pt-2">
        { tokens?.map((t, i) => <TokenRow key={i} tokenEntity={t} tokenBalance={wallet.tokensBalance[t.tokenIdHex]} onClick={() => selectToken(t)}/>) }
      </div>
    </>
  )
}

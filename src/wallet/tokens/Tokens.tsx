import { Button, Col, Container, Dropdown, Form, Row } from "react-bootstrap";
import TokenRow from "./TokenRow";
import { useAppSelector } from "../../store/hooks";
import { walletState } from "../../store/slices/wallet.slice";
import { ChangeEvent, useEffect, useState } from "react";
import { TokenEntity } from "../../models/db.entities";
import { dbProvider } from "../../providers/db.provider";
import TokenImport from "./TokenImport";
import { tokenUpdateTrigger } from "../../app/App";
import TokenPage from "./TokenPage";
import StorageProvider from "../../providers/storage.provider";
import TokensOptions from "./TokensOptions";

export default function Tokens() {
  const [tokens, setTokens] = useState<TokenEntity[]>();
  const [selectedToken, setSelectedToken] = useState<TokenEntity | false>(false);
  const [hideZero, setHideZero] = useState(false);

  const wallet = useAppSelector(walletState);

  useEffect(() => {
    async function loadTokens() {
      let res = await dbProvider.getLocalTokens();
      let hide = await StorageProvider.getHideZeroTokenConfig();

      setHideZero(hide);
      setTokens(res);
    }

    loadTokens();
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
          <Col className="xlarge bold px-0">Tokens</Col>
          <Col className="right px-0">
            <TokenImport />
            <TokensOptions hideZero={hideZero} setHideZero={setHideZero} tokensBalance={wallet.tokensBalance}/>
          </Col>
        </Row>
      </Container>
      <div className="pt-2">
        { tokens?.map((t, i) => <TokenRow key={i} hideZero={hideZero} tokenEntity={t} tokenBalance={wallet.tokensBalance[t.tokenIdHex]} onClick={() => selectToken(t)}/>) }
      </div>
    </>
  )
}

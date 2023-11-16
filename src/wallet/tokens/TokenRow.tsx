import { Card, Table } from "react-bootstrap";
import { TokenEntity } from "../../models/db.entities";
import dummy from '../../assets/img/token-icon-placeholder.svg';
import { isMobileScreen, parseAmountWithDecimals, truncateStringMiddle } from "../../utils/common.utils";
import { Balance } from "../../models/wallet.entities";

export default function TokenRow({ hideZero, tokenEntity, tokenBalance, onClick }: { hideZero: boolean, tokenEntity: TokenEntity, tokenBalance?: Balance, onClick: () => void }) {
  let isMobile = isMobileScreen();

  let amtStr = "0";
  if (tokenBalance) {
    let amount = BigInt(tokenBalance.confirmed) + BigInt(tokenBalance.unconfirmed);
    amtStr = parseAmountWithDecimals(amount, tokenEntity.decimals);
  }

  if (hideZero && amtStr == "0") {
    return;
  }

  return (
    <Card bg="custom-card" className='token-card text-white mb-1'>
      <Card.Body className="py-1" onClick={onClick}>
        <Table borderless responsive variant='dark' className="mb-0">
          <tbody>
            <tr>
              <td className='center va td-min'>
                <img width={25} src={tokenEntity.iconUrl || dummy} onError={e => {
                    e.currentTarget.src = dummy;
                }}/>
              </td>
              <td className='va'>
                <div>{ tokenEntity.name || truncateStringMiddle(tokenEntity.token, isMobile ? 15 : 40)}</div>
                <div className="smaller light-txt">{ tokenEntity.ticker || truncateStringMiddle(tokenEntity.tokenIdHex, isMobile ? 15 : 40) }</div>
              </td>
              <td className='right va smaller'>
                {amtStr}
              </td>
            </tr>
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  )
}

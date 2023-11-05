import { Card, Table } from "react-bootstrap";
import { TokenEntity } from "../../models/db.entities";
import dummy from '../../assets/img/token-icon-placeholder.svg';
import { parseAmountWithDecimals, truncateStringMiddle } from "../../utils/common.utils";
import { Balance } from "../../models/wallet.entities";

export default function TokenRow({ tokenEntity, tokenBalance, onClick }: { tokenEntity: TokenEntity, tokenBalance?: Balance, onClick: () => void }) {

  let amtStr = "0";
  if (tokenBalance) {
    let amount = BigInt(tokenBalance.confirmed) + BigInt(tokenBalance.unconfirmed);
    amtStr = parseAmountWithDecimals(amount, tokenEntity.decimals);
  }

  return (
    <Card bg="custom-card" className='token-card text-white mb-1'>
      <Card.Body onClick={onClick}>
        <Table borderless responsive variant='dark' className="mb-0">
          <tbody>
            <tr>
              <td className='center va td-min'>
                <img width={25} src={tokenEntity.iconUrl || dummy} onError={e => {
                    e.currentTarget.src = dummy;
                }}/>
              </td>
              <td className='va'>
                {tokenEntity.name || tokenEntity.ticker || truncateStringMiddle(tokenEntity.token, 40)}
              </td>
              <td className='right va smaller'>
                {amtStr} {tokenEntity.ticker}
              </td>
            </tr>
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  )
}

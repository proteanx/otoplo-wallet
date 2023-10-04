import bigDecimal from 'js-big-decimal';
import Confirmation from './Confirmation';
import { TransactionEntity } from '../../models/db.entities';
import { isMobileScreen } from '../../utils/common.utils';

export default function TxRecord({ record, height }: { record: TransactionEntity, height: number }) {
  let isMobile = isMobileScreen();

  const date = new Date(record.time * 1000).toLocaleDateString();
  const time = new Date(record.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  
  var amount = new bigDecimal(record.value);
  let incoming = record.state == 'incoming';
  if (!incoming) {
    amount = amount.add(new bigDecimal(record.fee));
  }
  amount = amount.divide(new bigDecimal(100), 2);
  let type = record.state == 'both' ? <i className="fa fa-repeat"/> : (incoming ? <i className="fa fa-download"/> : <i className="fa fa-upload"/>)

  return (
    <tr className='tr-border'>
      <td className='center va td-min'>
        <Confirmation record={record} height={height}/>
      </td>
      <td className='va center'>{type}</td>
      <td className='va' style={isMobile ? {} : {wordBreak: 'break-all'}}>
        <div className='url' ><a href={"https://explorer.nexa.org/tx/"  + record.txIdem} target='_blank'>{record.txIdem}</a></div>
        <div>{(incoming ? '' : "Sent to: ") + record.payTo}</div>
      </td>
      <td className='va right' style={{whiteSpace: 'nowrap'}}>
        <div className={incoming ? '' : 'outgoing'}>
          <b>{incoming ? '' : '-'}{amount.getPrettyValue()} NEXA</b>
        </div>
        <div>{date + " " + time}</div>
      </td>
    </tr>
  )
}
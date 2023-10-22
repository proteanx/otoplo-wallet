import Confirmation from './Confirmation';
import { TransactionEntity } from '../../models/db.entities';
import { copy, isMobileScreen, parseAmountWithDecimals, truncateStringMiddle } from '../../utils/common.utils';
import { ReactElement, useState } from 'react';
import { Offcanvas } from 'react-bootstrap';
import { Flip } from 'react-toastify';

export default function TxRecord({ record, height }: { record: TransactionEntity, height: number }) {
  let isMobile = isMobileScreen();

  const [showDetails, setShowDetails] = useState(false);

  const date = new Date(record.time * 1000).toLocaleDateString();
  const time = new Date(record.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  
  var amount: bigint | string = BigInt(record.value);
  let incoming = record.state == 'incoming';
  if (!incoming) {
    amount += BigInt(record.fee);
  }
  amount = parseAmountWithDecimals(amount, 2);
  let amountClass = incoming ? '' : 'outgoing';
  let amountTxt = `${incoming ? '' : '-'}${amount} NEXA`;

  let type = record.state == 'both' ? <i className="fa fa-repeat"/> : (incoming ? <i className="fa fa-download"/> : <i className="fa fa-upload"/>)
  let typeTxt = record.height == 0 ? 'Pending' : (incoming ? 'Received' : (record.state == 'both' ? 'Sent to yourself' : 'Sent'));

  let status: ReactElement;
  if (record.height == 0) {
    status = <span className='outgoing'>Unconfirmed</span>;
  } else {
    status = <span className='confirmed'>Confirmed ({height - record.height})</span>;
  }

  return (
    <>
      <tr className={isMobile ? 'tr-border mobile-tx-row' : 'tr-border'} onClick={() => setShowDetails(true)}>
        { isMobile || 
          <td className='center va td-min'>
            <Confirmation record={record} height={height}/>
          </td> 
        }
        <td className='va center'>{type}</td>
        { isMobile ? (
          <td className='va'>
            {typeTxt}
          </td>
        ) : (
          <td className='va' style={{wordBreak: 'break-all'}}>
            <div className='url' ><a href={"https://explorer.nexa.org/tx/"  + record.txIdem} target='_blank'>{record.txIdem}</a></div>
            <div>{(incoming ? '' : "Sent to: ") + record.payTo}</div>
          </td>
        )}
        <td className='va right' style={{whiteSpace: 'nowrap'}}>
          <div className={amountClass}>
            <b>{amountTxt}</b>
          </div>
          <div className='small'>{date + " " + time}</div>
        </td>
      </tr>

      <Offcanvas data-bs-theme='dark' show={showDetails} placement='end' onHide={() => setShowDetails(false)}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title/>
        </Offcanvas.Header>
        <div className='center mt-4'>
          <div>{type}</div>
          <div className='smaller bold'>{typeTxt}</div>
          <div className={amountClass + ' bold larger'}>{amountTxt}</div>
          <div className='smaller url'>
            <a href={"https://explorer.nexa.org/tx/"  + record.txIdem} target='_blank'>Show in explorer <i className="va fa-solid fa-arrow-up-right-from-square fa-xs"/></a>
          </div>
        </div>
        <hr/>
        <div className='mx-4 small'>
          <div className='mb-4'>
            <span className='text-white bold'>Amount</span>
            <span className='float-right'>{parseAmountWithDecimals(record.value, 2)} NEXA</span>
          </div>
          <div className='mb-4'>
            <span className='text-white bold'>Fee</span>
            <span className='float-right'>{parseAmountWithDecimals(record.fee, 2)} NEXA</span>
          </div>
          <div className='mb-4'>
            <span className='text-white bold'>Status</span>
            <span className='float-right'>{status}</span>
          </div>
          <div>
            <span className='text-white bold'>Date</span>
            <span className='float-right'>{date + " " + time}</span>
          </div>
        </div>
        <hr/>
        <div className='mx-4 small'>
          <div className='mb-4'>
            <span className='text-white bold'>Tx IDEM</span>
            <span className='float-right smaller'>
              {truncateStringMiddle(record.txIdem, 40)}
              <i className="fa-regular fa-copy ms-1 cursor nx" aria-hidden="true" title='copy' onClick={() => copy(record.txIdem, 'bottom-right', Flip)}/>
            </span>
          </div>
          <div className='mb-4'>
            <span className='text-white bold'>Pay To</span>
            <span className='float-right smaller'>
              {truncateStringMiddle(record.payTo, 40)}
              <i className="fa-regular fa-copy ms-1 cursor nx" aria-hidden="true" title='copy' onClick={() => copy(record.payTo, 'bottom-right', Flip)}/>
            </span>
          </div>
        </div>
      </Offcanvas>
    </>
  )
}
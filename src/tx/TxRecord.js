import bigDecimal from 'js-big-decimal';
import React, { useState } from 'react';
import Confirmation from './Confirmation';

export default function TxRecord({record, height}) {
  const [width] = useState(window.innerWidth);
  const isMobile = (width <= 768);

  const date = new Date(record.time * 1000).toLocaleDateString();
  const time = new Date(record.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  
  var amount = new bigDecimal(record.value).getPrettyValue();
  var incoming = record.value > 0;
  var type = record.address.includes('yourself') ? <i className="fa fa-repeat"/> : (incoming ? <i className="fa fa-download"/> : <i className="fa fa-upload"/>)

  return (
    <tr className='tr-border'>
      <td className='center va td-min'>
        <Confirmation record={record} height={height}/>
      </td>
      <td className='center va'>{type}</td>
      <td style={isMobile ? {} : {wordBreak: 'break-all'}}>
        {date + " " + time}
        <br/>
        {record.txIdem}
        <br/>
        {(incoming ? '' : "Sent to: ") + record.address}
      </td>
      <td className='va center' style={{whiteSpace: 'nowrap'}}>
        <span className={incoming ? 'incoming' : 'outgoing'}>
          {incoming ? '+' : ''}{amount} NEXA
        </span>
      </td>
    </tr>
  )
}
import React from 'react';
//import { buildStyles, CircularProgressbar } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";


export default function Confirmation({record, height}) {

  if (record.height === undefined) { //backward compatability
    return (
      record.confirmed ? <i title='confirmed' className="mx-1 fa fa-check nx"/> : <i title='unconfirmed' className="mx-1 fa-regular fa-clock nx"/>
    )
  }

  if (record.height === 0) {
    return (
      <i title='unconfirmed' className="mx-1 fa-regular fa-clock nx"/>
    )
  }

  var confirmations = height - record.height + 1;

  if (confirmations >= 6) {
    return (
      <i title='6+ confirmations' className="mx-1 fa fa-check nx"/>
    )
  }

  return (
    <i title={confirmations + " confirmations"} className="mx-1 fa fa-check nx"/>
  )

  // return (
  //   <div className='mx-1' style={{ width: 18, height: 18 }} title={confirmations + "/6 confirmations"}>
  //     <CircularProgressbar className='mb-1'
  //       value={confirmations} minValue={0} maxValue={6} strokeWidth={10} text={confirmations}
  //       styles={buildStyles({
  //         strokeLinecap: "butt", pathColor: "#fcd34d", trailColor: "black", textColor: "#fcd34d", textSize: '50px',
  //       })} 
  //     />
  //   </div>
  // )
}

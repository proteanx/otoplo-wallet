import { TransactionEntity } from '../../models/db.entities';

export default function Confirmation({record, height}: { record: TransactionEntity, height: number }) {

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
}

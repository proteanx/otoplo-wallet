import { ListGroup, Spinner } from "react-bootstrap";
import { currentTimestamp, isMobilePlatform, isNullOrEmpty, parseAmountWithDecimals, showToast } from "../../utils/common.utils";
import { useState } from "react";
import { dbProvider } from "../../app/App";
import { TxTokenType } from "../../utils/wallet.utils";

export default function TxExport() {
  // currently support only on desktop
  if (isMobilePlatform()) {
    return;
  }

  const [loading, setLoading] = useState(false);

  const exportTxs = async () => {
    setLoading(true);
    try {
      let txs = await dbProvider.getLocalTransactions();
      if (isNullOrEmpty(txs)) {
        return;
      }

      let csvArr = ["Date,Type,Address,Amount (NEXA),ID"];
      for (let tx of txs!) {
        let amt = 0;
        if (tx.txGroupType != TxTokenType.NO_GROUP) {
          amt = tx.state == 'incoming' ? 0 : -1*tx.fee;
        } else {
          amt = tx.state == 'incoming' ? parseInt(tx.value) : -1*(parseInt(tx.value) + tx.fee);
        }
        let line = `${new Date(tx.time*1000).toISOString()},${tx.state == 'incoming' ? 'IN' : tx.state == 'outgoing' ? 'OUT' : 'FEES'},${tx.payTo},${parseAmountWithDecimals(amt, 2).replaceAll(",", "")},${tx.txIdem}`;
        csvArr.push(line);
      }

      let csvData = Buffer.from(csvArr.join('\n'), 'utf-8');
      let success = await window.electronAPI.exportFile(csvData, `otoplo_nexa_transactions_${currentTimestamp()}.csv`);
      if (success) {
        showToast('success', 'Transactions CSV Saved!');
      }
    } catch (e) {
      console.log(e);
      showToast('error', 'Failed to export Transactions', {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <ListGroup.Item action={!loading} onClick={exportTxs}>
      <div>Export Transactions to CSV</div>
      { loading && <div className="mt-1"><Spinner animation="grow"/></div> }
    </ListGroup.Item>
  )
}

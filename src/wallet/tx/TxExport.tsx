import { ListGroup, Spinner } from "react-bootstrap";
import { currentTimestamp, isMobilePlatform, isNullOrEmpty, parseAmountWithDecimals } from "../../utils/common.utils";
import { useState } from "react";
import { dbProvider } from "../../app/App";
import { TxTokenType } from "../../utils/wallet.utils";
import { Encoding } from "@capacitor/filesystem";
import { exportFile, FileProps } from "../../utils/file.utils";
import ExportFile from "../actions/ExportFile";

export default function TxExport({ hideMenu }: { hideMenu: () => void;  }) {

  const [loading, setLoading] = useState(false);
  const [fileProps, setFileProps] = useState<FileProps>();
  const [showExport, setShowExport] = useState(false);

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

      let file: FileProps = {
        type: "Transactions CSV",
        dir: "",
        name: `otoplo_transactions_${currentTimestamp()}.csv`,
        content: csvArr.join('\n'),
        encoding: Encoding.UTF8
      }

      if (isMobilePlatform()) {
        setFileProps(file);
        setShowExport(true);
      } else {
        let success = await exportFile(file);
        if (success) {
          hideMenu();
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ListGroup.Item action={!loading} onClick={exportTxs}>
        <div>Export Transactions to CSV</div>
        { loading && <div className="mt-1"><Spinner animation="grow"/></div> }
      </ListGroup.Item>
      <ExportFile show={showExport} close={() => setShowExport(false)} file={fileProps}/>
    </>
  )
}

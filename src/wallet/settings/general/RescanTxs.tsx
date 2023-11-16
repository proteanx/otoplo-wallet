import { useState } from "react";
import { Button } from "react-bootstrap";
import ConfirmDialog from "../../misc/ConfirmDialog";
import StorageProvider from "../../../providers/storage.provider";
import { dbProvider } from "../../../app/App";
import { showToast } from "../../../utils/common.utils";
import { useAppDispatch } from "../../../store/hooks";
import { setSync } from "../../../store/slices/wallet.slice";

export default function RescanTxs() {
  const [showDialog, setShowDialog] = useState(false);

  const dispatch = useAppDispatch();

  const confirm = async () => {
    try {
      await dbProvider.clearLocalTransactions();
      await StorageProvider.setTransactionsState({ height: 0 });
      dispatch(setSync());
      showToast("success", "Transactions cleared");
    } catch {
      showToast("error", "Failed to clear transactions");
    } finally {
      setShowDialog(false);
    }
  }

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>Rescan</Button>

      <ConfirmDialog title="Rescan transactions" show={showDialog} onCancel={() => setShowDialog(false)} onConfirm={confirm}>
        Transaction data will be removed. It will take few minutes to complete the rescan operation.
      </ConfirmDialog>
    </>
  )
}

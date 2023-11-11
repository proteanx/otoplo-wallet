import { Button } from 'react-bootstrap'
import ConfirmDialog from '../../misc/ConfirmDialog'
import { showToast } from '../../../utils/common.utils';
import { useState } from 'react';
import StorageProvider from '../../../providers/storage.provider';

export default function WalletReset() {
  const [showDialog, setShowDialog] = useState(false);

  const confirm = async () => {
    try {
      await StorageProvider.setVersionCode("0");
      window.location.reload();
    } catch {
      showToast("error", "Failed to reset data");
    } finally {
      setShowDialog(false);
    }
  }

  return (
    <>
      <Button variant='danger' onClick={() => setShowDialog(true)}>Reset</Button>

      <ConfirmDialog title="Reset data" show={showDialog} onCancel={() => setShowDialog(false)} onConfirm={confirm}>
        <div>The wallet data will be removed from device.</div>
        <div className="light-txt smaller">* After confirmation you will be redirected to home page to login again.</div>
      </ConfirmDialog>
    </>
  )
}

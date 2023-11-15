import { ReactElement, useState } from 'react';
import { Alert, Button, Modal, Spinner } from 'react-bootstrap';
import HDPrivateKey from 'nexcore-lib/types/lib/hdprivatekey';
import { WalletKeys } from '../../models/wallet.entities';
import { dbProvider } from '../../app/App';
import { discoverVaults, saveHodlAddress } from '../../utils/vault.utils';
import StorageProvider from '../../providers/storage.provider';

interface RecoverVaultProps {
  vaultAccountKey: HDPrivateKey;
  keys: WalletKeys;
  refreshVaults: () => Promise<void>;
}

export default function RecoverVault({ vaultAccountKey, keys, refreshVaults }: RecoverVaultProps) {
  const [showRecoverDialog, setShowRecoverDialog] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState("");
  const [spinner, setSpinner] = useState<ReactElement | string>("");

  const cancelRecoverDialog = () => {
    setRecoverMsg("");
    setSpinner("");
    setShowRecoverDialog(false);
  }

  const recover = async () => {
    if (StorageProvider.setLock(StorageProvider.VAULT_SCAN_LOCK)) {
      setSpinner(<Spinner animation="border" size="sm"/>);

      try {
        let rAddrs = keys.receiveKeys.map(k => k.address);
        let cAddrs = keys.changeKeys.map(k => k.address);
        let res = await discoverVaults(rAddrs.concat(cAddrs), vaultAccountKey);
        var loaded = false;
        console.log("bs");
        var hodls = (await dbProvider.getAllVaultsAddresses()) ?? [];
        for (const v of res.vaults) {
          if (!hodls.includes(v) && (await saveHodlAddress(res.index, v))) {
            loaded = true;
          }
        }

        if (loaded) {
          refreshVaults();
        }
        setRecoverMsg(loaded ? "Vaults found. will be loaded in few moments, you can close this window." : "No Vaults found.");
      } catch (e: any) {
        setRecoverMsg("Failed to scan for vaults. " + (e instanceof Error ? e.message : "Make sure the wallet is online."));
      } finally {
        StorageProvider.removeLock(StorageProvider.VAULT_SCAN_LOCK);
        setSpinner("");
      }
    }
  }

  return (
    <>
      <Button className='mx-2' variant="outline-primary" onClick={() => setShowRecoverDialog(true)}>Recover</Button>

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showRecoverDialog} onHide={cancelRecoverDialog} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton={spinner === ""}>
          <Modal.Title>Recover Vault</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-2">
            If you have vaults that does not appear, first try to check in Archive. If not there too, you can start scanning process and let the wallet scan for vaults.
          </div>
          <div className='mb-2'>
            {spinner !== "" ? <b>Scanning... This process might take few minutes, do not close this window!</b> : "" }
          </div>
          <Alert show={recoverMsg !== ""} variant={recoverMsg.includes("Failed") ? "danger" : "success"}>
            {recoverMsg}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          { 
            recoverMsg === '' 
              ? <Button disabled={spinner !== ""} onClick={recover}>{spinner !== "" ? spinner : "Start Scan"}</Button> 
              : <Button variant="secondary" onClick={cancelRecoverDialog}>Close</Button>
          }
        </Modal.Footer>
      </Modal>
    </>
  )
}

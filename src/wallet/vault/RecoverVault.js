import React, { useState } from 'react';
import { Alert, Button, Modal, Spinner } from 'react-bootstrap';
import { getAllVaultsAddresses, removeLock, setLock } from '../../utils/localdb';
import { discoverVaults, saveHodlAddress } from '../../utils/vaultUtils';
import { Script } from 'nexcore-lib';

export default function RecoverVault({ vaultAccountKey, keys, refreshVaults }) {
  const [showRecoverDialog, setShowRecoverDialog] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState("");
  const [spinner, setSpinner] = useState("");

  const cancelRecoverDialog = () => {
    setRecoverMsg("");
    setSpinner("");
    setShowRecoverDialog(false);
  }

  const recover = async () => {
    if (setLock("vault-scan")) {
      setSpinner(<Spinner animation="border" size="sm"/>);
      var rAddrs = keys.receiveKeys.map(k => ({address: k.address, hex: Script.fromAddress(k.address).toHex()}));
      var cAddrs = keys.changeKeys.map(k => ({address: k.address, hex: Script.fromAddress(k.address).toHex()}));

      try {
        var res = await discoverVaults(rAddrs, cAddrs, vaultAccountKey);
        var loaded = false;
        console.log("bs");
        var hodls = await getAllVaultsAddresses();
        for (const v of res.vaults) {
          if (!hodls.includes(v) && (await saveHodlAddress(res.index, v))) {
            loaded = true;
          }
        }

        if (loaded) {
          refreshVaults();
        }
        setRecoverMsg(loaded ? "Vaults found. will be loaded in few moments, you can close this window." : "No Vaults found.");
      } catch (e) {
        setRecoverMsg("Failed to scan for vaults. " + (!e.response ? "Make sure the wallet is online." : e.response.data));
      } finally {
        removeLock("vault-scan");
        setSpinner("");
      }
    }
  }

  return (
    <>
      <Button className='mx-2' variant="outline-primary" onClick={() => setShowRecoverDialog(true)}>Recover</Button>

      <Modal show={showRecoverDialog} onHide={cancelRecoverDialog} backdrop="static" keyboard={false} aria-labelledby="contained-modal-title-vcenter" centered>
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

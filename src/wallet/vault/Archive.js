import React, { useEffect, useState } from 'react';
import { Button, Card, Modal, Table } from 'react-bootstrap';
import { updateLocalVaultArchive } from '../../utils/localdb';
import { getHodlArchive } from '../../utils/vaultUtils';

export default function Archive({ setArchive, refreshVaults }) {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [vaultAddress, setVaultAddress] = useState("");
  const [vaults, setVaults] = useState([]);

  useEffect(() => {
    getHodlArchive().then(res => {
      setVaults(res);
    })
  }, []);

  const moveBack = (address) => {
    setVaultAddress(address);
    setShowArchiveDialog(true);
  }

  const moveToVault = async () => {
    await updateLocalVaultArchive(vaultAddress, 0);
    getHodlArchive().then(res => {
      setVaults(res);
    })
    refreshVaults();
    setShowArchiveDialog(false);
  }

  return (
    <>
      <Button className='mt-3' variant='outline-primary' onClick={() => setArchive(false)}><i className="me-1 fa-solid fa-circle-arrow-left"></i> Back to Vault</Button>

      <Card className='mt-3 text-white' bg="custom-card">
        <Card.Body>
          <Card.Title className='center'>Vault Archive</Card.Title>
          <hr/>
          <Table borderless responsive striped className='text-white'>
            <tbody>
              { vaults?.map((v, i) => 
                <tr className='tr-border va' key={i}>
                  <td>
                    {v}
                  </td>
                  <td>
                    <Button onClick={() => moveBack(v)}>Move to Vault</Button>
                  </td>
                </tr>
              ) }
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={showArchiveDialog} onHide={() => setShowArchiveDialog(false)} aria-labelledby="contained-modal-title-vcenter" centered>
        <Modal.Header closeButton>
          <Modal.Title>Move to Vault</Modal.Title>
        </Modal.Header>
        <Modal.Body className='center'>
          Are you sure you want to move the Vault: <div style={{wordBreak: 'break-all'}}><b>{vaultAddress}</b></div> from Archive to Vault?
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowArchiveDialog(false)}>Cancel</Button>
          <Button onClick={moveToVault}>Confirm</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

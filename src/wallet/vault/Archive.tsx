import React, { useEffect, useState } from 'react';
import { Button, Card, Table } from 'react-bootstrap';
import { getHodlArchive } from '../../utils/vault.utils';
import { dbProvider } from '../../app/App';
import ConfirmDialog from '../misc/ConfirmDialog';

export default function Archive({ setArchive, refreshVaults }: { setArchive: React.Dispatch<React.SetStateAction<boolean>>, refreshVaults: () => Promise<void> }) {
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [vaultAddress, setVaultAddress] = useState("");
  const [vaults, setVaults] = useState<string[]>([]);

  useEffect(() => {
    getHodlArchive().then(res => {
      if (res) {
        setVaults(res);
      }
    })
  }, []);

  const moveBack = (address: string) => {
    setVaultAddress(address);
    setShowArchiveDialog(true);
  }

  const moveToVault = async () => {
    await dbProvider.updateLocalVaultArchive(vaultAddress, false);
    getHodlArchive().then(res => {
      setVaults(res ?? []);
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
          <Table borderless responsive striped className='text-white' variant='dark'>
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

      <ConfirmDialog title='Move to Vault' show={showArchiveDialog} onCancel={() => setShowArchiveDialog(false)} onConfirm={moveToVault}>
        <div className='center'>
          Are you sure you want to move the Vault: <div style={{wordBreak: 'break-all'}}><b>{vaultAddress}</b></div> from Archive to Vault?
        </div>
      </ConfirmDialog>
    </>
  )
}

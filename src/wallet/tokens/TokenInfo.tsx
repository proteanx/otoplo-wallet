import { Button, Modal, Offcanvas } from "react-bootstrap";
import { TokenEntity } from "../../models/db.entities";
import { useState } from "react";
import dummy from '../../assets/img/token-icon-placeholder.svg';
import { copy, showToast, truncateStringMiddle } from "../../utils/common.utils";
import { Flip, toast } from "react-toastify";
import { rostrumProvider } from "../../providers/rostrum.provider";
import { ITokenGenesis } from "../../models/rostrum.entities";
import { dbProvider } from "../../providers/db.provider";

export default function TokenInfo({ tokenEntity, goBack }: { tokenEntity: TokenEntity, goBack: () => void }) {
  const [showInfo, setShowInfo] = useState(false);
  const [tokenGenesis, setTokenGenesis] = useState<ITokenGenesis>();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const showData = () => {
    if (!tokenGenesis) {
      rostrumProvider.getTokenGenesis(tokenEntity.token).then(res => {
        setTokenGenesis(res);
      });
    }
    setShowInfo(true);
  }

  const removeToken = async () => {
    try {
      await dbProvider.deleteToken(tokenEntity.tokenIdHex);
      showToast("success", "Token removed successfully");
      goBack();
    } catch {
      showToast("error", "Failed to remove token");
    } finally {
      setShowRemoveDialog(false);
    }
  }

  return (
    <>
      <Button variant='outline-primary' onClick={showData}><i className="fa-solid fa-circle-info"/></Button>

      <Offcanvas data-bs-theme='dark' show={showInfo} placement='end' onHide={() => setShowInfo(false)}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Token Info</Offcanvas.Title>
        </Offcanvas.Header>
        <div className='center mt-3'>
          <div><img className="me-1" width={30} src={tokenEntity.iconUrl || dummy} alt=''/></div>
          <div className='bold'>{tokenEntity.name || tokenEntity.token}</div>
        </div>
        <hr/>
        <div className='mx-4 small'>
          <div className='mb-4'>
            <span className='text-white bold'>Name</span>
            <span className='float-right'>{tokenEntity.name}</span>
          </div>
          <div className='mb-4'>
            <span className='text-white bold'>Ticker</span>
            <span className='float-right'>{tokenEntity.ticker}</span>
          </div>
          <div className='mb-4'>
            <span className='text-white bold'>Decimals</span>
            <span className='float-right'>{tokenEntity.decimals}</span>
          </div>
          <div>
            <span className='text-white bold'>Metadata</span>
            <span className='float-right'><a href={tokenGenesis?.document_url || ""} target="_blank">{truncateStringMiddle(tokenGenesis?.document_url, 40)}</a></span>
          </div>
        </div>
        <hr/>
        <div className='mx-4 small'>
          <div className='mb-4'>
            <span className='text-white bold'>Token ID</span>
            <span className='float-right smaller'>
              {truncateStringMiddle(tokenEntity.token, 40)}
              <i className="fa-regular fa-copy ms-1 cursor nx" aria-hidden="true" title='copy' onClick={() => copy(tokenEntity.token, 'bottom-right', Flip)}/>
            </span>
          </div>
          <div className='mb-4'>
            <span className='text-white bold'>Token Hex</span>
            <span className='float-right smaller'>
              {truncateStringMiddle(tokenEntity.tokenIdHex, 40)}
              <i className="fa-regular fa-copy ms-1 cursor nx" aria-hidden="true" title='copy' onClick={() => copy(tokenEntity.tokenIdHex, 'bottom-right', Flip)}/>
            </span>
          </div>
          <div>
            <span className='text-white bold'>Genesis TX</span>
            <span className='float-right smaller'>
              {truncateStringMiddle(tokenGenesis?.txidem, 40)}
              {tokenGenesis?.txidem && <a href={"https://explorer.nexa.org/tx/"  + tokenGenesis.txidem} target='_blank'><i className="fa-solid fa-arrow-up-right-from-square ms-1"/></a>}
            </span>
          </div>
        </div>
        <hr/>
        <div className='mx-4 center'>
          <Button variant='danger' onClick={() => setShowRemoveDialog(true)}><i className="fa-regular fa-trash-can"/> Remove from Wallet</Button>
        </div>
      </Offcanvas>

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showRemoveDialog} onHide={() => setShowRemoveDialog(false)} keyboard={false} centered>
        <Modal.Header closeButton>
          <Modal.Title>Remove token</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>Are you sure you want to remove '{tokenEntity.name || tokenEntity.token}' from your wallet?</div>
          <div className="light-txt smaller">* This will not affect your assets. tokens can always be added again.</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRemoveDialog(false)}>Cancel</Button>
          <Button onClick={removeToken}>Confirm</Button> 
        </Modal.Footer>
      </Modal>
    </>
  )
}

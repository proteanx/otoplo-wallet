import { Button, Offcanvas } from 'react-bootstrap'
import { NftEntity } from '../../models/db.entities'
import { useState } from 'react';
import { copy, truncateStringMiddle } from '../../utils/common.utils';
import { Flip } from 'react-toastify';
import { NftData } from './NftPage';

export default function NftInfo({ nftJson, nftEntity }: { nftJson: NftData, nftEntity: NftEntity }) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <Button variant='outline-primary' onClick={() => setShowInfo(true)}><i className="fa-solid fa-circle-info"/></Button>

      <Offcanvas data-bs-theme='dark' show={showInfo} placement='end' onHide={() => setShowInfo(false)}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>NFT Info</Offcanvas.Title>
        </Offcanvas.Header>
        <div className='center mt-3 bold'>
          {nftJson.title || nftEntity.token}
        </div>
        <hr/>
        <div className='mx-4 small'>
          <div className='mb-4'>
            <span className='text-white bold'>Name</span>
            <span className='float-right'>{nftJson.title}</span>
          </div>
          <div>
            <span className='text-white bold'>Series</span>
            <span className='float-right'>{nftJson.series}</span>
          </div>
        </div>
        <hr/>
        <div className='mx-4 small'>
          { nftEntity.parentGroup && 
            <div className='mb-4'>
              <span className='text-white bold'>Parent Group</span>
              <span className='float-right smaller'>
                {truncateStringMiddle(nftEntity.parentGroup, 40)}
                <i className="fa-regular fa-copy ms-1 cursor nx" aria-hidden="true" title='copy' onClick={() => copy(nftEntity.parentGroup, 'bottom-right', Flip)}/>
              </span>
            </div>
          }
          <div className='mb-4'>
            <span className='text-white bold'>Token ID</span>
            <span className='float-right smaller'>
              {truncateStringMiddle(nftEntity.token, 40)}
              <i className="fa-regular fa-copy ms-1 cursor nx" aria-hidden="true" title='copy' onClick={() => copy(nftEntity.token, 'bottom-right', Flip)}/>
            </span>
          </div>
          <div className='mb-4'>
            <span className='text-white bold'>Token Hex</span>
            <span className='float-right smaller'>
              {truncateStringMiddle(nftEntity.tokenIdHex, 40)}
              <i className="fa-regular fa-copy ms-1 cursor nx" aria-hidden="true" title='copy' onClick={() => copy(nftEntity.tokenIdHex, 'bottom-right', Flip)}/>
            </span>
          </div>
        </div>
      </Offcanvas>
    </>
  )
}

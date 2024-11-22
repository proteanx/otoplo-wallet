import React, { useEffect, useState } from 'react'
import { Modal, Spinner } from 'react-bootstrap'
import { useAppSelector } from '../store/hooks'
import { loaderState } from '../store/slices/loader.slice'

export default function Loader() {

  const loader = useAppSelector(loaderState);

  return (
    <Modal contentClassName="text-bg-dark" data-bs-theme='dark' dialogClassName='loader' show={loader.loading} centered backdrop="static" keyboard={false}>
      <Modal.Body>
        <Spinner animation="border" size={loader.text ? 'sm' : undefined} style={{color: "#FF1E6F"}}/>
        {loader.text && <span className='ms-2'>{loader.text}</span>}
      </Modal.Body>
    </Modal>
  )
}

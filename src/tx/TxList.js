import React, { useEffect, useState } from 'react'
import TxRecord from './TxRecord'
import Table from 'react-bootstrap/Table';
import Card from 'react-bootstrap/Card';
import Pagination from 'react-bootstrap/Pagination';
import { countLocalTransactions, getPageLocalTransactions } from '../utils/localdb';
import { txUpdateTrigger } from '../app/App';

export default function TxList({ heightVal }) {
  const [pageNum, setPageNum] = useState(1);
  const [pageSize] = useState(10);
  const [txCount, setTxCount] = useState(0);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    countLocalTransactions().then(c => {
      setTxCount(c);
    });
  }, [txUpdateTrigger.updateTrigger]);

  useEffect(() => {
    getPageLocalTransactions(pageNum, pageSize).then(res => {
      setTransactions(res);
    });
  }, [pageNum, pageSize, txUpdateTrigger.updateTrigger]);

  let pagination = "";
  let paginationItems = [];
  if (txCount) {
    var pages = Math.ceil(txCount / pageSize);
    if (pages > 1) {
      let start = 1;
      if (pageNum - 2 > 3) {
        paginationItems.push(
          <Pagination.Item key={1} onClick={() => setPageNum(1)}>
            {1}
          </Pagination.Item>
        )
        paginationItems.push(<Pagination.Ellipsis key={"e1"}/>);
        start = pageNum - 2;
      } 

      for (let i = start; i <= pageNum + 2 && i < pages; i++) {
        paginationItems.push(
          <Pagination.Item key={i} active={i === pageNum} onClick={() => setPageNum(i)}>
            {i}
          </Pagination.Item>
        )
        start = i+1;
      }

      if (pages - pageNum > 4) {
        paginationItems.push(<Pagination.Ellipsis key={"e2"}/>);
        start = pages;
      }

      for (let i = start; i <= pages; i++) {
        paginationItems.push(
          <Pagination.Item key={i} active={i === pageNum} onClick={() => setPageNum(i)}>
            {i}
          </Pagination.Item>
        )
      }

      pagination = <Pagination className='d-flex justify-content-center'>
                    <Pagination.First disabled={pageNum === 1} onClick={() => setPageNum(1)}/>
                    {paginationItems}
                    <Pagination.Last disabled={pageNum === pages} onClick={() => setPageNum(pages)}/>
                  </Pagination>
    }
  }

  return (
    <Card className='mt-3 text-white' bg="custom-card">
      <Card.Body>
        <Card.Title className='center'>Transactions ({txCount})</Card.Title>
        <hr/>
        <Table borderless responsive striped className='text-white'>
          <tbody>
            { transactions?.map((tx, i) => <TxRecord key={i} record={tx} height={heightVal}/>) }
          </tbody>
        </Table>
        {pagination}
      </Card.Body>
    </Card>
  )
}

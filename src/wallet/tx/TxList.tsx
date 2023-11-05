import { ReactElement, useEffect, useState } from 'react'
import TxRecord from './TxRecord'
import Table from 'react-bootstrap/Table';
import Card from 'react-bootstrap/Card';
import Pagination from 'react-bootstrap/Pagination';
import { txUpdateTrigger } from '../../app/App';
import { dbProvider } from '../../providers/db.provider';
import { TokenEntity, TransactionEntity } from '../../models/db.entities';
import { useAppSelector } from '../../store/hooks';
import { walletState } from '../../store/slices/wallet.slice';

export default function TxList({ token }: { token?: TokenEntity }) {
  const [pageNum, setPageNum] = useState(1);
  const [pageSize] = useState(10);
  const [txCount, setTxCount] = useState(0);
  const [transactions, setTransactions] = useState<TransactionEntity[]>([]);

  useEffect(() => {
    dbProvider.countLocalTransactions(token?.token).then(c => {
      setTxCount(c);
    });
  }, [txUpdateTrigger.updateTrigger]);

  useEffect(() => {
    dbProvider.getPageLocalTransactions(pageNum, pageSize, token?.token).then(res => {
      if (res) {
        setTransactions(res);
      }
    });
  }, [pageNum, pageSize, txUpdateTrigger.updateTrigger]);

  const wallet = useAppSelector(walletState);

  let pagination: string | ReactElement = "";
  let paginationItems: ReactElement[] = [];
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
        <Table borderless responsive variant='dark' className='text-white'>
          <tbody>
            { transactions?.map((tx, i) => <TxRecord key={i} record={tx} height={wallet.height} token={token}/>) }
          </tbody>
        </Table>
        {pagination}
      </Card.Body>
    </Card>
  )
}

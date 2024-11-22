import bigDecimal from 'js-big-decimal';
import { useAppSelector } from '../../store/hooks';
import { walletState } from '../../store/slices/wallet.slice';
import { getCurrencySymbol } from '../../utils/price.utils';

export default function PriceChange({ selectedCurrency, balance }: { selectedCurrency: string, balance: bigDecimal }) {

  const wallet = useAppSelector(walletState);
  const currencySymbol = getCurrencySymbol(selectedCurrency);

  let value = wallet.price[selectedCurrency.toLowerCase()].value.multiply(balance).round(2, bigDecimal.RoundingModes.HALF_DOWN).getPrettyValue();
  let change = wallet.price[selectedCurrency.toLowerCase()].change.round(1, bigDecimal.RoundingModes.HALF_UP);

  let isUp = change.compareTo(new bigDecimal(0)) > 0;
  let color = isUp ? '#32CA5B' : '#FF3A33';
  let icon = isUp ? <i className="ms-2 me-1 fa-solid fa-caret-up"/> : <i className="ms-2 me-1 fa-solid fa-caret-down"/>;

  return (
    <>
      <div>{currencySymbol}{value}</div>
      <div className='smaller mt-1'>
        <span style={{color: color}}>{icon}{change.abs().getValue()}%</span>
        <span style={{ color: 'rgb(156, 155, 155)' }}> Last 24h</span>
      </div>
    </>
  )
}

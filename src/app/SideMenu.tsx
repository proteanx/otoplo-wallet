import { Menu, MenuItem, Sidebar } from 'react-pro-sidebar';
import WalletBackup from '../wallet/WalletBackup';
import Footer from './Footer';
import { isMobileScreen } from '../utils/common.utils';
import nex from '../assets/img/nex.svg';
import otoplo from '../assets/img/otoplo-logo-white.svg';
import bigDecimal from 'js-big-decimal';
import { useAppSelector } from '../store/hooks';
import { walletState } from '../store/slices/wallet.slice';
import dummy from '../assets/img/token-icon-placeholder.svg';
import nft from '../assets/img/nft.svg';

interface SideMenuProps {
  activeItem: string;
  setActiveItem: (item: string) => void;
  sidebarToggled: boolean;
  setSidebarToggled: (toggle: boolean) => void;
}

export default function SideMenu({ activeItem, setActiveItem, sidebarToggled, setSidebarToggled }: SideMenuProps) {
  let isMobile = isMobileScreen();

  const reload = () => {
    window.location.reload();
  }

  const setItemAndCollapse = (item: string) => {
    setActiveItem(item);
    if (isMobile) {
      setSidebarToggled(false);
    }
  }

  const wallet = useAppSelector(walletState);

  return (
    <Sidebar width={isMobile ? '75%' : undefined} toggled={sidebarToggled} breakPoint={isMobile ? 'all' : undefined} rootStyles={{border: 'none'}} onBackdropClick={() => setSidebarToggled(false)}>
      <div className={isMobile ? 'pt-3' : 'pt-3 center'} style={isMobile ? {cursor: 'pointer', paddingLeft: '20px'} : {cursor: 'pointer'}}>
        {isMobile && <i className="fa-solid fa-bars menu-btn" onClick={() => setSidebarToggled(!sidebarToggled)}/> }
        <img alt="Nexa" src={otoplo} onClick={reload} className="header-image"/>
      </div>
      <hr/>
      <Menu className='mb-3'>
        <MenuItem active={activeItem === 'NEXA'} prefix={<img alt="Nexa" src={nex} width={20}/>} onClick={() => setItemAndCollapse("NEXA")}>My Wallet</MenuItem>
        {import.meta.env.VITE_IS_HODL_ACTIVE === "true" && <MenuItem active={activeItem === 'VAULT'} prefix={<i className="fa-solid fa-vault"></i>} onClick={() => setItemAndCollapse("VAULT")}>HODL Vault</MenuItem>}
        <WalletBackup/>
        <MenuItem prefix={<i className="fa fa-house-lock"></i>} onClick={reload}>Lock</MenuItem>
        <hr/>
        <MenuItem active={activeItem === 'TOKEN'} prefix={<img alt="Nexa" src={dummy} width={20}/>} onClick={() => setItemAndCollapse("TOKEN")}>My Tokens</MenuItem>
        <MenuItem active={activeItem === 'NFT'} prefix={<img alt="Nexa" src={nft} width={20}/>} onClick={() => setItemAndCollapse("NFT")}>My NFTs</MenuItem>
        <hr/>
        <MenuItem disabled suffix={wallet.height ? "Online" : "Offline"}>Status:</MenuItem>
        <MenuItem disabled suffix={"nexa"}>Network:</MenuItem>
        <MenuItem disabled suffix={import.meta.env.VITE_VERSION}>Version:</MenuItem>
        <MenuItem disabled suffix={new bigDecimal(wallet.height).getPrettyValue()}>Block Height:</MenuItem>
        <MenuItem disabled suffix={wallet.price.compareTo(new bigDecimal(0)) > 0 && wallet.price.getPrettyValue()}>NEXA/USDT:</MenuItem>
      </Menu>
      <Footer/>
    </Sidebar>
  )
}

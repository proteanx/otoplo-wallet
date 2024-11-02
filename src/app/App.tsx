import { useEffect, useState, Dispatch, SetStateAction } from 'react';
import Container from 'react-bootstrap/esm/Container';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import './App.css';
import Footer from './Footer';
import NavBar from './NavBar';
import Wallet from '../wallet/Wallet';
import CreateWallet from '../wallet/create/CreateWallet';
import OpenWallet from '../wallet/OpenWallet';
import RecoverWallet from '../wallet/RecoverWallet';
import { currentTimestamp, isMobilePlatform, isMobileScreen } from '../utils/common.utils';
import otoplo from '../assets/img/otoplo-logo-white.svg';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as MApp } from '@capacitor/app';
import SideMenu from './SideMenu';
import StorageProvider from '../providers/storage.provider';
import { DBProvider } from '../providers/db.provider';
import { clearLocalWallet } from '../utils/wallet.utils';
import { Spinner } from 'react-bootstrap';

// Singleton DBProvider
export let dbProvider: DBProvider;
// Existing Connections Store
export let existingConn: { setExistConn: Dispatch<SetStateAction<boolean>>; existConn: boolean; };

export let txUpdateTrigger: { setUpdateTrigger: Dispatch<SetStateAction<number>>; updateTrigger: number; };
export let tokenUpdateTrigger: { setUpdateTrigger: Dispatch<SetStateAction<number>>; updateTrigger: number; };
export let nftUpdateTrigger: { setUpdateTrigger: Dispatch<SetStateAction<number>>; updateTrigger: number; };

function App() {
  let isMobile = isMobileScreen();

  const [existConn, setExistConn] = useState(false);
  existingConn = {existConn: existConn, setExistConn: setExistConn};

  const [txsUpdateTrigger, setTxsUpdateTrigger] = useState(0);
  txUpdateTrigger = {updateTrigger: txsUpdateTrigger, setUpdateTrigger: setTxsUpdateTrigger};

  const [tokensUpdateTrigger, setTokensUpdateTrigger] = useState(0);
  tokenUpdateTrigger = {updateTrigger: tokensUpdateTrigger, setUpdateTrigger: setTokensUpdateTrigger};

  const [nftsUpdateTrigger, setNftsUpdateTrigger] = useState(0);
  nftUpdateTrigger = {updateTrigger: nftsUpdateTrigger, setUpdateTrigger: setNftsUpdateTrigger};

  const [dbProviderInstance] = useState(new DBProvider());
  dbProvider = dbProviderInstance;
  
  const [activeItem, setActiveItem] = useState('NEXA');

  const [encSeed, setEncSeed] = useState('');
  const [decSeed, setDecSeed] = useState('');
  const [create, setCreate] = useState(false);
  const [restore, setRestore] = useState(false);
  const [initLoad, setInitLoad] = useState(true);

  const [sidebarToggled, setSidebarToggled] = useState(!isMobile);

  const handleCreate = () => setCreate(true);
  const cancelCreate = () => setCreate(false);
  const handleRestore = () => setRestore(true);
  const cancelRestore = () => setRestore(false);

  const reload = () => {
    window.location.reload();
  }

  useEffect(() => {
    async function init() {
      let seed: string | null = null;
      try {
        seed = await StorageProvider.getEncryptedSeed();
      } finally {
        if (isMobilePlatform() && !existConn) {
          MApp.addListener("pause", () => {
            localStorage.setItem("pause", currentTimestamp()+"");
          });
          MApp.addListener("resume", () => {
            let pauseTime = localStorage.getItem("pause")
            if (pauseTime && parseInt(pauseTime) < (currentTimestamp() - 60)) {
              SplashScreen.show();
              localStorage.removeItem("pause");
              reload();
            }
          });

          try {
            let res = await dbProvider.initSchema();
            if (res) {
              setTimeout(() => {
                SplashScreen.hide();
              }, 1000);
            }
          } catch (e) {
            console.log(e)
          }
        }
        if (seed) {
          let code = await StorageProvider.getVersionCode();
          if (code !== "2") { 
            await clearLocalWallet();
            await StorageProvider.saveEncryptedSeed(seed);
            await StorageProvider.setVersionCode("2");
          }
          setEncSeed(seed);
        }
        setInitLoad(false);
      }
    }
    
    init();
  }, []);

  let content = <Card.Body>
                  <div className='mb-4'>
                    Welcome to Otoplo wallet for Nexa
                  </div>
                  { initLoad ? (
                    <div>
                      <Spinner animation="border"/>
                    </div>
                  ) : (
                    <div>
                      <Button variant="outline-primary" className='m-2' onClick={handleCreate}>Create Wallet</Button>
                      <Button variant="outline-primary" className='m-2' onClick={handleRestore}>Recover Wallet</Button>
                    </div>
                  )}
                </Card.Body>
                

  if (create) {
    content = <CreateWallet cancelCreate={cancelCreate} setDecSeed={setDecSeed}></CreateWallet>
  }

  if (restore) {
    content = <RecoverWallet cancelRecover={cancelRestore} setDecSeed={setDecSeed}></RecoverWallet>
  }

  if (decSeed === '' && encSeed !== '') {
    content = <OpenWallet encSeed={encSeed} setDecSeed={setDecSeed}></OpenWallet>
  }

  var unlocked = decSeed !== '';

  return (
    <>
      {unlocked || <NavBar/>}
      <div className='main-container' style={unlocked ? { display: 'flex', height: '100%'} : {}}>
        { unlocked &&
          <SideMenu activeItem={activeItem} setActiveItem={setActiveItem} sidebarToggled={sidebarToggled} setSidebarToggled={setSidebarToggled} />
        }
        <div style={{ width: '100%', overflowY: 'auto'}}>
          { isMobile && unlocked && 
            <div className='pt-3 pb-3' style={{cursor: 'pointer', paddingLeft: '20px', backgroundColor: '#282d33'}}>
              <i className="fa-solid fa-bars menu-btn" onClick={() => setSidebarToggled(!sidebarToggled)}/>
              <img alt="Nexa" src={otoplo} onClick={reload} className="header-image"/>
            </div> }
          <Container style={!isMobile ? {width: '95%'} : {}} className={isMobile && unlocked ? 'pb-4' : 'pb-4 pt-3'}>
            { unlocked ? (
              <Wallet seed={decSeed} item={activeItem}/> 
            ) : (
              <Card style={!isMobile ? {width: "50%"} : {}} bg="custom-card" className='text-white center'>
                {content}
              </Card>
            ) }
          </Container>
        </div>
      </div>
      {unlocked || <Footer/>}
    </>
  );
}

export default App;

import React, { useEffect, useState } from 'react';
import Container from 'react-bootstrap/esm/Container';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import './App.css';
import Footer from './Footer';
import NavBar from './NavBar';
import Wallet from '../wallet/Wallet';
import CreateWallet from '../wallet/create/CreateWallet';
import OpenWallet from '../wallet/OpenWallet';
import RecoverWallet from '../wallet/recover/RecoverWallet';
import { generateMasterKey, getBlockHeight, getNexaPrice, isMobilePlatform } from '../utils/functions';
import { Sidebar, Menu, MenuItem, SubMenu, useProSidebar } from 'react-pro-sidebar';
import nex from '../img/nex.svg';
import otoplo from '../img/otoplo-logo-white.svg'
import WalletBackup from '../wallet/WalletBackup';
import Donation from './Donation';
import bigDecimal from 'js-big-decimal';
import ImportToken from '../wallet/token/ImportToken';
import { fetchTokensData, getLocalTokens } from '../utils/tokensUtils';
import { useSQLite } from 'react-sqlite-hook';
import { SplashScreen } from '@capacitor/splash-screen';
import { getEncryptedSeed, initSchema } from '../utils/localdb';
import { App as MApp } from '@capacitor/app';
import { CloseButton } from 'react-bootstrap';
import { Dialog } from '@capacitor/dialog';

// Singleton SQLite Hook
export let sqlite;
// Existing Connections Store
export let existingConn;

export let txUpdateTrigger;

function App() {
  const [width] = useState(window.innerWidth);
  const isMobile = (width <= 768);

  const [existConn, setExistConn] = useState(false);
  existingConn = {existConn: existConn, setExistConn: setExistConn};

  const [updateTrigger, setUpdateTrigger] = useState(0);
  txUpdateTrigger = {updateTrigger: updateTrigger, setUpdateTrigger: setUpdateTrigger};

  const {echo, getPlatform, isConnection, createConnection, closeConnection,
          retrieveConnection, retrieveAllConnections, closeAllConnections,
          addUpgradeStatement, importFromJson, isJsonValid, copyFromAssets,
          checkConnectionsConsistency, isAvailable} = useSQLite();

  sqlite = {echo: echo, getPlatform: getPlatform,
            isConnection: isConnection,
            createConnection: createConnection,
            closeConnection: closeConnection,
            retrieveConnection: retrieveConnection,
            retrieveAllConnections: retrieveAllConnections,
            closeAllConnections: closeAllConnections,
            addUpgradeStatement: addUpgradeStatement,
            importFromJson: importFromJson,
            isJsonValid: isJsonValid,
            copyFromAssets: copyFromAssets,
            checkConnectionsConsistency: checkConnectionsConsistency,
            isAvailable: isAvailable};
  
  const [tokensList, setTokensList] = useState([]);
  const [activeItem, setActiveItem] = useState({token: 'NEXA'});

  const [encSeed, setEncSeed] = useState('');
  const [decSeed, setDecSeed] = useState('');
  const [create, setCreate] = useState(false);
  const [restore, setRestore] = useState(false);

  const [price, setPrice] = useState(new bigDecimal(0));
  const [height, setHeight] = useState("");
  const [heightVal, setHeightVal] = useState(0);
  const [tmpVal, setTmpVal] = useState(0);

  const [showTokenDialog, setShowTokenDialog] = useState(false);

  const { collapseSidebar, collapsed } = useProSidebar();

  const handleCreate = () => setCreate(true);
  const cancelCreate = () => setCreate(false);
  const handleRestore = () => setRestore(true);
  const cancelRestore = () => setRestore(false);

  const reload = () => {
    window.location.reload();
  }

  useEffect(() => {
    getEncryptedSeed().then(seed => {
      if (seed != null) {
        setEncSeed(seed);
      }
    }).finally(() => {
      if (isMobilePlatform() && !existConn) {
        MApp.addListener("pause", () => {
          localStorage.setItem("pause", Math.floor(Date.now() / 1000));
        })
        MApp.addListener("resume", () => {
          var pauseTime = localStorage.getItem("pause")
          if (pauseTime && parseInt(pauseTime) < (Math.floor(Date.now() / 1000) - 60)) {
            SplashScreen.show();
            localStorage.removeItem("pause");
            reload();
          }
        }).finally(() => {
          initSchema().then(res => {
            if (res) {
              setTimeout(() => {
                SplashScreen.hide();
              }, 1000)
            }
          });
        });
      }
    });

    const myInterval = setInterval(() => {
      setTmpVal((prevVal) => prevVal + 1);
    }, 30 * 1000);

    return () => clearInterval(myInterval);
  }, []);

  useEffect(() => {
    if (decSeed !== '') {
      getBlockHeight().then(res => {
        var h = parseInt(res);
        setHeightVal(h);
        setHeight(h.toLocaleString());
      }).catch(e => {
        setHeight("");
        console.log(e);
      });
  
      getNexaPrice().then(res => {
        setPrice(new bigDecimal(res));
      }).catch(_ => {
        setPrice(new bigDecimal(0));
      });
    }
  }, [tmpVal, decSeed]);

  // useEffect(() => {
  //   if (decSeed !== '') {
  //     buildItems();
  //   }
  // }, [decSeed]);

  const buildItems = () => {
    // var tokens = getLocalTokens();
    // if (tokens.length > 0) {
    //   fetchTokensData(tokens).then(res => {
    //     setTokensList(res);
    //   })
    // }
  }

  let content = <Card.Body>
                  <div className='mb-4'>
                    Welcome to Otoplo wallet for Nexa
                  </div>
                  <div>
                    <Button variant="outline-primary" className='m-2' onClick={handleCreate}>Create Wallet</Button>
                    <Button variant="outline-primary" className='m-2' onClick={handleRestore}>Recover Wallet</Button>
                  </div>
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

  var masterKey = '';
  var unlocked = false;
  let tokenMenuItems = [];
  if (decSeed !== '') {
    unlocked = true;
    masterKey = generateMasterKey(decSeed);
    //tokenMenuItems = buildTokensMenuItems();
  }

  function buildTokensMenuItems() {
    var tokenItems = [];

    tokensList.forEach((t, i) => {
      var tName = t.tokenInfo.name ? t.tokenInfo.name : t.tokenInfo.token;
      var tIcon = t.tokenInfo.icon ? <img src={t.tokenInfo.icon} width={18}/> : '';
      if (t.subgroups.length > 0) {
        let subTokens = [];
        subTokens.push(<MenuItem key={'0_'+i} title={tName} prefix={tIcon} active={activeItem.token === t.tokenInfo.token} onClick={() => setActiveItem(t.tokenInfo)}>{tName}</MenuItem>);
        t.subgroups.forEach((s, j) => {
          var subName = s.name ? s.name : s.token;
          var sIcon = s.icon ? <img src={s.icon} width={18}/> : '';
          subTokens.push(<MenuItem key={'1_'+j} title={subName} prefix={sIcon} active={activeItem.token === s.token} onClick={() => setActiveItem(s)}>{subName}</MenuItem>);
        });
        tokenItems.push(<SubMenu key={'s_'+i} title={tName} prefix={tIcon} label={tName}>{subTokens}</SubMenu>);
      } else {
        tokenItems.push(<MenuItem key={'0_'+i} title={tName} prefix={tIcon} active={activeItem.token === t.tokenInfo.token} onClick={() => setActiveItem(t.tokenInfo)}>{tName}</MenuItem>);
      }
    });
    
    return tokenItems;
  }

  const setItemAndCollapse = (item) => {
    setActiveItem(item);
    if (isMobile) {
      collapseSidebar(true);
    }
  }

  return (
    <>
      {unlocked || <NavBar/>}
      <div className='main-container' style={unlocked ? { display: 'flex', height: '100%'} : {}}>
        { unlocked &&
          <Sidebar collapsedWidth='0' transitionDuration={100} width={isMobile ? '100%' : undefined} defaultCollapsed={isMobile} rootStyles={{border: 'none'}} backgroundColor='#343a40'>
            <div className={isMobile ? 'pt-3' : 'pt-3 center'} style={isMobile ? {cursor: 'pointer', paddingLeft: '20px'} : {cursor: 'pointer'}}>
              {isMobile && <i className="fa-solid fa-bars menu-btn" onClick={() => collapseSidebar(!collapsed)}/> }
              <img alt="Nexa" src={otoplo} onClick={reload} className="header-image"/>
            </div>
            <hr/>
            <Menu className='mb-3'>
              {/* <SubMenu label={"My Assets"} defaultOpen>
                <MenuItem active={activeItem.token == 'NEXA'} prefix={<img alt="Nexa" src={nex} width={18}/>} onClick={() => setActiveItem({token: "NEXA"})}>Nexa</MenuItem>
                { tokenMenuItems }
                <MenuItem prefix={<i className="fa fa-square-plus"/>} onClick={() => setShowTokenDialog(true)}>Add Token</MenuItem>
                <ImportToken showDialog={showTokenDialog} setShowDialog={setShowTokenDialog} rebuildItems={buildItems}/>
              </SubMenu> */}
              <MenuItem active={activeItem.token === 'NEXA'} prefix={<img alt="Nexa" src={nex} width={20}/>} onClick={() => setItemAndCollapse({token: "NEXA"})}>My Wallet</MenuItem>
              {process.env.REACT_APP_IS_HODL_ACTIVE === "true" && <MenuItem active={activeItem.token === 'VAULT'} prefix={<i className="fa-solid fa-vault"></i>} onClick={() => setItemAndCollapse({token: "VAULT"})}>HODL Vault</MenuItem>}
              <WalletBackup/>
              <MenuItem prefix={<i className="fa fa-house-lock"></i>} onClick={reload}>Lock</MenuItem>
              <hr></hr>
              <MenuItem disabled suffix={height ? "Online" : "Offline"}>Status:</MenuItem>
              <MenuItem disabled suffix={"nexa"}>Network:</MenuItem>
              <MenuItem disabled suffix={process.env.REACT_APP_VERSION}>Version:</MenuItem>
              <MenuItem disabled suffix={height}>Block Height:</MenuItem>
              <MenuItem disabled suffix={price.compareTo(new bigDecimal(0)) > 0 && price.getPrettyValue()}>NEXA/USDT:</MenuItem>
            </Menu>
            <Footer/>
            <div className='center p-1'>
              <Donation/>
            </div>
          </Sidebar>
        }
        <div style={{ width: '100%', overflowY: 'auto'}}>
          { isMobile && unlocked && 
            <div className='pt-3 pb-3' style={{cursor: 'pointer', paddingLeft: '20px', backgroundColor: '#282d33'}}>
              <i className="fa-solid fa-bars menu-btn" onClick={() => collapseSidebar(!collapsed)}/>
              <img alt="Nexa" src={otoplo} onClick={reload} className="header-image"/>
            </div> }
          <Container style={!isMobile ? {width: '95%'} : {}} className={isMobile && unlocked ? 'pb-4' : 'pb-4 pt-3'}>
            { unlocked ? (
              <Wallet heightVal={heightVal} price={price} masterKey={masterKey} item={activeItem}/> 
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

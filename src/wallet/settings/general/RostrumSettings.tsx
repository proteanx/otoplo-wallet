import { Button, Form, Modal, Spinner } from "react-bootstrap";
import SettingsRow from "../SettingsRow";
import {  ChangeEvent, ReactNode, useEffect, useState } from "react";
import StorageProvider from "../../../providers/storage.provider";
import { RostrumProvider, rostrumProvider } from "../../../providers/rostrum.provider";
import { RostrumTransportScheme } from "../../../models/rostrum.entities";
import { isNullOrEmpty } from "../../../utils/common.utils";

export default function RostrumSettings() {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showResetBtn, setShowResetBtn] = useState(false);

  const [info, setInfo] = useState<ReactNode>('');
  const [scheme, setScheme] = useState('wss');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');

  const [spinner, setSpinner] = useState<ReactNode>("");
  const [errMsg, setErrMsg] = useState("");
  const [toMsg, setToMsg] = useState("");

  useEffect(() => {
    async function init() {
      let params = await StorageProvider.getRostrumParams();

      let status: ReactNode = <>- <span className="bad bold">OFFLINE</span></>;
      let latency = await rostrumProvider.getLatency();
      if (latency) {
        status = <>~ <span className="good">{latency}ms</span></>;
      }

      if (params.host.endsWith('otoplo.com')) {
        setInfo(<>Otoplo's instance {status}</>);
      } else {
        setInfo(<>{`${params.scheme}://${params.host}:${params.port}`} {status}</>);
        setShowResetBtn(true);
      }
    }

    init();
  }, []);

  const handleChangeScheme = (e: ChangeEvent<HTMLInputElement>) => {
    setErrMsg('');
    setScheme(e.target.name);
  };

  const handleChangeHost = (e: ChangeEvent<HTMLInputElement>) => {
    setErrMsg('');
    setHost(e.target.value);
  };

  const handleChangePort = (e: ChangeEvent<HTMLInputElement>) => {
    setErrMsg('');
    setPort(e.target.value);
  };

  const closeDialogs = () => {
    setHost('');
    setPort('');
    setScheme('wss');
    setErrMsg('');
    setToMsg('');
    setSpinner('');
    setShowEditDialog(false);
    setShowConfirmDialog(false);
  }

  const validateParams = async () => {
    let newRostrum: RostrumProvider | undefined = undefined;
    try {
      if (scheme !== 'ws' && scheme !== 'wss') {
        throw new Error("Scheme must be 'ws' or 'wss'");
      }
      if (isNullOrEmpty(host)) {
        throw new Error("Hostname not provided");
      }
      if (!/^\d+$/.test(port)) {
        throw new Error("Port is not valid");
      }
      
      setSpinner(<Spinner animation="border" size="sm"/>);
      try {
        newRostrum = new RostrumProvider();
        await newRostrum.connect({ host: host, port: parseInt(port), scheme: scheme });
      } catch {
        throw new Error('Unable to connect to new rostrum instance');
      }

      let version = await newRostrum.getVersion();
      let major = parseInt(version[0].split(' ')[1].split('.')[0]);
      if (major < 10) {
          throw new Error('The wallet must work with Rostum version 10 or higher');
      }

      setToMsg(`${scheme}://${host}:${port}`);
      setShowEditDialog(false);
      setShowConfirmDialog(true);
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'An error occured, try again later.');
    } finally {
      if (newRostrum) {
        let res = await newRostrum.disconnect(true);
        console.log(res);
      }
      setSpinner("");
    }
  }

  const resetParams = () => {
    setToMsg("Otoplo's instance (default)");
    setShowEditDialog(false);
    setShowConfirmDialog(true);
  }

  const saveEdit = async () => {
    if (toMsg.includes('default')) {
      await StorageProvider.removeRostrumParams();
    } else {
      await StorageProvider.saveRostrumParams({host: host, port: parseInt(port), scheme: (scheme as RostrumTransportScheme)});
    }
    window.location.reload();
  }

  return (
    <>
      <SettingsRow
        title="Rostrum Node"
        info={info}
        action={<Button onClick={() => setShowEditDialog(true)}>Edit</Button>}
      />

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showEditDialog} onHide={closeDialogs} centered>
        <Modal.Header closeButton>
          <Modal.Title>Rostrum Settings</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="me-3">Scheme:</Form.Label>
            <Form.Check inline label="wss" name="wss" type="radio" checked={scheme == 'wss'} onChange={handleChangeScheme}/>
            <Form.Check inline label="ws" name="ws" type="radio" checked={scheme == 'ws'} onChange={handleChangeScheme}/>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Hostname / IP</Form.Label>
            <Form.Control placeholder="electrum.nexa.org ..." value={host} onChange={handleChangeHost}/>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Port</Form.Label>
            <Form.Control type="number" placeholder="20004 ..." value={port} onChange={handleChangePort}/>
          </Form.Group>
          <span className='bad'>
            {errMsg}
          </span>
        </Modal.Body>

        <Modal.Footer>
          { showResetBtn && <Button variant="outline-primary" className="me-auto" disabled={spinner !== ""} onClick={resetParams}>Reset</Button> }
          <Button variant="secondary" onClick={closeDialogs}>Cancel</Button>
          <Button disabled={spinner !== ""} onClick={validateParams}>{spinner !== "" ? spinner : "Save"}</Button>
        </Modal.Footer>
      </Modal>

      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={showConfirmDialog} onHide={closeDialogs} backdrop="static" keyboard={false} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div>Rostrum instance will change to: {toMsg}</div>
          <div className="light-txt smaller">* After confirmation you will be redirected to home page to login again.</div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeDialogs}>Cancel</Button>
          <Button onClick={saveEdit}>Confirm</Button> 
        </Modal.Footer>
      </Modal>
    </>
  )
}

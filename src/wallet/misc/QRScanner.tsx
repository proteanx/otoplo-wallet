import { BarcodeFormat, BarcodeScanner, LensFacing } from "@capacitor-mlkit/barcode-scanning";
import { Dialog } from "@capacitor/dialog";
import { QrScanner } from "@yudiel/react-qr-scanner";
import { useState } from "react";
import { Button, Container, Dropdown, Modal } from "react-bootstrap";

interface ScannerProps {
  devices: MediaDeviceInfo[];
  showScanDialog: boolean;
  closeScanDialog: () => void;
  handleScan: (data: string) => void;
  scanError: (err: any) => void;
}

export default function QRScanner({ devices, showScanDialog, closeScanDialog, handleScan, scanError }: ScannerProps) {
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  return (
    <>
      <Modal data-bs-theme='dark' contentClassName='text-bg-dark' size='sm' show={showScanDialog} onHide={closeScanDialog} centered>
        <Modal.Header closeButton={true}>
          <Modal.Title>Scan QR</Modal.Title>
        </Modal.Header>
        <Modal.Body className='center'>
          <QrScanner containerStyle={{ width: 250, marginBottom: "5px" }} constraints={{ deviceId: selectedDevice, facingMode: 'environment' }} onError={scanError} onDecode={handleScan}/>
          <Dropdown className="d-inline mx-2" onSelect={eventKey => setSelectedDevice(eventKey ?? '')}>
            <Dropdown.Toggle id="dropdown-autoclose-true">
              Select Camera Device
            </Dropdown.Toggle>
            <Dropdown.Menu>
              { devices.map((d, i) => <Dropdown.Item key={i} eventKey={d.deviceId}>{d.label}</Dropdown.Item>) }
            </Dropdown.Menu>
          </Dropdown>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeScanDialog}>Close</Button>
        </Modal.Footer>
      </Modal>

      <div id="barcode-scanning-modal" className="barcode-scanning-modal-hidden">
        <Button className='barcode-close' variant='secondary' onClick={() => closeScanner('', handleScan)}><i className="fa-solid fa-xmark"/></Button>
        <Container>
          <div id="barcode-square"></div>
        </Container>
      </div>
    </>
  )
}

export async function mobileQrScan(handleScan: (data: string) => void) {
  const { camera } = await BarcodeScanner.requestPermissions();
  if (camera !== 'granted' && camera !== 'limited') {
    await Dialog.alert({ title: 'Permission denied', message: 'Please grant camera permission to use the barcode scanner.' });
    return;
  }

  document.querySelector('body')!.classList.add('barcode-scanning-active');
  document.getElementById('barcode-scanning-modal')!.classList.remove('barcode-scanning-modal-hidden');
  document.getElementById('barcode-scanning-modal')!.classList.add('barcode-scanning-modal');

  const squareElementBoundingClientRect = document.getElementById('barcode-square')!.getBoundingClientRect();
  const scaledRect = squareElementBoundingClientRect
    ? {
        left: squareElementBoundingClientRect.left * window.devicePixelRatio,
        right: squareElementBoundingClientRect.right * window.devicePixelRatio,
        top: squareElementBoundingClientRect.top * window.devicePixelRatio,
        bottom: squareElementBoundingClientRect.bottom * window.devicePixelRatio,
        width: squareElementBoundingClientRect.width * window.devicePixelRatio,
        height: squareElementBoundingClientRect.height * window.devicePixelRatio,
      }
    : undefined;
  const detectionCornerPoints = scaledRect
    ? [
        [scaledRect.left, scaledRect.top],
        [scaledRect.left + scaledRect.width, scaledRect.top],
        [scaledRect.left + scaledRect.width, scaledRect.top + scaledRect.height],
        [scaledRect.left, scaledRect.top + scaledRect.height],
      ]
    : undefined;

  const listener = await BarcodeScanner.addListener('barcodeScanned',
    async (result) => {
      const cornerPoints = result.barcode.cornerPoints;
      if (detectionCornerPoints && cornerPoints) {
        if (
          detectionCornerPoints[0][0] > cornerPoints[0][0] ||
          detectionCornerPoints[0][1] > cornerPoints[0][1] ||
          detectionCornerPoints[1][0] < cornerPoints[1][0] ||
          detectionCornerPoints[1][1] > cornerPoints[1][1] ||
          detectionCornerPoints[2][0] < cornerPoints[2][0] ||
          detectionCornerPoints[2][1] < cornerPoints[2][1] ||
          detectionCornerPoints[3][0] > cornerPoints[3][0] ||
          detectionCornerPoints[3][1] < cornerPoints[3][1]
        ) {
          return;
        }
      }

      await closeScanner(result.barcode.rawValue, handleScan);
    }
  );

  await BarcodeScanner.startScan({ formats: [BarcodeFormat.QrCode], lensFacing: LensFacing.Back });
}

async function closeScanner(barcode: string, handleScan: (data: string) => void) {
  await BarcodeScanner.removeAllListeners();
  document.getElementById('barcode-scanning-modal')!.classList.remove('barcode-scanning-modal');
  document.getElementById('barcode-scanning-modal')!.classList.add('barcode-scanning-modal-hidden');
  document.querySelector('body')!.classList.remove('barcode-scanning-active');
  await BarcodeScanner.stopScan();
  handleScan(barcode);
}
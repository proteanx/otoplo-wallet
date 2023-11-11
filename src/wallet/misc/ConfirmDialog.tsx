import { ReactNode } from "react";
import { Button, Modal } from "react-bootstrap";

interface DialogProps {
  title: string;
  show: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  children: ReactNode;
}

export default function ConfirmDialog({ title, show, onCancel, onConfirm, children }: DialogProps) {
  return (
    <Modal data-bs-theme='dark' contentClassName='text-bg-dark' show={show} onHide={onCancel} keyboard={false} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {children}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm}>Confirm</Button> 
      </Modal.Footer>
    </Modal>
  )
}

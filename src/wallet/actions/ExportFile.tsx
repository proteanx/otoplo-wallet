import { Button, Modal } from "react-bootstrap";
import { exportFile, FileProps, shareFile } from "../../utils/file.utils";
import { isMobilePlatform } from "../../utils/common.utils";
import { useAppDispatch } from "../../store/hooks";
import { setLoader } from "../../store/slices/loader.slice";

export default function ExportFile({ show, close, file, hideMenu }: { show: boolean, close: () => void, file?: FileProps, hideMenu?: () => void }) {

  if (!isMobilePlatform()) {
    return;
  }

  const dispatch = useAppDispatch();

  const share = async () => {
    dispatch(setLoader({ loading: true }));
    let success = await shareFile(file!);
    dispatch(setLoader({ loading: false }));
    if (success) {
      if (hideMenu) {
        hideMenu();
      }
      close();
    }
  }

  const save = async () => {
    dispatch(setLoader({ loading: true }));
    let success = await exportFile(file!);
    dispatch(setLoader({ loading: false }));
    if (success) {
      if (hideMenu) {
        hideMenu();
      }
      close();
    }
  }

  return (
    <Modal size="sm" contentClassName="text-bg-dark" data-bs-theme='dark' show={show} onHide={close} centered>
      <Modal.Body>
        <div className="d-grid gap-2">
          <Button onClick={share}>
            <i className="me-2 fa-regular fa-share-from-square"/>
            Share
          </Button>
          <Button onClick={save}>
            <i className="me-2 fa-regular fa-file-zipper"></i>
            Save to Files
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  )
}

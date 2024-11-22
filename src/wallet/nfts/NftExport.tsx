import { Button } from "react-bootstrap"
import { NftEntity } from "../../models/db.entities"
import { exportFile, FileProps } from "../../utils/file.utils";
import ExportFile from "../actions/ExportFile";
import { useState } from "react";
import { isMobilePlatform } from "../../utils/common.utils";

export default function NftExport({ nftEntity, title }: { nftEntity: NftEntity, title: string }) {

  const [fileProps, setFileProps] = useState<FileProps>();
  const [showExport, setShowExport] = useState(false);

  const exportNft = async () => {
    let file: FileProps = {
      type: "NFT",
      dir: "NFTs",
      name: `${(title || nftEntity.token).replace(/[^a-zA-Z0-9]/g, '_')}.zip`,
      content: nftEntity.zipData
    }

    if (isMobilePlatform()) {
      setFileProps(file);
      setShowExport(true);
    } else {
      await exportFile(file);
    }    
  }

  return (
    <>
      <Button className="mx-1" onClick={exportNft}><i className="fa fa-arrow-up-right-from-square"/> Export</Button>
      <ExportFile show={showExport} close={() => setShowExport(false)} file={fileProps}/>
    </>
  )
}

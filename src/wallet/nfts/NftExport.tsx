import { Button } from "react-bootstrap"
import { isMobilePlatform, showToast } from "../../utils/common.utils"
import { NftEntity } from "../../models/db.entities"

export default function NftExport({ nftEntity, title }: { nftEntity: NftEntity, title: string }) {

  // currently support only on desktop
  if (isMobilePlatform()){
    return;
  }

  const exportNft = async () => {
    try {
      let success = await window.electronAPI.exportFile(nftEntity.zipData, title || nftEntity.tokenIdHex);
      if (success) {
        showToast('success', 'NFT Saved!');
      } else {
        throw new Error("failed to save nft");
      }
    } catch (e) {
      console.log(e);
      showToast('error', 'Failed to export NFT', {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "colored",
      });
    }
  }

  return (
    <Button className="mx-1" onClick={exportNft}><i className="fa fa-arrow-up-right-from-square"/> Export</Button>
  )
}

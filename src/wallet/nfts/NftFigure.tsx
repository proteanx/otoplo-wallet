import { Figure } from "react-bootstrap";
import { NftEntity } from "../../models/db.entities";
import { useEffect, useState } from "react";
import { isMobileScreen, isNullOrEmpty } from "../../utils/common.utils";
import JSZip from "jszip";
import { Balance } from "../../models/wallet.entities";
import { removeLocalNFT } from "../../utils/token.utils";

export default function NftFigure({ nftEntity, tokenBalance, onClick }: { nftEntity: NftEntity, tokenBalance?: Balance, onClick: () => void }) {
  let isMobile = isMobileScreen();

  const [nftName, setNftName] = useState('');
  const [nftImage, setNftImage] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!tokenBalance) {
        // workaround for concurrent tx classification
        await removeLocalNFT(nftEntity.tokenIdHex);
        return;
      }

      let zip = await JSZip.loadAsync(nftEntity.zipData);
      let info = zip.file('info.json');
      if (info) {
        let infoJson = await info.async('string');
        let infoObj = JSON.parse(infoJson);
        if (infoObj.title) {
          setNftName(infoObj.title);
        }
      }
      let pubImg = zip.file(/^public\./);
      let frontImg = zip.file(/^cardf\./);
      if (!isNullOrEmpty(pubImg)) {
        let img = await pubImg[0].async('blob');
        let url = URL.createObjectURL(img);
        setNftImage(url);
      } else if (!isNullOrEmpty(frontImg)) {
        let img = await frontImg[0].async('blob');
        let url = URL.createObjectURL(img);
        setNftImage(url);
      }
    }

    if (nftEntity) {
      loadData().catch(e => {
          console.log(e)
      });
    }
  }, [nftEntity]);

  let amtStr = "0";
  if (tokenBalance) {
    let amount = BigInt(tokenBalance.confirmed) + BigInt(tokenBalance.unconfirmed);
    amtStr = amount.toString();
  }

  if (amtStr == "0") {
    return;
  }
  
  return (
    <Figure className="mx-3 nft-card" style={{ width: isMobile ? '40%' : '15%' }} onClick={onClick}>
      <Figure.Image src={nftImage} />
      <Figure.Caption className="text-white center">{nftName}</Figure.Caption>
    </Figure>
  )
}

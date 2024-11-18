import { Figure } from "react-bootstrap";
import { NftEntity } from "../../models/db.entities";
import { useEffect, useState } from "react";
import { isMobileScreen, isNullOrEmpty } from "../../utils/common.utils";
import JSZip from "jszip";
import { Balance } from "../../models/wallet.entities";
import { classifyNftType, removeLocalNFT } from "../../utils/token.utils";

export default function NftFigure({ nftEntity, tokenBalance, onClick }: { nftEntity: NftEntity, tokenBalance?: Balance, onClick: () => void }) {
  let isMobile = isMobileScreen();

  const [nftName, setNftName] = useState('');
  const [nftImage, setNftImage] = useState('');
  const [nftType, setNftType] = useState('');

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
        try {
          let infoObj = JSON.parse(infoJson);
          if (infoObj.title) {
            setNftName(infoObj.title);
          }
        } catch {
          setNftName("No Title");
        }
      }
      let pubImg = zip.file(/^public\./);
      let frontImg = zip.file(/^cardf\./);
      if (!isNullOrEmpty(pubImg)) {
        let img = await pubImg[0].async('blob');
        let url = URL.createObjectURL(img);
        setNftImage(url);
        setNftType(classifyNftType(pubImg[0].name));
      } else if (!isNullOrEmpty(frontImg)) {
        let img = await frontImg[0].async('blob');
        let url = URL.createObjectURL(img);
        setNftImage(url);
        setNftType(classifyNftType(frontImg[0].name));
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
    <Figure className="m-3 nft-card" style={{ width: isMobile ? '40%' : '20%' }} onClick={onClick}>
      { nftType == 'video' && <video controls src={nftImage} width={"100%"} style={{objectFit: 'cover'}}/>
        || nftType == 'audio' && <audio controls src={nftImage} style={{ width: '100%', objectFit: 'cover'}}/>
        || <Figure.Image src={nftImage} />
      }
      <Figure.Caption className="text-white center">{nftName}</Figure.Caption>
    </Figure>
  )
}

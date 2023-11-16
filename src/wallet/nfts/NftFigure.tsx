import { Figure } from "react-bootstrap";
import { NftEntity } from "../../models/db.entities";
import { useEffect, useState } from "react";
import { isMobileScreen, isNullOrEmpty } from "../../utils/common.utils";
import JSZip from "jszip";

export default function NftFigure({ nftEntity, onClick }: { nftEntity: NftEntity, onClick: () => void }) {
  let isMobile = isMobileScreen();

  const [nftName, setNftName] = useState('');
  const [nftImage, setNftImage] = useState('');

  useEffect(() => {
    async function loadData(zipData: Buffer) {
      let zip = await JSZip.loadAsync(zipData);
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
      loadData(nftEntity.zipData).catch(e => {
          console.log(e)
      });
    }
  }, [nftEntity]);

  return (
    <Figure className="mx-3 nft-card" style={{ width: isMobile ? '40%' : '15%' }} onClick={onClick}>
      <Figure.Image src={nftImage} />
      <Figure.Caption className="text-white center">{nftName}</Figure.Caption>
    </Figure>
  )
}

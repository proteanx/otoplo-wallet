import { Button, Card, Col, Container, Figure, Row, Spinner } from "react-bootstrap";
import { NftEntity } from "../../models/db.entities";
import { isMobileScreen, isNullOrEmpty, truncateStringMiddle } from "../../utils/common.utils";
import NftInfo from "./NftInfo";
import { useEffect, useState } from "react";
import JSZip from "jszip";
import NftExport from "./NftExport";
import NftSend from "./NftSend";
import { WalletKeys } from "../../models/wallet.entities";
import { classifyNftType } from "../../utils/token.utils";

interface NftFileDetails {
  title: string;
  image: string;
  type?: string;
}

export interface NftData {
  title: string;
  series: string;
}

export default function NftPage({ nftEntity, keys, back }: { nftEntity: NftEntity, keys: WalletKeys, back: () => void }) {
  let isMobile = isMobileScreen();

  const [loading, setLoading] = useState(true);
  const [infoJson, setInfoJson] = useState<NftData>({ title: '', series: '' });
  const [files, setFiles] = useState<NftFileDetails[]>();

  useEffect(() => {
    async function loadData(zipData: Buffer) {
      let files: NftFileDetails[] = [];

      let zip = await JSZip.loadAsync(zipData);
      let info = zip.file('info.json');
      if (info) {
        let infoJson = await info.async('string');
        try {
          let infoObj = JSON.parse(infoJson);
          let data: NftData = { title: infoObj?.title ?? '', series: infoObj?.series ?? '' };
          setInfoJson(data);
        } catch {
          // ignore
        }
      }

      let pubImg = zip.file(/^public\./);
      if (!isNullOrEmpty(pubImg)) {
        let img = await pubImg[0].async('blob');
        let url = URL.createObjectURL(img);
        files.push({ title: 'Public', image: url, type: classifyNftType(pubImg[0].name) });
      }

      let frontImg = zip.file(/^cardf\./);
      if (!isNullOrEmpty(frontImg)) {
        let img = await frontImg[0].async('blob');
        let url = URL.createObjectURL(img);
        files.push({ title: 'Front', image: url, type: classifyNftType(frontImg[0].name) });
      }

      let backImg = zip.file(/^cardb\./);
      if (!isNullOrEmpty(backImg)) {
        let img = await backImg[0].async('blob');
        let url = URL.createObjectURL(img);
        files.push({ title: 'Back', image: url, type: classifyNftType(backImg[0].name) });
      }

      let ownImg = zip.file(/^owner\./);
      if (!isNullOrEmpty(ownImg)) {
        let img = await ownImg[0].async('blob');
        let url = URL.createObjectURL(img);
        files.push({ title: 'Owner', image: url, type: classifyNftType(ownImg[0].name) });
      }

      setFiles(files);
      setLoading(false);
    }

    if (nftEntity) {
      loadData(nftEntity.zipData).catch(e => {
        console.log(e)
      });
    }
  }, [nftEntity]);
  
  if (loading) {
    return <div className="text-white center mt-3"><Spinner animation="border" size="sm"/> Loading...</div>
  }

  return (
    <>
      <Container className="text-white mt-3">
        <Row>
          <Col className="p-0">
            <Button variant='outline-primary' onClick={back}><i className="fa-solid fa-circle-arrow-left"/></Button>
          </Col>
          <Col xs={8} className="flex-center">
            <span className="bold larger">{infoJson.title || truncateStringMiddle(nftEntity.token, isMobile ? 20 : 70)}</span>
          </Col>
          <Col className="right p-0">
            <NftInfo nftJson={infoJson} nftEntity={nftEntity}/>
          </Col>
        </Row>
      </Container>
      <Card bg="custom-card" className='text-white mt-3'>
        <Card.Body>
          <Row>
            <Col className='center'>
              { files?.map((f, i) => {
                return (
                  <Figure key={i} className="mx-3" style={{ width: isMobile ? '40%' : '30%' }}>
                    { f.type == 'video' && <video controls src={f.image} width={"100%"} style={{objectFit: 'cover'}}/>
                      || f.type == 'audio' && <audio controls src={f.image} style={{width: '100%', objectFit: 'cover'}}/>
                      || <Figure.Image src={f.image} />
                    }
                    <Figure.Caption className="text-white">{f.title}</Figure.Caption>
                  </Figure>
                )
              }) }
              <div className='pt-3'>
                <NftExport nftEntity={nftEntity} title={infoJson.title}/>
                <NftSend keys={keys} nftEntity={nftEntity}/>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </>
  )
}

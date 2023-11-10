import { ReactNode } from "react";
import { Col, Row } from "react-bootstrap";

export default function SettingsRow({ hr, title, info, action }: { hr?: boolean, title: string, info: ReactNode, action: ReactNode }) {
  return (
    <>
      <Row className={`px-3 ${hr ? '' : 'pb-3'}`}>
        <Col xs={8} className="align-self-center">
            <div className="light-bold">
              {title}
            </div>
            <div className="light-txt smaller">
              {info}
            </div>
        </Col>
        <Col className="right align-self-center">
            {action}
        </Col>
      </Row>
      { hr && <hr/>}
    </>
  )
}

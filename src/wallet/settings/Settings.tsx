import { Card, Col, Container, Row, Tab, Tabs } from "react-bootstrap";
import AboutSettings from "./about/AboutSettings";
import GeneralSettings from "./general/GeneralSettings";

export default function Settings() {
  return (
    <>
      <Container className="text-white my-3">
        <Row>
          <Col className="xlarge bold px-0">Settings</Col>
        </Row>
      </Container>
      <Card bg="custom-card" className='text-white'>
         <Card.Body className="settings p-0">
            <Tabs data-bs-theme='dark' variant="underline" defaultActiveKey="general" id="settings-tabs" className="mb-3 px-2">
               <Tab eventKey="general" title="General">
                  <GeneralSettings/>
               </Tab>
               <Tab eventKey="about" title="About">
                  <AboutSettings/>
               </Tab>
            </Tabs>
         </Card.Body>
      </Card>
    </>
  )
}
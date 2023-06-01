import React from 'react';
import Container from 'react-bootstrap/Container';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import otoplo from '../img/otoplo-logo-white.svg'
import Donation from './Donation';

export default function NavBar() {
  const reload = () => {
    window.location.reload();
  }

  return (
    <Navbar bg="dark" expand="lg" variant="dark">
      <Container>
        <Navbar.Brand href='#' onClick={reload}>
            <img alt="Nexa" src={otoplo} className="header-image"/>
        </Navbar.Brand>
        <Nav.Item className="ms-auto">
          <Donation/>
        </Nav.Item>
      </Container>
    </Navbar>
  )
}

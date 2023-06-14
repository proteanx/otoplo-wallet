import React from 'react';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import otoplo from '../img/otoplo-logo-white.svg'

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
      </Container>
    </Navbar>
  )
}

export default function Footer() {
  let year = new Date().getFullYear();
  return (
    <footer className='p-2 border-top border-secondary'>
        Copyright (c) {year} Otoplo Ltd.<br/>All Rights Reserved.
    </footer>
  )
}

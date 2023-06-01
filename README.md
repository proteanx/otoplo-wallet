# Otoplo Wallet

Otoplo Wallet is a free, open-source modern Nexa non-custodial wallet application for Windows, Linux, and Mac. Release binaries are available directly from [GitLab](https://gitlab.com/otoplo/otoplo-wallet/desktop-wallet/-/releases).

A third-party relay (see [.env](https://gitlab.com/otoplo/otoplo-wallet/desktop-wallet/-/blob/main/.env) and [wallet-api](https://gitlab.com/otoplo/otoplo-wallet/wallet-api)) is used to query the blockchain and broadcast transactions.

## Building

Clone the repo and open the directory:

```sh
git clone https://gitlab.com/otoplo/otoplo-wallet/desktop-wallet.git
cd desktop-wallet
```

Install dependencies and compile:

```sh
npm install
npm run make
```

The binaries will be created in `out` directory.

## Supporting the project

Otoplo Wallet is a 100% community-sponsored project. If you want to join our efforts, the easiest thing you can do is support the project financially.

Donations help pay for maintaining, hosting, build servers, domain names and other recurring costs. Any amount helps.

`nexa:nqtsq5g5402qrtfrhfd4uusvdgs0cal5r6g27auyy6cuuzxn`

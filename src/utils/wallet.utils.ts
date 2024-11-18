import HDPrivateKey from "nexcore-lib/types/lib/hdprivatekey";
import { dbProvider } from "../app/App";
import { rostrumProvider } from "../providers/rostrum.provider";
import StorageProvider from "../providers/storage.provider";
import { AddressKey, Balance, WalletIndexes, WalletKeys } from "../models/wallet.entities";
import * as Bip39 from 'bip39';
import NexCore from 'nexcore-lib';
import bigDecimal from "js-big-decimal";
import { ITXHistory, ITXInput, ITXOutput } from "../models/rostrum.entities";
import { currentTimestamp, isNullOrEmpty } from "./common.utils";
import { TransactionEntity, TxEntityState } from "../models/db.entities";
import NiftyProvider from "../providers/nifty.provider";
import { fetchAndSaveNFT } from "./token.utils";

export enum TxTokenType {
    NO_GROUP,
    CREATE,
    MINT,
    MELT,
    RENEW,
    TRANSFER
}

export async function clearLocalWallet() {
    await StorageProvider.clearData();
    await dbProvider.clearData();
}

export function isValidNexaAddress(address: string, type = NexCore.Address.PayToScriptTemplate) {
    return NexCore.Address.isValid(address, NexCore.Networks.livenet, type);
}

export function generateMasterKey(mnemonic: string, passphrase?: string | undefined) {
    const seed = Bip39.mnemonicToSeedSync(mnemonic, passphrase);
    const masterKey = NexCore.HDPrivateKey.fromSeed(seed);
    return masterKey.deriveChild(44, true).deriveChild(29223, true);
}

export function generateAccountKey(masterKey: HDPrivateKey, account: number) {
    return masterKey.deriveChild(account, true);
}

export function generateKeysAndAddresses(accountKey: HDPrivateKey, fromRIndex: number, rIndex: number, fromCIndex: number, cIndex: number): WalletKeys {
    let receive = accountKey.deriveChild(0, false);
    let change = accountKey.deriveChild(1, false);
    let rKeys: AddressKey[] = [], cKeys: AddressKey[] = [];
    for (let index = fromRIndex; index < rIndex; index++) {
        let k = receive.deriveChild(index, false);
        let addr = k.getPublicKey().toAddress().toString();
        rKeys.push({key: k, address: addr, balance: "0", tokensBalance: {}});
    }
    for (let index = fromCIndex; index < cIndex; index++) {
        let k = change.deriveChild(index, false);
        let addr = k.getPublicKey().toAddress().toString();
        cKeys.push({key: k, address: addr, balance: "0", tokensBalance: {}});
    }
    return {receiveKeys: rKeys, changeKeys: cKeys};
}

export async function discoverWallet(accountKey: HDPrivateKey) {
    let receiveKey = accountKey.deriveChild(0, false);
    let changeKey = accountKey.deriveChild(1, false);

    let rIndexPromise = discoverWalletIndex(receiveKey);
    let cIndexPromise = discoverWalletIndex(changeKey);

    let [rIndex, cIndex] = await Promise.all([rIndexPromise, cIndexPromise]);

    let indexes: WalletIndexes = { rIndex: rIndex+1, cIndex: cIndex+1 };
    await StorageProvider.saveWalletIndexes(indexes);

    return indexes;
}

async function discoverWalletIndex(deriveKey: HDPrivateKey) {
    let index = 0, stop = false, addrBatch = 0;

    do {
        stop = true;
        for (let i = addrBatch; i < addrBatch+20; i++) {
            let rAddr = deriveKey.deriveChild(i, false).getPublicKey().toAddress().toString();
            let isUsed = await isAddressUsed(rAddr);
            if (isUsed) {
                index = i;
                stop = false;
            }
        }
        addrBatch += 20;
    } while (!stop);

    return index;
}

async function isAddressUsed(address: string) {
    try {
        let firstUse = await rostrumProvider.getFirstUse(address);
        return firstUse.tx_hash && firstUse.tx_hash !== "";
    } catch (e) {
        if (e instanceof Error && e.message.includes("not found")) {
            return false;
        }
        throw e;
    }
}

async function getKeyTokenBalance(key: AddressKey) {
    let tokensBalance = await rostrumProvider.getTokensBalance(key.address);
    let balance: Record<string, Balance> = {};

    for (const cToken in tokensBalance.confirmed) {
        if (tokensBalance.confirmed[cToken] != 0) {
            balance[cToken] = { confirmed: BigInt(tokensBalance.confirmed[cToken]).toString(), unconfirmed: "0" }
        }
    }

    for (const uToken in tokensBalance.unconfirmed) {
        if (tokensBalance.unconfirmed[uToken] != 0) {
            if (balance[uToken]) {
                balance[uToken].unconfirmed = BigInt(tokensBalance.unconfirmed[uToken]).toString();
            } else {
                balance[uToken] = { confirmed: "0", unconfirmed: BigInt(tokensBalance.unconfirmed[uToken]).toString() }
            }
        }
    }

    return balance;
}

async function getAndUpdateAddressKeyBalance(key: AddressKey) {
    let balance = await rostrumProvider.getBalance(key.address);
    key.balance = (BigInt(balance.confirmed) + BigInt(balance.unconfirmed)).toString();
    key.tokensBalance = await getKeyTokenBalance(key);

    return balance;
}

export async function fetchTotalBalance(keys: AddressKey[]) {
    let promises: Promise<Balance>[] = [];
    keys.forEach(key => {
        let b = getAndUpdateAddressKeyBalance(key);
        promises.push(b);
    });

    return await Promise.all(promises);
}

export function sumBalance(balances: Balance[]): Balance {
    let confirmed = new bigDecimal(0), unconfirmed = new bigDecimal(0);
    balances.forEach(b => {
        confirmed = confirmed.add(new bigDecimal(b.confirmed));
        unconfirmed = unconfirmed.add(new bigDecimal(b.unconfirmed));
    });
    return {confirmed: confirmed.getValue(), unconfirmed: unconfirmed.getValue()};
}

export function sumTokensBalance(balances: Record<string, Balance>[]) {
    let tokensBalance: Record<string, Balance> = {};
    balances.forEach(b => {
        for (const key in b) {
            if (tokensBalance[key]) {
                tokensBalance[key].confirmed = (BigInt(tokensBalance[key].confirmed) + BigInt(b[key].confirmed)).toString();
                tokensBalance[key].unconfirmed = (BigInt(tokensBalance[key].unconfirmed) + BigInt(b[key].unconfirmed)).toString();
            } else {
                tokensBalance[key] = { confirmed: b[key].confirmed, unconfirmed: b[key].unconfirmed };
            }
        }
    });

    return tokensBalance;
}

export async function fetchTransactionsHistory(addresses: string[], fromHeight: number) {
    let index = 0, i = 0, data = new Map<string, ITXHistory>(), maxHeight = fromHeight;

    for (let address of addresses) {
        i++;
        let txHistory = await rostrumProvider.getTransactionsHistory(address);
        if (txHistory && txHistory.length > 0) {
            index = i;
            for (let tx of txHistory) {
                if (tx.height === 0 || tx.height > fromHeight) {
                    maxHeight = Math.max(maxHeight, tx.height);
                    data.set(tx.tx_hash, tx);
                }
            }
        }
    }

    return {index: index, txs: data, lastHeight: maxHeight};
}

export async function scanForNewAddresses(accountKey: HDPrivateKey) {
    let idx = await StorageProvider.getWalletIndexes();
    let myKeys = generateKeysAndAddresses(accountKey, idx.rIndex, idx.rIndex + 20, idx.cIndex, idx.cIndex + 20);
    let rAddrs = myKeys.receiveKeys.map(k => k.address);
    let cAddrs = myKeys.changeKeys.map(k => k.address);

    let rScan = rescanAddressesHistory(rAddrs);
    let cScan = rescanAddressesHistory(cAddrs);

    let [rRes, cRes] = await Promise.all([rScan, cScan]);
    let minHeight = Math.min(rRes.height, cRes.height);
    if (minHeight == 0) {
        minHeight = Math.max(rRes.height, cRes.height);
    }

    let state = await StorageProvider.getTransactionsState();
    if (minHeight > 0) {
        if (minHeight <= state.height) {
            state.height = minHeight - 1;
            await StorageProvider.setTransactionsState(state);
        }
        if (rRes.index > 0 || cRes.index > 0) {
            await StorageProvider.saveWalletIndexes({rIndex: idx.rIndex + rRes.index, cIndex: idx.cIndex + cRes.index});
        }
        return true;
    }
    return false;
  }

async function rescanAddressesHistory(addresses: string[]) {
    let index = 0, i = 0, minHeight = Number.MAX_SAFE_INTEGER;

    for (let address of addresses) {
        i++;
        let txHistory = await rostrumProvider.getTransactionsHistory(address);
        if (!isNullOrEmpty(txHistory)) {
            index = i;
            let heights = txHistory.filter(tx => tx.height > 0).map(h => h.height);
            if (!isNullOrEmpty(heights)) {
                minHeight = Math.min(minHeight, ...heights);
            }
        }
    }

    return {index: (index > 0 ? index + 1 : 0), height: (minHeight == Number.MAX_SAFE_INTEGER ? 0 : minHeight)};
}

export async function classifyTransaction(txHistory: ITXHistory, myAddresses: string[]) {
    let t = await rostrumProvider.getTransaction(txHistory.tx_hash);

    let outputs = t.vout.filter(utxo => !isNullOrEmpty(utxo.scriptPubKey.addresses));

    let isOutgoing = t.vin.length > 0 && myAddresses.includes(t.vin[0].addresses[0]);
    let isIncoming = !isOutgoing || outputs.every(utxo => myAddresses.includes(utxo.scriptPubKey.addresses[0]));
    let isConfirmed = t.height > 0;

    let txEntry = {} as TransactionEntity;
    txEntry.txId = t.txid;
    txEntry.txIdem = t.txidem;
    txEntry.height = isConfirmed ? t.height : 0;
    txEntry.time = isConfirmed ? t.time : currentTimestamp();
    txEntry.fee = t.fee_satoshi;

    if (isOutgoing && isIncoming) {
        txEntry.state = 'both';
        txEntry.value = "0";
        txEntry.payTo = "Payment to yourself";
    } else if (isIncoming) {
        txEntry.state = 'incoming';
        let utxos = outputs.filter(utxo => myAddresses.includes(utxo.scriptPubKey.addresses[0]));
        let amount = new bigDecimal(0);
        utxos.forEach(utxo => {
            amount = amount.add(new bigDecimal(utxo.value_satoshi));
        });
        txEntry.value = amount.getValue();
        txEntry.payTo = utxos[0].scriptPubKey.addresses[0];
    } else if(isOutgoing) {
        txEntry.state = 'outgoing';
        let utxos = outputs.filter(utxo => !myAddresses.includes(utxo.scriptPubKey.addresses[0]));
        let amount = new bigDecimal(0);
        utxos.forEach(utxo => {
            amount = amount.add(new bigDecimal(utxo.value_satoshi));
        });
        txEntry.value = amount.getValue();
        txEntry.payTo = utxos[0].scriptPubKey.addresses[0];
    }

    let [txType, txGroup, tokenAmount, extraGroup] = classifyTokenTransaction(t.vin, outputs, txEntry.state, myAddresses);
    txEntry.txGroupType = txType;
    txEntry.token = txGroup;
    txEntry.tokenAmount = tokenAmount;
    txEntry.extraGroup = extraGroup;

    return txEntry;
}

export async function classifyAndSaveTransaction(txHistory: ITXHistory, myAddresses: string[]) {
    let txEntry = await classifyTransaction(txHistory, myAddresses);

    if (txEntry.token !== 'none' && NiftyProvider.isNiftySubgroup(txEntry.token)) {
        if (txEntry.state !== 'outgoing') {
            await fetchAndSaveNFT(txEntry.token, NiftyProvider.NIFTY_TOKEN.token);
        }
        txEntry.extraGroup = NiftyProvider.NIFTY_TOKEN.token;
    }

    await dbProvider.addLocalTransaction(txEntry);

    return txEntry;
}

function classifyTokenTransaction(vin: ITXInput[], vout: ITXOutput[], txState: TxEntityState, myAddresses: string[]): [TxTokenType, string, string, string] {
    let groupInputs = vin.filter(input => !isNullOrEmpty(input.group));
    let groupOutputs = vout.filter(output => !isNullOrEmpty(output.scriptPubKey.group));

    if (isNullOrEmpty(groupInputs) && isNullOrEmpty(groupOutputs)) {
        return [TxTokenType.NO_GROUP, "none", "0", "none"];
    }

    let myGroupInputs = groupInputs.filter(input => myAddresses.includes(input.addresses[0]));
    let myGroupOutputs = groupOutputs.filter(output => myAddresses.includes(output.scriptPubKey.addresses[0]));

    if (isNullOrEmpty(myGroupInputs) && isNullOrEmpty(myGroupOutputs)) {
        return [TxTokenType.NO_GROUP, "none", "0", "none"];
    }

    if (isNullOrEmpty(groupInputs)) {
        let group = myGroupOutputs.find(output => BigInt(output.scriptPubKey.groupQuantity) < 0n)?.scriptPubKey.group ?? "none";
        return [TxTokenType.CREATE, group, "0", "none"];
    }

    if (isNullOrEmpty(groupOutputs)) {
        if (txState === 'incoming') {
            return [TxTokenType.NO_GROUP, "none", "0", "none"];
        }

        let inputs = myGroupInputs.filter(input => BigInt(input.groupQuantity) > 0n);
        if (!isNullOrEmpty(inputs)) {
            let amount = new bigDecimal(0);
            inputs.forEach(utxo => {
                amount = amount.add(new bigDecimal(utxo.groupQuantity));
            });
            let group = inputs[0].group;
            let extraGroup = myGroupInputs.find(input => BigInt(input.groupQuantity) < 0n && inputs[0].group != input.group)?.group ?? "none";
            return [TxTokenType.MELT, group, amount.getValue(), extraGroup];
        }

        let group = myGroupInputs.find(input => BigInt(input.groupQuantity) < 0n)?.group ?? "none";
        let extraGroup = myGroupInputs.find(input => BigInt(input.groupQuantity) < 0n && group != input.group)?.group ?? "none";
        return [TxTokenType.MELT, group, "0", extraGroup];
    }

    let tokenInputs = groupInputs.filter(input => BigInt(input.groupQuantity) > 0n);
    let tokenOutputs = groupOutputs.filter(output => BigInt(output.scriptPubKey.groupQuantity) > 0n);

    if (isNullOrEmpty(tokenInputs) && isNullOrEmpty(tokenOutputs)) {
        let group = groupInputs.find(input => BigInt(input.groupQuantity) < 0n)?.group ?? "none";
        let extraGroup = groupOutputs.find(output => BigInt(output.scriptPubKey.groupQuantity) < 0n && group != output.scriptPubKey.group)?.scriptPubKey.group ?? "none";
        return [TxTokenType.RENEW, extraGroup !== 'none' ? extraGroup : group, "0", extraGroup !== 'none' ? group : extraGroup];
    }
    
    if (isNullOrEmpty(tokenInputs)) {
        let group = tokenOutputs[0].scriptPubKey.group;
        let amount = new bigDecimal(0);
        tokenOutputs.forEach(utxo => {
            amount = amount.add(new bigDecimal(utxo.scriptPubKey.groupQuantity));
        });
        let extraGroup = groupInputs.find(input => BigInt(input.groupQuantity) < 0n && group != input.group)?.group ?? "none";
        return [TxTokenType.MINT, group, amount.getValue(), extraGroup];
    }

    if (isNullOrEmpty(tokenOutputs)) {
        let group = tokenInputs[0].group;
        let amount = new bigDecimal(0);
        tokenInputs.forEach(utxo => {
            amount = amount.add(new bigDecimal(utxo.groupQuantity));
        });
        let extraGroup = groupInputs.find(input => BigInt(input.groupQuantity) < 0n && group != input.group)?.group ?? "none";
        return [TxTokenType.MELT, group, amount.getValue(), extraGroup];
    }

    let outQuantitySum = tokenOutputs.map(output => BigInt(output.scriptPubKey.groupQuantity)).reduce((a, b) => a + b, 0n);
    let inQuantitySum = tokenInputs.map(input => BigInt(input.groupQuantity)).reduce((a, b) => a + b, 0n);

    if (outQuantitySum > inQuantitySum) {
        let group = tokenOutputs[0].scriptPubKey.group;
        let extraGroup = groupInputs.find(input => BigInt(input.groupQuantity) < 0n && group != input.group)?.group ?? "none";
        return [TxTokenType.MINT, group, (outQuantitySum - inQuantitySum).toString(), extraGroup];
    }

    if (inQuantitySum > outQuantitySum) {
        let group = tokenInputs[0].group;
        let extraGroup = groupInputs.find(input => BigInt(input.groupQuantity) < 0n && group != input.group)?.group ?? "none";
        return [TxTokenType.MELT, group, (inQuantitySum - outQuantitySum).toString(), extraGroup];
    }

    let group = tokenOutputs[0].scriptPubKey.group;
    let amount = "";
    if (txState === 'incoming') {
        amount = tokenOutputs
            .filter(output => myAddresses.includes(output.scriptPubKey.addresses[0]))
            .map(output => BigInt(output.scriptPubKey.groupQuantity))
            .reduce((a, b) => a + b, 0n)
            .toString();
    } else if (txState === 'outgoing') {
        amount = tokenOutputs
            .filter(output => !myAddresses.includes(output.scriptPubKey.addresses[0]))
            .map(output => BigInt(output.scriptPubKey.groupQuantity))
            .reduce((a, b) => a + b, 0n)
            .toString();
    } else {
        amount = "0";
    }

    return [TxTokenType.TRANSFER, group, amount, "none"];
}
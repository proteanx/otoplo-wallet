import nexcore from 'nexcore-lib';
import { isValidNexaAddress } from "./wallet.utils";
import { rostrumProvider } from '../providers/rostrum.provider';
import Transaction from 'nexcore-lib/types/lib/transaction/transaction';
import PrivateKey from 'nexcore-lib/types/lib/privatekey';
import { WalletKeys } from '../models/wallet.entities';
import { parseAmountWithDecimals } from './functions';
import Script from 'nexcore-lib/types/lib/script/script';
import PublicKey from 'nexcore-lib/types/lib/publickey';

const MAX_INPUTS_OUTPUTS = 250;

interface TxInput {
    txId: string;
    outputIndex: number;
    address?: string;
    script?: string;
    satoshis: number;
    templateScript?: Script;
    constraintScript?: Script;
    visibleArgs?: any[];
    publicKey?: PublicKey;
}

export interface TxTemplateData {
    templateScript: Script;
    constraintScript: Script;
    visibleArgs: any[];
    publicKey: PublicKey;
}

interface TxOptions {
    isConsolidate?: boolean;
    toChange?: string;
    templateData?: TxTemplateData;
    manuelFee?: string;
    feeFromAmount?: boolean;
}

export async function buildAndSignTransferTransaction(keys: WalletKeys, toAddr: string, amount: string, manuelFee?: string, feeFromAmount?: boolean, token?: string) {
    let txOptions: TxOptions = {
        manuelFee: manuelFee,
        feeFromAmount: feeFromAmount
    }

    let tx = prepareTransaction(toAddr, amount, token);
    let tokenPrivKeys: PrivateKey[] = [];
    if (token) {
        //tokenPrivKeys = await populateTokenInputsAndChange(tx, keys, token, BigInt(amount));
    }
    let privKeys = await populateNexaInputsAndChange(tx, keys, txOptions);
    return await finalizeTransaciton(tx, privKeys.concat(tokenPrivKeys));
}

export async function buildAndSignConsolidateTransaction(keys: WalletKeys, toChange?: string, templateData?: TxTemplateData) {
    let txOptions: TxOptions = {
        isConsolidate: true,
        toChange: toChange,
        templateData: templateData
    }

    let tx = new nexcore.Transaction();
    let privKeys = await populateNexaInputsAndChange(tx, keys, txOptions);
    return await finalizeTransaciton(tx, privKeys);
}

async function populateNexaInputsAndChange(tx: Transaction, keys: WalletKeys, options: TxOptions) {
    let allKeys = keys.receiveKeys.concat(keys.changeKeys);
    let usedKeys = new Map<string, PrivateKey>();

    if (options.manuelFee) {
        tx.fee(parseInt(options.manuelFee));
    }

    let origAmount = options.isConsolidate ? 0 : tx.outputs[0].satoshis;

    for (let key of allKeys) {
        let utxos = await rostrumProvider.getNexaUtxos(key.address);
        for (let utxo of utxos) {
            let input: TxInput = {
                txId: utxo.outpoint_hash,
                outputIndex: utxo.tx_pos,
                address: key.address,
                satoshis: utxo.value
            };
            if (options.templateData) {
                input.templateScript = options.templateData.templateScript;
                input.constraintScript = options.templateData.constraintScript;
                input.visibleArgs = options.templateData.visibleArgs;
                input.publicKey = options.templateData.publicKey;
            }
            tx.from(input);

            if (!usedKeys.has(key.address)) {
                usedKeys.set(key.address, key.key.getPrivateKey());
            }
            
            if (options.isConsolidate) {
                tx.change(options.toChange ?? keys.receiveKeys.at(-1)!.address);
                if (tx.inputs.length > MAX_INPUTS_OUTPUTS) {
                    return Array.from(usedKeys.values());
                }
            } else {
                if (tx.inputs.length > MAX_INPUTS_OUTPUTS) {
                    throw new Error("Too many inputs. Consider consolidating transactions or reduce the send amount.");
                }

                let avail = options.feeFromAmount ? tx.inputAmount - tx.outputs[0].satoshis : tx.inputAmount - (tx.outputs[0].satoshis + getRequiredFee(tx, options.manuelFee));
                if (avail == 0) {
                    if (options.feeFromAmount) {
                        let txFee = getRequiredFee(tx, options.manuelFee);
                        tx._updateOutput(0, origAmount - txFee);
                    }
                    assertMinimumRequiredFee(tx);
                    return Array.from(usedKeys.values());
                } else if (avail > 0) {
                    tx.change(options.toChange ?? keys.changeKeys.at(-1)!.address);
                    if (options.feeFromAmount) {
                        let hasChange = tx.getChangeOutput();
                        let txFee = getRequiredFee(tx, options.manuelFee);
                        tx._updateOutput(0, origAmount - txFee);
                        if (!hasChange && tx.getChangeOutput()) { // added change after update
                            txFee = getRequiredFee(tx, options.manuelFee);
                            tx._updateOutput(0, origAmount - txFee);
                        }
                    }

                    avail = options.feeFromAmount ? tx.inputAmount - tx.outputs[0].satoshis : tx.inputAmount - (tx.outputs[0].satoshis + getRequiredFee(tx, options.manuelFee));
                    if (avail == 0 || avail >= nexcore.Transaction.DUST_AMOUNT) {
                        assertMinimumRequiredFee(tx);
                        return Array.from(usedKeys.values());
                    }
                }
            }
        }
    }

    if (options.isConsolidate) {
        if (usedKeys.size > 0) {
            return Array.from(usedKeys.values());
        }
        throw new Error("Not enough Nexa balance.");
    }

    let err = {
        errorMsg: "Not enough Nexa balance.",
        amount: parseAmountWithDecimals(tx.outputs[0].satoshis, 2),
        fee: parseAmountWithDecimals(tx._estimateSize() * (nexcore.Transaction.FEE_PER_KB / 1000), 2)
    }

    throw new Error(JSON.stringify(err));
}

function prepareTransaction(toAddr: string, amount: string, token?: string) {
    if (!isValidNexaAddress(toAddr) && !isValidNexaAddress(toAddr, nexcore.Address.PayToPublicKeyHash)) {
        throw new Error('Invalid Address.');
    }
    if ((token && BigInt(amount) < 1n) || (!token && parseInt(amount) < nexcore.Transaction.DUST_AMOUNT)) {
        throw new Error("The amount is too small.");
    }

    let outType = nexcore.Address.getOutputType(toAddr);
    let tx = new nexcore.Transaction();

    if (token) {
        if (!isValidNexaAddress(token, nexcore.Address.GroupIdAddress)) {
            throw new Error('Invalid Token ID');
        }
        if (outType === 0) {
            throw new Error('Token must be sent to script template address');
        }
        tx.toGrouped(toAddr, token, BigInt(amount));
    } else {
        tx.to(toAddr, parseInt(amount), outType);
    }

    return tx;
}

async function finalizeTransaciton(tx: Transaction, privKeys: PrivateKey[]) {
    let tip = await rostrumProvider.getBlockTip();
    return tx.lockUntilBlockHeight(tip.height).sign(privKeys);
}

export async function broadcastTransaction(txHex: string) {
    return await rostrumProvider.broadcast(txHex);
}

function assertMinimumRequiredFee(tx: Transaction) {
    if (tx.getFee() < tx._estimateSize()) {
        let fee = parseAmountWithDecimals(tx.getFee(), 2);
        let minimum = parseAmountWithDecimals(tx._estimateSize(), 2);
        throw new Error(`Not enough fee to send the transaction (Fee: ${fee}, Minimum Reuired: ${minimum})`);
    }
}

function getRequiredFee(tx: Transaction, manual?: string) {
    return manual ? tx.getFee() : tx._estimateSize() * (nexcore.Transaction.FEE_PER_KB / 1000);
}

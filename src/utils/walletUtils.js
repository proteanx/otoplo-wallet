import { Address, Script, Transaction } from "nexcore-lib";
import { fetchConsolidateUtxos, fetchUtxos } from "./functions";
import bigDecimal from "js-big-decimal";
import Signature from "nexcore-lib/lib/crypto/signature";

/**
 * @param {string} toAddress 
 * @param {bigDecimal} sendAmount 
 * @param {*} keys
 * @param {boolean} subFeeFromAmount 
 * @param {string} manualFee 
 */
export async function buildAndSignTx(toAddress, sendAmount, keys, subFeeFromAmount, manualFee) {
  var rAddrs = keys.receiveKeys.map(k => ({address: k.address, hex: Script.fromAddress(k.address).toHex()}));
  var cAddrs = keys.changeKeys.map(k => ({address: k.address, hex: Script.fromAddress(k.address).toHex()}));
  var outputScriptSize = Script.fromAddress(toAddress).toBuffer().length;
  var toType = Address.getOutputType(toAddress);
  var changeAddr = cAddrs[cAddrs.length - 1].address;

  var res = await fetchUtxos(rAddrs, cAddrs, toType, subFeeFromAmount, manualFee, sendAmount.getValue(), outputScriptSize);

  if (subFeeFromAmount) {
    sendAmount = sendAmount.subtract(new bigDecimal(res.totalFee));
    if (sendAmount.compareTo(new bigDecimal(Transaction.DUST_AMOUNT)) < 0) {
      return {amount: new bigDecimal(0)};
    }
  }

  var tx = buildAndSign(toAddress, changeAddr, keys, sendAmount, toType, res.utxos, res.height, manualFee);

  return {tx: tx, amount: sendAmount, requiredFee: new bigDecimal(res.requiredFee), totalFee: new bigDecimal(res.totalFee)};
}

export async function consolidateUtxos(toAddress, keys, templateData) {
  var rAddrs = keys.receiveKeys.map(k => ({address: k.address, hex: Script.fromAddress(k.address).toHex()}));
  var cAddrs = keys.changeKeys.map(k => ({address: k.address, hex: Script.fromAddress(k.address).toHex()}));
  var outputScriptSize = Script.fromAddress(toAddress).toBuffer().length;
  var toType = Address.getOutputType(toAddress);

  var res = await fetchConsolidateUtxos(rAddrs, cAddrs, toType, outputScriptSize);

  var sendAmount = new bigDecimal(res.totalAmount).subtract(new bigDecimal(res.totalFee));
  if (sendAmount.compareTo(new bigDecimal(Transaction.DUST_AMOUNT)) < 0) {
    return {amount: new bigDecimal(0)};
  }

  var tx = buildAndSign(toAddress, null, keys, sendAmount, toType, res.utxos, res.height, "-1", templateData);

  console.log(tx.toString())

  return {tx: tx, amount: sendAmount, totalFee: new bigDecimal(res.totalFee)};
}

export function buildAndSign(toAddress, changeAddr, keys, sendAmount, toType, utxos, height, manualFee, templateData) {
  var tx = new Transaction();
  var privKeys = [];
  var usedAddrs = [];

  utxos.forEach(utxo => {
    if (!usedAddrs.includes(utxo.address)) {
      var k = keys.receiveKeys.find(k => k.address === utxo.address);
      if (!k) {
        k = keys.changeKeys.find(k => k.address === utxo.address);
      }
      privKeys.push(k.key.privateKey);
      usedAddrs.push(k.address);
    }
    
    var txo = {
      txId: utxo.outpointHash,
      outputIndex: utxo.txPos,
      script: utxo.addressScript,
      satoshis: utxo.value
    };
    if (templateData) {
      txo.templateScript = templateData.templateScript;
      txo.constraintScript = templateData.constraintScript;
      txo.visibleArgs = templateData.visibleArgs;
      txo.publicKey = templateData.publicKey;
    }
    tx.from(txo)
  });

  tx.to(toAddress, parseInt(sendAmount.getValue()), toType);

  if (changeAddr) {
    tx.change(changeAddr);
  }
  if (manualFee !== "-1") {
    tx.fee(parseInt(manualFee));
  }

  tx.lockUntilBlockHeight(height).sign(privKeys, Signature.SIGHASH_NEXA_ALL);

  return tx;
}
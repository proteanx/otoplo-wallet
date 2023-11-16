import nexcore from "nexcore-lib";
import HDPrivateKey from "nexcore-lib/types/lib/hdprivatekey";
import PublicKey from "nexcore-lib/types/lib/publickey";
import StorageProvider from "../providers/storage.provider";
import { ContractEntity, TransactionEntity } from "../models/db.entities";
import { dbProvider } from "../app/App";
import Script from "nexcore-lib/types/lib/script/script";
import { rostrumProvider } from "../providers/rostrum.provider";
import { classifyTransaction } from "./wallet.utils";
import { VaultInfo } from "../wallet/vault/Vault";
import { getAddressBuffer } from "./common.utils";

const HODL_FIRST_BLOCK = 274710;
const HODL_SCRIPT_PREFIX =  "0014461ad25081cb0119d034385ff154c8d3ad6bdd76";

export function generateHodlKey(accountKey: HDPrivateKey, index: number) {
  return accountKey.deriveChild(0, false).deriveChild(index, false);
}

export function getHodlTemplate() {
  return nexcore.Script.empty()
    .add(nexcore.Opcode.map.OP_FROMALTSTACK).add(nexcore.Opcode.map.OP_DROP)
    .add(nexcore.Opcode.map.OP_FROMALTSTACK).add(nexcore.Opcode.map.OP_CHECKLOCKTIMEVERIFY).add(nexcore.Opcode.map.OP_DROP)
    .add(nexcore.Opcode.map.OP_FROMALTSTACK).add(nexcore.Opcode.map.OP_CHECKSIGVERIFY);
}

export function getHodlTemplateHash() {
  var template = getHodlTemplate();
  return nexcore.crypto.Hash.sha256ripemd160(template.toBuffer());
}

export function generateHodlConstraint(pubKey: PublicKey) {
  return nexcore.Script.empty().add(pubKey.toBuffer());
}

export function getHodlConstraintHash(pubKey: PublicKey) {
  var constraint = generateHodlConstraint(pubKey);
  return nexcore.crypto.Hash.sha256ripemd160(constraint.toBuffer());
}

export function generateVisibleArgs(args: number[]) {
  let bn: any = nexcore.crypto.BN;
  return args.map(arg => arg <= 16 ? nexcore.Opcode.smallInt(arg) : bn.fromNumber(arg).toScriptNumBuffer());
}

export function generateHodlAddress(pubKey: PublicKey, args: any[]) {
  if (args.length !== 2) {
    return undefined;
  }

  var templateHash = getHodlTemplateHash();
  var constraintHash = getHodlConstraintHash(pubKey);
  var visibleArgs = generateVisibleArgs(args);
  var address = nexcore.Address.fromScriptTemplate(templateHash, constraintHash, visibleArgs);
  return address.toNexaAddress();
}

export async function getHodlNextIndex() {
  let state = await StorageProvider.getHodlState();
  return state.idx + 1;
}

export async function saveHodlAddress(index: number, address: string) {
  let vault: ContractEntity = {address: address, type: 'vault', archive: 0, confirmed: 0, unconfirmed: 0};
  await StorageProvider.setHodlState({idx: index});
  await dbProvider.addLocalVault(vault);
  return true;
}

export async function getHodlVaults() {
  return await dbProvider.getLocalVaults(false);
}

export async function getHodlArchive() {
  let archives = await dbProvider.getLocalVaults(true);
  return archives?.map(a => a.address); 
}

export function getVaultBlockAndIndex(vaultAddress: string) {
  let buf = getAddressBuffer(vaultAddress);
  let scirptTemplateBuf = nexcore.Script.fromBuffer(buf).getData();
  let data = (nexcore.Script.fromBuffer(scirptTemplateBuf).getData() as any).args;

  let bn: any = nexcore.crypto.BN;
  let block: number = bn.fromScriptNumBuffer(data.chunks[0].buf).toNumber();
  let index: number = nexcore.Opcode.isSmallIntOp(data.chunks[1].opcodenum)
                ? data.chunks[1].opcodenum - nexcore.Opcode.map.OP_1 + 1
                : bn.fromScriptNumBuffer(data.chunks[1].buf).toNumber();

  return {block: block, index: index};
}

export function estimateDateByFutureBlock(current: number, future: number) {
  var estimateMins = (future - current) * 2
  var time = new Date();
  time.setMinutes(time.getMinutes() + estimateMins);
  return time.toLocaleDateString();
}

export async function discoverVaults(addresses: string[], vaultAccountKey: HDPrivateKey) {
  let vaultsPromises: Promise<Set<string>>[] = [];
  for (let address of addresses) {
    let p = checkVaultsForAddress(address);
    vaultsPromises.push(p);
  }

  let res = await Promise.all(vaultsPromises);

  let maxIndex = 0;
  let hodls = new Set<string>();

  res.forEach(set => {
    set.forEach(hex => {
      let hodl = getVaultAddressAndIndex(vaultAccountKey, hex);
      if (hodl) {
        hodls.add(hodl[0]);
        maxIndex = Math.max(maxIndex, hodl[1]);
      }
    });
  });

  return {index: maxIndex, vaults: hodls};
}

async function checkVaultsForAddress(address: string): Promise<Set<string>> {
  let vaults = new Set<string>();

  let history = await rostrumProvider.getTransactionsHistory(address);
  for (let txHistory of history) {
    if (txHistory.height > 0 && txHistory.height < HODL_FIRST_BLOCK) {
      continue;
    }

    let tx = await rostrumProvider.getTransaction(txHistory.tx_hash);
    let hodls = tx.vout.filter(out => out.scriptPubKey.hex.startsWith(HODL_SCRIPT_PREFIX));
    for (let hodl of hodls) { 
      vaults.add(hodl.scriptPubKey.hex);
    }
  }
  
  return vaults;
}

export function getVaultAddressAndIndex(vaultAccountKey: HDPrivateKey, hex: string): [string, number] | null {
  var buf = nexcore.Script.empty().add(nexcore.Script.fromHex(hex).toBuffer()).toBuffer();
  var actualAddress = new nexcore.Address(buf).toNexaAddress();

  var data: Script = (nexcore.Script.fromHex(hex).getData() as any).args;

  let bn: any = nexcore.crypto.BN;
  var block: number = bn.fromScriptNumBuffer(data.chunks[0].buf).toNumber();
  var index: number = nexcore.Opcode.isSmallIntOp(data.chunks[1].opcodenum) 
                ? data.chunks[1].opcodenum - nexcore.Opcode.map.OP_1 + 1 
                : bn.fromScriptNumBuffer(data.chunks[1].buf).toNumber();

  var visibleArgs = [block, index];
  var key = generateHodlKey(vaultAccountKey, index);
  var expectedAddress = generateHodlAddress(key.getPublicKey(), visibleArgs);

  return actualAddress === expectedAddress ? [expectedAddress, index] : null;
}

export async function fetchVaultTransactions(address: string) {
  let txHistory = await rostrumProvider.getTransactionsHistory(address);

  let transactions: Promise<TransactionEntity>[] = [];
  for (let tx of txHistory) {
    let txEntry = classifyTransaction(tx, [address]);
    transactions.push(txEntry);
  }

  return await Promise.all(transactions);
}

export async function fetchAllVaultsBalances(addresses: string[]) {
  let vaults: Promise<VaultInfo>[] = [];
  for (let address of addresses) {
    let vault = fetchVaultBalance(address);
    vaults.push(vault);
  }

  return await Promise.all(vaults);
}

async function fetchVaultBalance(address: string): Promise<VaultInfo> {
  let balance = await rostrumProvider.getBalance(address);
  return { address: address, balance: balance };
}
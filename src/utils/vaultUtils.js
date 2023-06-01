import { Address, Opcode, Script, crypto } from "nexcore-lib";
import { addLocalVault, getHodlState, getLocalVaults, setHodlState } from "./localdb";
import { checkVaults } from "./functions";

export function generateHodlKey(accountKey, index) {
  return accountKey.deriveChild(0, false).deriveChild(index, false);
}

export function getHodlTemplate() {
  return Script.empty()
      .add(Opcode.OP_FROMALTSTACK).add(Opcode.OP_DROP)
      .add(Opcode.OP_FROMALTSTACK).add(Opcode.OP_CHECKLOCKTIMEVERIFY).add(Opcode.OP_DROP)
      .add(Opcode.OP_FROMALTSTACK).add(Opcode.OP_CHECKSIGVERIFY);
}

export function getHodlTemplateHash() {
  var template = getHodlTemplate();
  return crypto.Hash.sha256ripemd160(template.toBuffer());
}

export function generateHodlConstraint(pubKey) {
  return Script.empty().add(pubKey.toBuffer());
}

export function getHodlConstraintHash(pubKey) {
  var constraint = generateHodlConstraint(pubKey);
  return crypto.Hash.sha256ripemd160(constraint.toBuffer());
}

export function generateVisibleArgs(args) {
  return args.map(arg => arg <= 16 ? Opcode.smallInt(arg) : crypto.BN.fromNumber(arg).toScriptNumBuffer());
}

export function generateHodlAddress(pubKey, args) {
  if (args.length !== 2) {
    return false;
  }

  var templateHash = getHodlTemplateHash();
  var constraintHash = getHodlConstraintHash(pubKey);
  var visibleArgs = generateVisibleArgs(args);
  var address = Address.fromScriptTemplate(templateHash, constraintHash, visibleArgs);
  return address.toNexaAddress();
}

export async function getHodlNextIndex() {
  var state = await getHodlState();
  return state.idx + 1;
}

export async function saveHodlAddress(index, address) {
  var vault = {address: address, type: 'vault', archive: 0, confirmed: 0, unconfirmed: 0};
  await setHodlState({idx: index});
  await addLocalVault(vault);
  return true;
}

export async function getHodlVaults() {
  return await getLocalVaults(false);
}

export async function getHodlArchive() {
  var archives = await getLocalVaults(true);
  return archives.map(a => a.address); 
}

export function getVaultBlockAndIndex(vaultAddress) {
  var buf = Address.decodeNexaAddress(vaultAddress).hashBuffer;
  var scirptTemplateBuf = Script.fromBuffer(buf).getData();
  var data = Script.fromBuffer(scirptTemplateBuf).getData().args;

  var block = crypto.BN.fromScriptNumBuffer(data.chunks[0].buf).toNumber();
  var index = Opcode.isSmallIntOp(data.chunks[1].opcodenum) 
                ? data.chunks[1].opcodenum - Opcode.OP_1 + 1 
                : crypto.BN.fromScriptNumBuffer(data.chunks[1].buf).toNumber();

  return {block: block, index: index};
}

export function estimateDateByFutureBlock(current, future) {
  var estimateMins = (future - current) * 2
  var time = new Date();
  time.setMinutes(time.getMinutes() + estimateMins);
  return time.toLocaleDateString();
}

export async function discoverVaults(rAddrs, cAddrs, vaultAccountKey) {
  var res = await checkVaults(rAddrs, cAddrs);
  var maxIndex = 0;
  var hodls = [];

  res.forEach(hex => {
    var hodl = getVaultAddressAndIndex(vaultAccountKey, hex);
    if (hodl) {
      hodls.push(hodl[0]);
      maxIndex = Math.max(maxIndex, hodl[1]);
    }
  });

  return {index: maxIndex, vaults: hodls};
}

export function getVaultAddressAndIndex(vaultAccountKey, hex) {
  var buf = Script.empty().add(Script.fromHex(hex).toBuffer()).toBuffer();
  var actualAddress = new Address(buf).toNexaAddress();

  var data = Script.fromHex(hex).getData().args;

  var block = crypto.BN.fromScriptNumBuffer(data.chunks[0].buf).toNumber();
  var index = Opcode.isSmallIntOp(data.chunks[1].opcodenum) 
                ? data.chunks[1].opcodenum - Opcode.OP_1 + 1 
                : crypto.BN.fromScriptNumBuffer(data.chunks[1].buf).toNumber();

  var visibleArgs = [block, index];
  var key = generateHodlKey(vaultAccountKey, index);
  var expectedAddress = generateHodlAddress(key.publicKey, visibleArgs);

  return actualAddress === expectedAddress ? [expectedAddress, index] : null;
}
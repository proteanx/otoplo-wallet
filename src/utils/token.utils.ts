import { NftEntity } from "../models/db.entities";
import { dbProvider } from "../providers/db.provider";
import NiftyProvider from "../providers/nifty.provider";
import { currentTimestamp } from "./common.utils";
import NexCore from 'nexcore-lib';

export async function fetchAndSaveNFT(token: string, parent: string) {
    // support only nifty for now
    try {
        let hexId = NexCore.Address.decodeNexaAddress(token).getHashBuffer().toString('hex');
        let nft = await NiftyProvider.fetchNFT(hexId);
        let nftEntity: NftEntity = {
            addedTime: currentTimestamp(),
            parentGroup: parent,
            token: token,
            tokenIdHex: hexId,
            zipData: nft
        }
        await dbProvider.saveNft(nftEntity);
    } catch (e) {
        console.log('failed to fetch NFT from nifty');
    }
}

export async function removeLocalNFT(token: string) {
    try {
        let hexId = NexCore.Address.decodeNexaAddress(token).getHashBuffer().toString('hex');
        await dbProvider.deleteNft(hexId);
    } catch (e) {
        console.log('failed to remove local NFT');
    }
}
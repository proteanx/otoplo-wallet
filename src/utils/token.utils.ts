import { CapacitorHttp } from "@capacitor/core";
import { NftEntity, TokenEntity } from "../models/db.entities";
import { dbProvider } from "../app/App";
import NiftyProvider from "../providers/nifty.provider";
import { rostrumProvider } from "../providers/rostrum.provider";
import { currentTimestamp, getAddressBuffer } from "./common.utils";
import NexCore from 'nexcore-lib';

const audioExtensions = ['.ogg', '.mp3']
const videoExtensions = ['.avif', '.webp', '.mp4', '.mpeg', '.mpg', '.webm'];
const imageExtensions = ['.svg', '.gif', '.png', '.apng', '.jpg', '.jpeg'];

export function tokenIdToHex(token: string) {
    if (NexCore.util.js.isHexa(token)) {
        return token;
    }
    return getAddressBuffer(token).toString('hex');
}

export async function fetchAndSaveNFT(token: string, parent: string, time: number) {
    // support only nifty for now
    try {
        let exist = await dbProvider.isNftExist(token);
        if (exist) {
            return;
        }

        let hexId = tokenIdToHex(token);
        let nft = await NiftyProvider.fetchNFT(hexId);
        let nftEntity: NftEntity = {
            addedTime: time,
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

export function classifyNftType(filename: string) {
    let extension = filename.slice(filename.lastIndexOf('.')).toLowerCase();

    if (videoExtensions.includes(extension)) {
        return 'video';
    } else if (audioExtensions.includes(extension)) {
        return 'audio';
    } else if (imageExtensions.includes(extension)) {
        return 'image';
    } else {
        return 'unknown';
    }
}

export async function removeLocalNFT(token: string) {
    try {
        let hexId = tokenIdToHex(token);
        await dbProvider.deleteNft(hexId);
    } catch (e) {
        console.log('failed to remove local NFT');
    }
}

export async function getTokenInfo(token: string) {
    try {
        let genesis = await rostrumProvider.getTokenGenesis(token);
        let groupId = Buffer.from(genesis.token_id_hex, 'hex');
        let parent = "";
        let iconUrl = "";

        if (NexCore.GroupToken.isSubgroup(groupId)) {
            parent = new NexCore.Address(groupId.subarray(0, 32), NexCore.Networks.defaultNetwork, NexCore.Address.GroupIdAddress).toString();
        }

        if (genesis.document_url) {
            try {
                let res = await CapacitorHttp.get({ url: genesis.document_url });
                if (res.status == 200 && res.data && res.data[0]?.icon) {
                    let icon = res.data[0].icon;
                    if (typeof icon === 'string') {
                        if (icon.startsWith('http')) {
                            iconUrl = icon;
                        } else {
                            let url = new URL(genesis.document_url);
                            iconUrl = `${url.origin}${icon}`;
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to load metadata", e)
            }
        }

        let tokenEntity: TokenEntity = {
            token: genesis.group,
            tokenIdHex: genesis.token_id_hex,
            decimals: genesis.decimal_places ?? 0,
            parentGroup: parent,
            name: genesis.name ?? "",
            ticker: genesis.ticker ?? "",
            addedTime: 0,
            iconUrl: iconUrl
        };

        return tokenEntity;
    } catch (e) {
        console.error(e)
        return false;
    }
}
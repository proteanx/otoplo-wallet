import { CapacitorHttp } from "@capacitor/core";
import { NftEntity, TokenEntity } from "../models/db.entities";
import { dbProvider } from "../app/App";
import NiftyProvider from "../providers/nifty.provider";
import { rostrumProvider } from "../providers/rostrum.provider";
import { currentTimestamp, getAddressBuffer } from "./common.utils";
import NexCore from 'nexcore-lib';

export function tokenIdToHex(token: string) {
    return getAddressBuffer(token).toString('hex');
}

export async function fetchAndSaveNFT(token: string, parent: string) {
    // support only nifty for now
    try {
        let hexId = tokenIdToHex(token);
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
import nexcore from 'nexcore-lib';
import { TokenEntity } from "../models/db.entities";
import { CapacitorHttp, HttpResponseType } from "@capacitor/core";
import { getAddressBuffer } from '../utils/common.utils';

export default class NiftyProvider {

    public static readonly NIFTY_TOKEN: TokenEntity = {
        name: 'NiftyArt',
        ticker: 'NIFTY',
        iconUrl: 'https://niftyart.cash/td/niftyicon.svg',
        parentGroup: '',
        token: 'nexa:tr9v70v4s9s6jfwz32ts60zqmmkp50lqv7t0ux620d50xa7dhyqqqcg6kdm6f',
        tokenIdHex: 'cacf3d958161a925c28a970d3c40deec1a3fe06796fe1b4a7b68f377cdb90000',
        decimals: 0,
        addedTime: 0
    }

    private static readonly endpoint = import.meta.env.PROD ? "https://niftyart.cash/_public/" : "/_public/";

    public static async fetchNFT(id: string) {
        let data = await this.performGet<ArrayBuffer>(id, "arraybuffer");
        return Buffer.from(data);
    }

    public static isNiftySubgroup(group: string) {
        try {
            let addrBuf = nexcore.util.js.isHexa(group) ? Buffer.from(group, 'hex') : getAddressBuffer(group);
            if (!nexcore.GroupToken.isSubgroup(addrBuf)) {
                return false;
            }
    
            return addrBuf.subarray(0, 32).toString('hex') === this.NIFTY_TOKEN.tokenIdHex;
        } catch {
            return false;
        }
    }

    private static async performGet<T>(url: string, responseType?: HttpResponseType) {
        try {
            let res = await CapacitorHttp.get({ url: this.endpoint + url, responseType: responseType });
            if (res.status !== 200) {
                throw new Error(`Failed to perform GET. status: ${res.status}`);
            }
            return res.data as T;
        } catch (e) {
            console.error(e);
            throw new Error("Unexpected Error: " + (e instanceof Error ? e.message : "see log for details"));
        }
    }
}
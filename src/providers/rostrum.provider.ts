import { ElectrumClient } from "@vgrunner/electrum-cash";
import StorageProvider from "./storage.provider";
import { BlockTip, IFirstUse, IListUnspentRecord, ITXHistory, ITokenListUnspent, ITransaction, IUtxo, RostrumParams } from "../models/rostrum.entities";
import { Balance } from "../models/wallet.entities";

type RPCParameter = string | number | boolean | null;

export class RostrumProvider {

    private client: ElectrumClient;

    public constructor(params: RostrumParams) {
        this.client = new ElectrumClient("com.otoplo.wallet", "1.4.3", params.host, params.port, params.scheme, undefined, 5000, true);
    }

    public async getVersion() {
        return await this.execute<string[]>('server.version');
    }

    public async getBlockTip() {
        return await this.execute<BlockTip>('blockchain.headers.tip');
    }

    public async getBalance(address: string) {
        return await this.execute<Balance>('blockchain.address.get_balance', address, 'exclude_tokens');
    }
    
    public async getTransactionsHistory(address: string) {
        return await this.execute<ITXHistory[]>('blockchain.address.get_history', address);
    }
    
    public async getFirstUse(address: string) {
        return await this.execute<IFirstUse>('blockchain.address.get_first_use', address);
    }
    
    public async getTransaction(id: string, verbose: boolean = true) {
        return await this.execute<ITransaction>('blockchain.transaction.get', id, verbose);
    }

    public async getUtxo(outpoint: string) {
        return await this.execute<IUtxo>('blockchain.utxo.get', outpoint);
    }

    public async getNexaUtxos(address: string) {
        return await this.execute<IListUnspentRecord[]>('blockchain.address.listunspent', address, 'exclude_tokens');
    }

    public async getTokenUtxos(address: string, token: string) {
        let listunspent = await this.execute<ITokenListUnspent>('token.address.listunspent', address, null, token);
        return listunspent.unspent;
    }

    public async broadcast(txHex: string) {
        return await this.execute<string>('blockchain.transaction.broadcast', txHex);
    }

    public async connect() {
        try {
            await this.client.connect();
        } catch (e) {
            if (e instanceof Error) {
                console.info(e.message);
            } else {
                console.error(e);
            }
            throw e;
        }
    }

    public async disconnect() {
        try {
            return await this.client.disconnect();
        } catch (e) {
            console.log(e)
            return false;
        }
    }

    private async execute<T>(method: string, ...parameters: RPCParameter[]) {
        var res = await this.client.request(method, ...parameters);
        if (res instanceof Error) {
            throw res;
        }
        return res as T;
    }
}

export const rostrumProvider = new RostrumProvider(StorageProvider.getRostrumParams());
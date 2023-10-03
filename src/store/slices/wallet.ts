import HDPrivateKey from "nexcore-lib/types/lib/hdprivatekey"
import { Balance, WalletKeys } from "../../models/wallet.entities"
import { RootState } from "../store";
import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as WalletUtils from "../../utils/wallet.utils";
import StorageProvider from "../../providers/storage.provider";
import { TransactionEntity } from "../../models/db.entities";
import bigDecimal from "js-big-decimal";
import { rostrumProvider } from "../../providers/rostrum.provider";
import { getNexaPrice } from "../../utils/functions";

export interface WalletState {
    accountKey?: HDPrivateKey;
    keys: WalletKeys;
    balance: Balance;
    height: number;
    price: bigDecimal;
}
  
const initialState: WalletState = {
    keys: {receiveKeys: [], changeKeys: []},
    balance: {confirmed: "0", unconfirmed: "0"},
    height: 0,
    price: new bigDecimal(0)
}

export const fetchHeightAndPrice = createAsyncThunk('wallet/fetchHeightAndPrice', async (_, thunkAPI) => {
    let tip: number;
    try {
        let bTip = await rostrumProvider.getBlockTip();
        tip = bTip.height;
    } catch {
        tip = 0;
    }
    
    let price: bigDecimal;
    try {
        let p = await getNexaPrice();
        price = new bigDecimal(p);
    } catch {
        price = new bigDecimal(0);
    }
    return { height: tip, price: price };
});

export const fetchBalance = createAsyncThunk('wallet/fetchBalance', async (_, thunkAPI) => {
    let rootState = thunkAPI.getState() as RootState;
    let state = rootState.wallet;

    let rAddrs = state.keys.receiveKeys.map(k => k.address);
    let cAddrs = state.keys.changeKeys.map(k => k.address);

    let balances = await WalletUtils.fetchTotalBalance(rAddrs.concat(cAddrs));
    return WalletUtils.sumBlance(balances);
});

export const syncWallet = createAsyncThunk('wallet/syncWallet', async (_, thunkAPI) => {
    let rootState = thunkAPI.getState() as RootState;
    let state = rootState.wallet;

    let fromHeight = (await StorageProvider.getTransactionsState()).height;

    let receiveAddresses = state.keys.receiveKeys.map(ak => ak.address);
    let changeAddresses = state.keys.changeKeys.map(ak => ak.address);
    let allAddresses = receiveAddresses.concat(changeAddresses);

    let rTxs = WalletUtils.fetchTransactionsHistory(receiveAddresses, fromHeight);
    let cTxs = WalletUtils.fetchTransactionsHistory(changeAddresses, fromHeight);

    let [rData, cData] = await Promise.all([rTxs, cTxs]);
    let rIdx = rData.index + 1, cIdx = cData.index + 1;

    let txHistory = rData.txs;
    for (let tx of cData.txs.values()) {
        txHistory.set(tx.tx_hash, tx);
    }

    let updateBalance = false;
    let txPromises: Promise<TransactionEntity>[] = [];
    let correlationId = crypto.randomUUID();
    for (let tx of txHistory.values()) {
        updateBalance = true;
        let t = WalletUtils.classifyAndSaveTransaction(tx, allAddresses, correlationId);
        txPromises.push(t);
    }

    let updateWalletKeys = false;
    let walletKeys = state.keys;
    let balance: Balance = { confirmed: "0", unconfirmed: "0" };
    if (updateBalance) {
        let walletIdx = await StorageProvider.getWalletIndexes();
        if (walletIdx.rIndex < rIdx || walletIdx.cIndex < cIdx) {
            updateWalletKeys = true;
            walletKeys = WalletUtils.generateKeysAndAddresses(state.accountKey as HDPrivateKey, 0, rIdx, 0, cIdx);
            await StorageProvider.saveWalletIndexes({ rIndex: rIdx, cIndex: cIdx });
        }
        let rAddrs = walletKeys.receiveKeys.map(k => k.address);
        let cAddrs = walletKeys.changeKeys.map(k => k.address);
        let balances = await WalletUtils.fetchTotalBalance(rAddrs.concat(cAddrs));
        balance = WalletUtils.sumBlance(balances);
    }

    await Promise.all(txPromises);

    if (fromHeight < Math.max(rData.lastHeight, cData.lastHeight)) {
        await StorageProvider.setTransactionsState({ height: Math.max(rData.lastHeight, cData.lastHeight) });
    }

    return {updateBalance: updateBalance, updateKeys: updateWalletKeys, balance: balance, walletKeys: walletKeys};
});

export const walletSlice = createSlice({
    name: 'wallet',
    initialState,
    reducers: {
        setAccountKey: (state, action: PayloadAction<HDPrivateKey>) => {
            state.accountKey = action.payload;
        },
        setKeys: (state, action: PayloadAction<WalletKeys>) => {
            state.keys = action.payload;
        },
    },
    extraReducers(builder) {
        builder
            .addCase(fetchBalance.fulfilled, (state, action) => {
                state.balance = action.payload;
            })
            .addCase(fetchBalance.rejected, (_state, action) => {
                console.log(action.error.message);
            })
            .addCase(syncWallet.fulfilled, (state, action) => {
                let payload = action.payload
                if (payload.updateBalance) {
                    state.balance = payload.balance;
                }
                if (payload.updateKeys) {
                    state.keys = payload.walletKeys;
                }
                StorageProvider.removeLock(StorageProvider.SYNC_LOCK);
            })
            .addCase(syncWallet.rejected, (_state, action) => {
                console.log(action.error.message);
                StorageProvider.removeLock(StorageProvider.SYNC_LOCK);
            })
            .addCase(fetchHeightAndPrice.fulfilled, (state, action) => {
                state.height = action.payload.height;
                state.price = action.payload.price;
            })
            .addCase(fetchHeightAndPrice.rejected, (_state, action) => {
                console.log(action.error.message);
            })
    },
});

export const { setAccountKey, setKeys } = walletSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const walletState = (state: RootState) => state.wallet;

export default walletSlice.reducer;
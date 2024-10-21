import HDPrivateKey from "nexcore-lib/types/lib/hdprivatekey"
import { Balance, WalletKeys } from "../../models/wallet.entities"
import { RootState } from "../store";
import { PayloadAction, createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import * as WalletUtils from "../../utils/wallet.utils";
import StorageProvider from "../../providers/storage.provider";
import { TransactionEntity } from "../../models/db.entities";
import bigDecimal from "js-big-decimal";
import { rostrumProvider } from "../../providers/rostrum.provider";
import { sleep } from "../../utils/common.utils";
import { initializePrices, getNexaPrice } from "../../utils/price.utils";

export interface WalletState {
    accountKey?: HDPrivateKey;
    keys: WalletKeys;
    balance: Balance;
    tokensBalance: Record<string, Balance>;
    height: number;
    price: Record<string, bigDecimal>;
    sync: boolean;
}
  
const initialState: WalletState = {
    keys: {receiveKeys: [], changeKeys: []},
    balance: {confirmed: "0", unconfirmed: "0"},
    tokensBalance: {},
    height: 0,
    price: initializePrices(),
    sync: false
}

export const fetchHeightAndPrice = createAsyncThunk('wallet/fetchHeightAndPrice', async (_, thunkAPI) => {
  let tip: number;
  try {
    let bTip = await rostrumProvider.getBlockTip();
    tip = bTip.height;
  } catch {
    tip = 0;
  }
  
  let prices = initializePrices();
  try {
    let p = await getNexaPrice();
    Object.keys(p).forEach(currency => {
      prices[currency] = new bigDecimal(p[currency]);
    });
  } catch {
    // prices remain at 0
  }
  return { height: tip, price: prices };
});

export const fetchBalance = createAsyncThunk('wallet/fetchBalance', async (withDelay: boolean, thunkAPI) => {
    if (withDelay) {
        await sleep(3000);
    }
    let rootState = thunkAPI.getState() as RootState;
    let state = rootState.wallet;

    let walletIdx = await StorageProvider.getWalletIndexes();
    let wKeys = WalletUtils.generateKeysAndAddresses(state.accountKey!, 0, walletIdx.rIndex, 0, walletIdx.cIndex);

    let balances = await WalletUtils.fetchTotalBalance(wKeys.receiveKeys.concat(wKeys.changeKeys));
    let tokenBalances = wKeys.receiveKeys.concat(wKeys.changeKeys).map(k => k.tokensBalance);

    return { balance: WalletUtils.sumBalance(balances), tokensBalance: WalletUtils.sumTokensBalance(tokenBalances), keys: wKeys };
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
    for (let tx of txHistory.values()) {
        updateBalance = true;
        let t = WalletUtils.classifyAndSaveTransaction(tx, allAddresses);
        txPromises.push(t);
    }

    let updateWalletKeys = false;
    let walletKeys = state.keys;
    let balance: Balance = { confirmed: "0", unconfirmed: "0" };
    let tokensBalance: Record<string, Balance> = {};
    if (updateBalance) {
        updateWalletKeys = true;
        let walletIdx = await StorageProvider.getWalletIndexes();
        if (walletIdx.rIndex < rIdx || walletIdx.cIndex < cIdx) {
            walletKeys = WalletUtils.generateKeysAndAddresses(state.accountKey!, 0, rIdx, 0, cIdx);
            await StorageProvider.saveWalletIndexes({ rIndex: rIdx, cIndex: cIdx });
        } else {
            walletKeys = WalletUtils.generateKeysAndAddresses(state.accountKey!, 0, walletIdx.rIndex, 0, walletIdx.cIndex);
        }
        let balances = await WalletUtils.fetchTotalBalance(walletKeys.receiveKeys.concat(walletKeys.changeKeys));
        let tokenBalances = walletKeys.receiveKeys.concat(walletKeys.changeKeys).map(k => k.tokensBalance);
        balance = WalletUtils.sumBalance(balances);
        tokensBalance = WalletUtils.sumTokensBalance(tokenBalances)
    }

    await Promise.all(txPromises);

    if (fromHeight < Math.max(rData.lastHeight, cData.lastHeight)) {
        await StorageProvider.setTransactionsState({ height: Math.max(rData.lastHeight, cData.lastHeight) });
    }

    return {updateBalance: updateBalance, updateKeys: updateWalletKeys, balance: balance, tokensBalance: tokensBalance, walletKeys: walletKeys};
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
        setSync: (state) => {
            state.sync = true;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchBalance.fulfilled, (state, action) => {
                state.balance = action.payload.balance;
                state.tokensBalance = action.payload.tokensBalance;
                state.keys = action.payload.keys;
            })
            .addCase(fetchBalance.rejected, (_state, action) => {
                console.log(action.error);
            })
            .addCase(syncWallet.pending, (state) => {
                state.sync = true;
            })
            .addCase(syncWallet.fulfilled, (state, action) => {
                let payload = action.payload
                if (payload.updateBalance) {
                    state.balance = payload.balance;
                    state.tokensBalance = action.payload.tokensBalance;
                }
                if (payload.updateKeys) {
                    state.keys = payload.walletKeys;
                }
                StorageProvider.setLastCheck();
            })
            .addCase(syncWallet.rejected, (_state, action) => {
                console.log(action.error.message);
            })
            .addCase(fetchHeightAndPrice.fulfilled, (state, action) => {
                state.height = action.payload.height;
                state.price = action.payload.price;
            })
            .addCase(fetchHeightAndPrice.rejected, (_state, action) => {
                console.log(action.error.message);
            });
        
        builder.addMatcher(syncWallet.settled, (state) => {
            state.sync = false;
            StorageProvider.removeLock(StorageProvider.SYNC_LOCK);
        });
    },
});

export const { setAccountKey, setKeys, setSync } = walletSlice.actions;

// Other code such as selectors can use the imported `RootState` type
export const walletState = (state: RootState) => state.wallet;

export default walletSlice.reducer;
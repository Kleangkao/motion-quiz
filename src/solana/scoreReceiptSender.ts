import { Connection, Transaction } from '@solana/web3.js';
import type { Wallet } from '@wallet-standard/base';
import {
  SolanaSignAndSendTransaction,
  type SolanaSignAndSendTransactionFeature,
} from '@solana/wallet-standard-features';
import {
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
} from '@solana/wallet-standard-features';
import bs58 from 'bs58';
import { getSolanaCluster } from '@/solana/env';
import { SOLANA_DEVNET_CHAIN } from '@/solana/config';
import {
  browserWalletSupportsTransactions,
  signAndSendTransactionWithBrowserWallet,
  type BrowserWalletId,
} from '@/solana/web-wallet-browser';
import { friendlyWalletError } from '@/solana/walletErrors';

export interface ScoreRecordingWalletContext {
  browserWalletId: BrowserWalletId | null;
  wallet: Wallet | null;
}

export function walletSupportsScoreRecording(ctx: ScoreRecordingWalletContext): boolean {
  if (ctx.browserWalletId) {
    return browserWalletSupportsTransactions(ctx.browserWalletId);
  }
  if (!ctx.wallet) return false;
  return Boolean(
    ctx.wallet.features[SolanaSignAndSendTransaction] || ctx.wallet.features[SolanaSignTransaction],
  );
}

export async function sendScoreReceiptTransaction(
  ctx: ScoreRecordingWalletContext,
  transaction: Transaction,
  rpcUrl: string,
): Promise<string> {
  try {
    if (ctx.browserWalletId) {
      return await signAndSendTransactionWithBrowserWallet(ctx.browserWalletId, transaction);
    }

    if (!ctx.wallet) {
      throw new Error('Connect a wallet first.');
    }

    const account = ctx.wallet.accounts[0];
    if (!account) throw new Error('No wallet account');

    const chain = getSolanaCluster() === 'devnet' ? SOLANA_DEVNET_CHAIN : 'solana:mainnet';
    const serialized = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    const signAndSend = ctx.wallet.features[SolanaSignAndSendTransaction] as
      | SolanaSignAndSendTransactionFeature[typeof SolanaSignAndSendTransaction]
      | undefined;

    if (signAndSend?.signAndSendTransaction) {
      const outputs = await signAndSend.signAndSendTransaction({
        account,
        chain,
        transaction: serialized,
      });
      const signature = outputs[0]?.signature;
      if (!signature) throw new Error('Transaction failed');
      return bs58.encode(signature);
    }

    const signOnly = ctx.wallet.features[SolanaSignTransaction] as
      | SolanaSignTransactionFeature[typeof SolanaSignTransaction]
      | undefined;

    if (signOnly?.signTransaction) {
      const outputs = await signOnly.signTransaction({
        account,
        chain,
        transaction: serialized,
      });
      const signed = outputs[0]?.signedTransaction;
      if (!signed) throw new Error('Transaction signing failed');
      const connection = new Connection(rpcUrl, 'confirmed');
      const signature = await connection.sendRawTransaction(signed, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      await connection.confirmTransaction(signature, 'confirmed');
      return signature;
    }

    throw new Error('This wallet cannot record scores yet.');
  } catch (error) {
    throw new Error(friendlyWalletError(error), { cause: error });
  }
}

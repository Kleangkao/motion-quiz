import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import { MEMO_PROGRAM_ID, serializeScoreReceiptPayload, type ScoreReceiptPayload } from '@/solana/scoreReceipt';
import { getSolanaRpcUrl } from '@/solana/env';

const MEMO_PROGRAM = new PublicKey(MEMO_PROGRAM_ID);

export function createMemoInstruction(memo: string, signer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: signer, isSigner: true, isWritable: true }],
    programId: MEMO_PROGRAM,
    data: Buffer.from(memo, 'utf8'),
  });
}

export async function buildScoreReceiptTransaction(
  walletAddress: string,
  payload: ScoreReceiptPayload,
  rpcUrl: string = getSolanaRpcUrl(),
): Promise<Transaction> {
  const memo = serializeScoreReceiptPayload(payload);
  if (memo.length >= 900) {
    throw new Error('Score receipt memo is too large for a Solana transaction.');
  }

  const payer = new PublicKey(walletAddress);
  const connection = new Connection(rpcUrl, 'confirmed');
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  const transaction = new Transaction({
    feePayer: payer,
    blockhash,
    lastValidBlockHeight,
  });
  transaction.add(createMemoInstruction(memo, payer));
  return transaction;
}

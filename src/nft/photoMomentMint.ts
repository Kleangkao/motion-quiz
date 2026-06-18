import { createCreateMetadataAccountV3Instruction } from '@metaplex-foundation/mpl-token-metadata';
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import type { SolanaCluster } from '@shared/scoreReceipt';
import { NFT_DISPLAY_NAME, NFT_SYMBOL } from '@/nft/types';
import { getSolanaAppConfig } from '@/solana/solanaConfig';

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
);

export interface PhotoMomentMintPlan {
  transaction: Transaction;
  mintKeypair: Keypair;
  mintAddress: string;
  metadataAddress: string;
  cluster: SolanaCluster;
}

function metadataSeedBytes(): Uint8Array {
  return new TextEncoder().encode('metadata');
}

function findMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [metadataSeedBytes(), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID,
  );
  return pda;
}

export function assertMintClusterSupported(cluster: SolanaCluster): void {
  if (cluster !== 'devnet' && cluster !== 'mainnet-beta') {
    throw new Error('Unsupported Solana cluster for NFT minting.');
  }
}

export async function buildPhotoMomentMintTransaction(params: {
  walletAddress: string;
  metadataUri: string;
  cluster?: SolanaCluster;
  rpcUrl?: string;
}): Promise<PhotoMomentMintPlan> {
  const configResult = getSolanaAppConfig();
  if (!configResult.ok) {
    throw new Error(configResult.message);
  }

  const cluster = params.cluster ?? configResult.config.cluster;
  const rpcUrl = params.rpcUrl ?? configResult.config.rpcUrl;
  assertMintClusterSupported(cluster);

  if (!params.metadataUri.trim()) {
    throw new Error('Metadata URI is required before minting.');
  }

  const payer = new PublicKey(params.walletAddress);
  const mintKeypair = Keypair.generate();
  const mintPublicKey = mintKeypair.publicKey;
  const metadataAddress = findMetadataPda(mintPublicKey);
  const associatedToken = getAssociatedTokenAddressSync(mintPublicKey, payer);

  const connection = new Connection(rpcUrl, 'confirmed');
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

  const transaction = new Transaction({
    feePayer: payer,
    blockhash,
    lastValidBlockHeight,
  });

  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mintPublicKey,
      lamports: mintRent,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(mintPublicKey, 0, payer, payer, TOKEN_PROGRAM_ID),
    createAssociatedTokenAccountInstruction(payer, associatedToken, payer, mintPublicKey),
    createMintToInstruction(mintPublicKey, associatedToken, payer, 1),
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataAddress,
        mint: mintPublicKey,
        mintAuthority: payer,
        payer,
        updateAuthority: payer,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: NFT_DISPLAY_NAME,
            symbol: NFT_SYMBOL,
            uri: params.metadataUri,
            sellerFeeBasisPoints: 0,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
        },
      },
      TOKEN_METADATA_PROGRAM_ID,
    ),
  );

  return {
    transaction,
    mintKeypair,
    mintAddress: mintPublicKey.toBase58(),
    metadataAddress: metadataAddress.toBase58(),
    cluster,
  };
}

export function partialSignPhotoMomentMint(plan: PhotoMomentMintPlan): Transaction {
  const tx = plan.transaction;
  tx.partialSign(plan.mintKeypair);
  return tx;
}

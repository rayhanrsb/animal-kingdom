<<<<<<< HEAD
import * as web3 from '@solana/web3.js';
import * as token from '@solana/spl-token';
import { initializeKeypair } from './initializeKeypair';
import * as fs from 'fs';
import { bundlrStorage, keypairIdentity, Metaplex, toMetaplexFile } from '@metaplex-foundation/js';
import { DataV2, createCreateMetadataAccountV2Instruction } from "@metaplex-foundation/mpl-token-metadata";

const TOKEN_NAME = "Animal Kingdom";
const TOKEN_SYMBOL = "ALKM";
const TOKEN_DESCRIPTION = "Tokens used in activities that protect our planet";
const TOKEN_IMAGE_NAME = "almk-icon.png";
const TOKEN_IMAGE_PATH = `tokens/alkm/assets/${TOKEN_IMAGE_NAME}`;

async function createAlmkToken(connection: web3.Connection, payer: web3.Keypair) {

    const tokenMint = await token.createMint(connection, payer, payer.publicKey, payer.publicKey, 2);

    const metaplex = Metaplex.make(connection).use(keypairIdentity(payer)).use((bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000
    })));
    
    // Read image file
    const imageBuffer = fs.readFileSync(TOKEN_IMAGE_PATH);
    const file = toMetaplexFile(imageBuffer, TOKEN_IMAGE_NAME);
    const imageUri = await metaplex.storage().upload(file);

    // Upload the rest of offchain metadata
    const { uri } = await metaplex.nfts().uploadMetadata({
        name: TOKEN_NAME,
        description: TOKEN_DESCRIPTION,
        image: imageUri,
    });

    // Finding out the address where the metadata is stored
    const metadataPda = metaplex.nfts().pdas().metadata({mint: tokenMint});
    const tokenMetadata = {
        name: TOKEN_NAME,
        symbol: TOKEN_SYMBOL,
        uri: uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
    } as DataV2

    // Make the instruction
    const instruction = createCreateMetadataAccountV2Instruction({
        metadata: metadataPda,
        mint: tokenMint,
        mintAuthority: payer.publicKey,
        payer: payer.publicKey,
        updateAuthority: payer.publicKey
    },
    {
        createMetadataAccountArgsV2: {
            data: tokenMetadata,
            isMutable: true
        }
    });

    // Make and send the transaction
    const transaction = new web3.Transaction();
    transaction.add(instruction);

    const transactionSignature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [payer]
    );

    fs.writeFileSync(
        "tokens/alkm/cache.json",
        JSON.stringify({
          mint: tokenMint.toBase58(),
          imageUri: imageUri,
          metadataUri: uri,
          tokenMetadata: metadataPda.toBase58(),
          metadataTransaction: transactionSignature,
        })
      );
 

};

async function main() {
    const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
    const payer = await initializeKeypair(connection);
    console.log("Public key is:", payer.publicKey);

    // await createAlmkToken(connection, payer);
};

main()
.then(() => {
    console.log("Finished successfully");
    process.exit(0);
})
.catch((error) => {
    console.log(error);
    process.exit(1);
=======
import * as web3 from '@solana/web3.js';
import * as token from '@solana/spl-token';
import { initializeKeypair } from './initializeKeypair';
import * as fs from 'fs';
import { bundlrStorage, keypairIdentity, Metaplex, toMetaplexFile } from '@metaplex-foundation/js';
import { DataV2, createCreateMetadataAccountV2Instruction } from "@metaplex-foundation/mpl-token-metadata";

const TOKEN_NAME = "Animal Kingdom";
const TOKEN_SYMBOL = "ALKM";
const TOKEN_DESCRIPTION = "Tokens used in activities that protect our planet";
const TOKEN_IMAGE_NAME = "almk-icon.png";
const TOKEN_IMAGE_PATH = `tokens/alkm/assets/${TOKEN_IMAGE_NAME}`;

async function createAlmkToken(connection: web3.Connection, payer: web3.Keypair) {

    const tokenMint = await token.createMint(connection, payer, payer.publicKey, payer.publicKey, 2);

    const metaplex = Metaplex.make(connection).use(keypairIdentity(payer)).use((bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000
    })));
    
    // Read image file
    const imageBuffer = fs.readFileSync(TOKEN_IMAGE_PATH);
    const file = toMetaplexFile(imageBuffer, TOKEN_IMAGE_NAME);
    const imageUri = await metaplex.storage().upload(file);

    // Upload the rest of offchain metadata
    const { uri } = await metaplex.nfts().uploadMetadata({
        name: TOKEN_NAME,
        description: TOKEN_DESCRIPTION,
        image: imageUri,
    });

    // Finding out the address where the metadata is stored
    const metadataPda = metaplex.nfts().pdas().metadata({mint: tokenMint});
    const tokenMetadata = {
        name: TOKEN_NAME,
        symbol: TOKEN_SYMBOL,
        uri: uri,
        sellerFeeBasisPoints: 0,
        creators: null,
        collection: null,
        uses: null,
    } as DataV2

    // Make the instruction
    const instruction = createCreateMetadataAccountV2Instruction({
        metadata: metadataPda,
        mint: tokenMint,
        mintAuthority: payer.publicKey,
        payer: payer.publicKey,
        updateAuthority: payer.publicKey
    },
    {
        createMetadataAccountArgsV2: {
            data: tokenMetadata,
            isMutable: true
        }
    });

    // Make and send the transaction
    const transaction = new web3.Transaction();
    transaction.add(instruction);

    const transactionSignature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [payer]
    );

    fs.writeFileSync(
        "tokens/alkm/cache.json",
        JSON.stringify({
          mint: tokenMint.toBase58(),
          imageUri: imageUri,
          metadataUri: uri,
          tokenMetadata: metadataPda.toBase58(),
          metadataTransaction: transactionSignature,
        })
      );
 

};

async function main() {
    const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
    const payer = await initializeKeypair(connection);
    console.log("Public key is:", payer.publicKey);

    // await createAlmkToken(connection, payer);
};

main()
.then(() => {
    console.log("Finished successfully");
    process.exit(0);
})
.catch((error) => {
    console.log(error);
    process.exit(1);
>>>>>>> 205c421d3d8d866de5a33a3100d4134d345c9951
});
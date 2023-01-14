import { initializeKeypair } from "./initializeKeypair";
import * as web3 from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { Connection, clusterApiUrl, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  toMetaplexFile,
  NftWithToken,
} from "@metaplex-foundation/js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  MINT_SIZE,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import idl from "./animal_kingdom.json";

const { PublicKey, SystemProgram } = anchor.web3;

const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

const getMetadata = async (
  mint: anchor.web3.PublicKey,
  connection: web3.Connection,
  lamports: number
): Promise<anchor.web3.PublicKey> => {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
};

const getMasterEdition = async (
  mint: anchor.web3.PublicKey
): Promise<anchor.web3.PublicKey> => {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
};

// NFT Config - set up the details of the NFT here
const tokenName = "Mountain Gorilla Family";
const description =
  "An NFT to support the livelyhood of a family of Udandan Mountain Gorillas for one year";
const symbol = "$ALKM";
const sellerFeeBasisPoints = 100;
const imageFile = "./assets/gorillas-1.jpg";
const collectionName = "Animal Kingdom Animals"; // or "Animal Kingdom Land" or "Animal Kingdom Seas"

const animalKingdomProgramId = "Bco4dXjvoM1oPsU5c2u8rDKXesq2r9iKoM6cSGz53i87";

// Function to create NFT
async function createNft(
  metaplex: Metaplex,
  uri: string
): Promise<NftWithToken> {
  const { nft } = await metaplex.nfts().create({
    uri: uri,
    name: tokenName,
    creators: [
      {
        address: new web3.PublicKey(animalKingdomProgramId),
        share: 100,
      },
    ],
    sellerFeeBasisPoints: sellerFeeBasisPoints,
    symbol: symbol,
  });
  console.log(
    `Token Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`
  );
  return nft;
}

//Function to update an NFT
async function updateNft(
  metaplex: Metaplex,
  uri: string,
  mintAddress: anchor.web3.PublicKey
) {
  const nft = await metaplex.nfts().findByMint({ mintAddress });

  // omit any fields to keep unchanged
  await metaplex.nfts().update({
    nftOrSft: nft,
    name: tokenName,
    symbol: symbol,
    uri: uri,
    sellerFeeBasisPoints: sellerFeeBasisPoints,
  });

  console.log(
    `Token Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`
  );
}

async function main() {
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
  const user = await initializeKeypair(connection);

  const wallet = new anchor.Wallet(user);

  const provider = new anchor.AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);

  const programId = new PublicKey(idl.metadata.address);
  const program = new anchor.Program(idl as anchor.Idl, programId);

  console.log("PublicKey:", user.publicKey.toBase58());

  const lamports: number = await connection.getMinimumBalanceForRentExemption(
    MINT_SIZE
  );

  console.log("Uploading metadata");

  // Set up metaplex
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(user))
    .use(
      bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
      })
    );

  // Upload the image file
  const buffer = fs.readFileSync(imageFile);
  const file = toMetaplexFile(buffer, "rayhan.jpg");
  const imageUri = await metaplex.storage().upload(file);
  console.log("Image uri:", imageUri);

  // Upload metadata
  const { uri } = await metaplex.nfts().uploadMetadata({
    name: tokenName,
    description: description,
    symbol: symbol,
    image: imageUri,
    properties: {
      creators: [
        {
          address: animalKingdomProgramId,
          share: 100,
        },
      ],
      files: [
        {
          uri: imageFile,
          type: "image/png",
        },
      ],
      collection: {
        name: collectionName,
        family: "Animal Kingdom",
      },
    },
    attributes: [
      {
        trait_type: "Animal",
        value: "Gorilla",
      },
    ],
  });
  console.log("Metadata uri:", uri);

  const [mintKey, mintKeyBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(tokenName), program.programId.toBuffer()],
    new anchor.web3.PublicKey(program.programId)
  );
  console.log("Mint key: ", mintKey.toString());

  const [mintAuthorityPda, mintAuthorityPdaBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(`mint`)],
      new anchor.web3.PublicKey(program.programId)
    );
  console.log("Mint authority key: ", mintAuthorityPda.toString());

  const [nftPda, nftPdaBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(`nftPDA`), mintKey.toBuffer()],
    new anchor.web3.PublicKey(program.programId)
  );

  console.log("NftPda key: ", nftPda.toString());

  const NftTokenAccount = await getAssociatedTokenAddress(
    mintKey, // Token mint account
    nftPda, // Owner of the new account
    true // Allow the owner account to be a PDA (Program Derived Address)
  );
  console.log("NFT Account: ", NftTokenAccount.toBase58());

  console.log("User: ", wallet.publicKey.toString());
  const metadataAddress = await getMetadata(mintKey, connection, lamports);
  const masterEdition = await getMasterEdition(mintKey);
  console.log("Metadata address: ", metadataAddress.toBase58());
  console.log("MasterEdition: ", masterEdition.toBase58());

  // Already initialized this
  // const initializeTx = await program.methods
  //   .initializeMintAuthority()
  //   .accounts({
  //     mintAuthority: mintAuthorityPda,
  //     systemProgram: SystemProgram.programId,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //     payer: wallet.publicKey,
  //   })
  //   .signers([wallet.payer])
  //   .rpc();

  // console.log("Initialised mint authority: " + initializeTx);

  // Create the mint
  const createMintInstruction = await program.methods
    .createMint(tokenName)
    .accounts({
      mint: mintKey,
      mintAuthority: mintAuthorityPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      nftPda: nftPda,
      tokenAccount: NftTokenAccount,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      payer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
      associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
      currentProgram: new web3.PublicKey(animalKingdomProgramId),
    })
    .signers([wallet.payer])
    .instruction();

  console.log("Create mint instruction: ", createMintInstruction);

  // Creat the metadata
  const createMetadataInstruction = await program.methods
    .createMetadata(tokenName, uri, sellerFeeBasisPoints, symbol)
    .accounts({
      mint: mintKey,
      mintAuthority: mintAuthorityPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      metadata: metadataAddress,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      payer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
      currentProgram: new web3.PublicKey(animalKingdomProgramId),
    })
    .signers([wallet.payer])
    .instruction();

  console.log("Create metadata instruction: " + createMetadataInstruction);

  const createMasterEditionInstruction = await program.methods
    .createMasterEdition(tokenName)
    .accounts({
      mint: mintKey,
      mintAuthority: mintAuthorityPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      metadata: metadataAddress,
      // nftPda: nftPda,
      // tokenAccount: NftTokenAccount,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      payer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
      // associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
      // rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      masterEdition: masterEdition,
      currentProgram: new web3.PublicKey(animalKingdomProgramId),
    })
    .signers([wallet.payer])
    .instruction();

  console.log(
    "Create master edition instruction: " + createMasterEditionInstruction
  );

  // Create a transaction, add the instructions and send and confirm
  const create_nft_tx = new anchor.web3.Transaction();
  create_nft_tx.add(createMintInstruction);
  create_nft_tx.add(createMetadataInstruction);
  create_nft_tx.add(createMasterEditionInstruction);

  const res = await provider.sendAndConfirm(create_nft_tx, [wallet.payer]);
  console.log("Transaction: " + res);
}

main()
  .then(() => {
    console.log("Finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.log(error);
    process.exit(1);
  });

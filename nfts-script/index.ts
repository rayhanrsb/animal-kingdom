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
  mint: anchor.web3.PublicKey
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

// Variables to change when running the script for various purposes
const tokenName = "Rayhan Beebeejaun";
const description =
  "A proof of concept NFT to support the education of Rayhan Beebeejaun and his subsequent placement in a conservation job";
const symbol = "$ALKM";
const sellerFeeBasisPoints = 100;
const imageFile = "./assets/rayhan.png";
const collectionName = "Animal Kingdom Youth"; // "Animal Kingdom Animal" or "Animal Kingdom Land" or "Animal Kingdom Oceans" or "Animal Kingdom Youth"
const nftType = "Youth";
const nftTypeValue = "Human";
const nickName = "Rayhan";
const location = "Mauritius";
const organisation = "Youth for Conservation Organisation"; // Fake demo organisations are Mauritius Wildlife Protection, Mauritius Nature Protection Society, Mauritius Marine Life Protection and Youth for Conservation Organisation
const organisationType = "NGO";
const price = 1; // In Sol
const duration = "8 years";
const carbonOffset = "N/A";
const animalsSaved = "N/A";
const organisationWalletAddress =
  "EoXeTQoYCaskdP4UrkMx93A43NaUuUQtYDBeXj2HEtLQ";

const animalKingdomProgramId = "Bco4dXjvoM1oPsU5c2u8rDKXesq2r9iKoM6cSGz53i87";

const humanReadableElectionDate = "2023/02/26";

const mauritiusWildlifeProtectionAddress =
  "EoXeTQoYCaskdP4UrkMx93A43NaUuUQtYDBeXj2HEtLQ";
const mauritiusNatureProtectionSocietyAddress =
  "EoXeTQoYCaskdP4UrkMx93A43NaUuUQtYDBeXj2HEtLQ";
const mauritiusMarineLifeProtectionAddress =
  "EoXeTQoYCaskdP4UrkMx93A43NaUuUQtYDBeXj2HEtLQ";

const mauritiusWildlifeProtectionVote = 50;
const mauritiusNatureProtectionSocietyVote = 20;
const mauritiusMarineLifeProtectionVote = 30;

// Function to create NFT
async function createNft(
  connection: web3.Connection,
  wallet: anchor.Wallet,
  provider: anchor.AnchorProvider,
  program: anchor.Program<anchor.Idl>,
  metaplex: Metaplex
) {
  const lamports: number = await connection.getMinimumBalanceForRentExemption(
    MINT_SIZE
  );

  console.log("Uploading metadata");

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
        trait_type: nftType.toString(),
        value: nftTypeValue.toString(),
      },
      {
        trait_type: "nickName",
        value: nickName.toString(),
      },
      {
        trait_type: "location",
        value: location.toString(),
      },
      {
        trait_type: "organisation",
        value: organisation.toString(),
      },
      {
        trait_type: "organisationType",
        value: organisationType.toString(),
      },
      {
        trait_type: "price",
        value: price.toString(),
      },
      {
        trait_type: "duration",
        value: duration.toString(),
      },
      {
        trait_type: "carbonOffset",
        value: carbonOffset.toString(),
      },
      {
        trait_type: "animalsSaved",
        value: animalsSaved.toString(),
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
  const metadataAddress = await getMetadata(mintKey);
  const masterEdition = await getMasterEdition(mintKey);
  console.log("Metadata address: ", metadataAddress.toBase58());
  console.log("MasterEdition: ", masterEdition.toBase58());

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
      organisationWallet: new web3.PublicKey(organisationWalletAddress),
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
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      payer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
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

// Function to delete (burn) an NFT
async function deleteNft(
  connection: web3.Connection,
  wallet: anchor.Wallet,
  provider: anchor.AnchorProvider,
  program: anchor.Program<anchor.Idl>,
  metaplex: Metaplex
) {
  const [mintKey, mintKeyBump] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from(tokenName), program.programId.toBuffer()],
    new anchor.web3.PublicKey(program.programId)
  );
  console.log("Mint key: ", mintKey.toString());

  // Mint authority
  // It seems that after the master edition is created, the mint authority becomes the master edition
  const mintAuthority = await getMasterEdition(mintKey);
  console.log("Mint authority key: ", mintAuthority.toString());

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
  const metadataAddress = await getMetadata(mintKey);
  const masterEdition = await getMasterEdition(mintKey);
  console.log("Metadata address: ", metadataAddress.toBase58());
  console.log("MasterEdition: ", masterEdition.toBase58());

  const deleteInstruction = await program.methods
    .deleteNft(tokenName)
    .accounts({
      metadata: metadataAddress,
      nftPda: nftPda,
      mint: mintKey,
      tokenAccount: NftTokenAccount,
      masterEdition: masterEdition,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      mintAuthority: mintAuthority,
      currentProgram: new web3.PublicKey(animalKingdomProgramId),
    })
    .signers([wallet.payer])
    .rpc();

  console.log("Deleted!");
  console.log("TX number:");
  console.log(deleteInstruction);
}

// Function to transfer an NFT
async function transferNft(
  wallet: anchor.Wallet,
  provider: anchor.AnchorProvider,
  program: anchor.Program<anchor.Idl>
) {
  const [treasuryKey, treasuryKeyBump] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(`treasury`)],
    program.programId
  );

  console.log("treasury key: ", treasuryKey.toString());

  const projectKey = new PublicKey(
    "EoXeTQoYCaskdP4UrkMx93A43NaUuUQtYDBeXj2HEtLQ"
  );

  const [mintKey, mintKeyBump] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(tokenName), program.programId.toBuffer()],
    program.programId
  );

  console.log("Mint key: ", mintKey.toString());

  const [nftPda, nftPdaBump] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(`nftPDA`), mintKey.toBuffer()],
    program.programId
  );

  console.log("NftPda key: ", nftPda.toString());

  const userATA = await getAssociatedTokenAddress(
    mintKey, // Token mint account
    provider.wallet.publicKey, // Owner of the account
    false // Allow the owner account to be a PDA (Program Derived Address)
  );
  console.log("userATA key: ", userATA.toString());

  const programATA = await getAssociatedTokenAddress(
    mintKey, // Token mint account
    nftPda, // Owner of the account
    true // Allow the owner account to be a PDA (Program Derived Address)
  );
  console.log("programAta key is: ", programATA.toBase58());

  const masterEdition = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintKey.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];

  const accounts = {
    projectAccount: projectKey,
    treasuryAccount: treasuryKey,
    fromAccount: programATA,
    toAccount: userATA,
    authorityAccount: nftPda,
    mint: mintKey,
    mintAuthority: masterEdition,
    currentProgram: program.programId,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    payer: provider.wallet.publicKey,
  };

  await program.methods
    .transferNft(tokenName)
    .accounts(accounts)
    .signers([wallet.payer])
    .rpc();
}

// Function to create an election
async function createElection(
  wallet: anchor.Wallet,
  provider: anchor.AnchorProvider,
  program: anchor.Program<anchor.Idl>
) {
  const electionDate = Math.floor(
    new Date(humanReadableElectionDate).getTime() / 1000
  );

  console.log("electionDate is:");
  console.log(electionDate);

  const [electionPda, electionPdaBump] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(`election`), Buffer.from(electionDate.toString())],
    program.programId
  );

  console.log("election pda is:");
  console.log(electionPda);

  console.log("mauritiusWildlifeProtection is:");
  console.log(mauritiusWildlifeProtectionAddress);

  console.log("mauritiusNatureProtectionSociety is:");
  console.log(mauritiusNatureProtectionSocietyAddress);

  console.log("mauritiusMarineLifeProtection is:");
  console.log(mauritiusMarineLifeProtectionAddress);

  const accounts = {
    electionPda: electionPda,
    mauritiusWildlifeProtection: new PublicKey(
      mauritiusWildlifeProtectionAddress
    ),
    mauritiusNatureProtectionSociety: new PublicKey(
      mauritiusNatureProtectionSocietyAddress
    ),
    mauritiusMarineLifeProtection: new PublicKey(
      mauritiusMarineLifeProtectionAddress
    ),
    systemProgram: SystemProgram.programId,
    payer: provider.wallet.publicKey,
  };

  const transaction = await program.methods
    .createElection(new anchor.BN(electionDate))
    .accounts(accounts)
    .signers([wallet.payer])
    .rpc();

  console.log("transaction is:");
  console.log(transaction);
}

// Function to vote on an election
async function createVote(
  wallet: anchor.Wallet,
  provider: anchor.AnchorProvider,
  program: anchor.Program<anchor.Idl>
) {
  const electionDate = Math.floor(
    new Date(humanReadableElectionDate).getTime() / 1000
  );

  console.log("electionDate is:");
  console.log(electionDate);

  console.log("tokenName is:");
  console.log(tokenName);

  console.log("mauritiusWildlifeProtectionVote is:");
  console.log(mauritiusWildlifeProtectionVote);

  console.log("mauritiusNatureProtectionSocietyVote is:");
  console.log(mauritiusNatureProtectionSocietyVote);

  console.log("mauritiusMarineLifeProtectionVote is:");
  console.log(mauritiusMarineLifeProtectionVote);

  const [mintKey, mintKeyBump] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(tokenName), program.programId.toBuffer()],
    program.programId
  );

  console.log("Mint key: ", mintKey.toString());

  const [electionPda, electionPdaBump] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from(`election`), Buffer.from(electionDate.toString())],
    program.programId
  );

  console.log("election pda is:");
  console.log(electionPda);

  const [votePda, votePdaBump] = web3.PublicKey.findProgramAddressSync(
    [mintKey.toBuffer(), electionPda.toBuffer()],
    program.programId
  );

  console.log("vote pda is:");
  console.log(votePda);

  const masterEdition = web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mintKey.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID
  )[0];

  const ataAccount = await getAssociatedTokenAddress(
    mintKey, // Token mint account
    provider.wallet.publicKey, // Owner of the account
    false // Allow the owner account to be a PDA (Program Derived Address)
  );
  console.log("ataAccount key: ", ataAccount.toString());

  const accounts = {
    votePda: votePda,
    electionPda: electionPda,
    mint: mintKey,
    mintAuthority: masterEdition,
    ataAccount: ataAccount,
    mauritiusWildlifeProtection: new PublicKey(
      mauritiusWildlifeProtectionAddress
    ),
    mauritiusNatureProtectionSociety: new PublicKey(
      mauritiusNatureProtectionSocietyAddress
    ),
    mauritiusMarineLifeProtection: new PublicKey(
      mauritiusMarineLifeProtectionAddress
    ),
    systemProgram: SystemProgram.programId,
    currentProgram: program.programId,
    payer: provider.wallet.publicKey,
  };

  const transaction = await program.methods
    .createVote(
      tokenName,
      new anchor.BN(electionDate),
      mauritiusWildlifeProtectionVote,
      mauritiusNatureProtectionSocietyVote,
      mauritiusMarineLifeProtectionVote
    )
    .accounts(accounts)
    .signers([wallet.payer])
    .rpc();

  console.log("transaction is:");
  console.log(transaction);
}

async function main() {
  const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
  const user = await initializeKeypair(connection);

  console.log("User PublicKey:", user.publicKey.toBase58());

  const wallet = new anchor.Wallet(user);

  const provider = new anchor.AnchorProvider(connection, wallet, {});
  anchor.setProvider(provider);

  const programId = new PublicKey(idl.metadata.address);
  const program = new anchor.Program(idl as anchor.Idl, programId);

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

  await createNft(connection, wallet, provider, program, metaplex);
  // await deleteNft(connection, wallet, provider, program, metaplex);
  // await transferNft(wallet, provider, program);
  // await createElection(wallet, provider, program);
  // await createVote(wallet, provider, program);

  // Already initialized this
  // Initialise mint authority
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

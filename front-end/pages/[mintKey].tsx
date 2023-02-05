import { useRouter } from "next/router";
import Header from "@/components/Header";
import { useWorkspace } from "@/components/WorkspaceProvider";
import React, { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { web3 } from "@project-serum/anchor";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { PROGRAM_ID } from "@/utils/constants";
import Loading from "@/components/Loading";

export default function NftPage() {
  const [nft, setNft] = useState();
  const [isConfirmingTransaction, setIsConfirmingTransaction] = useState(false);
  const [nftChanged, setNftChanged] = useState(false);

  const [mintKey, setMintKey] = useState("");

  const workspace = useWorkspace();

  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;
    if (router.query.mintKey && typeof router.query.mintKey === "string") {
      // Check that the mint key in the router is a valid one and setMint to it, otherwise go back to root page
      try {
        const mintKeyPublicKey = new PublicKey(router.query.mintKey);
        setMintKey(router.query.mintKey);
      } catch (error) {
        console.log("could not parse router param mintKey into PublicKey");
        router.push("/");
      }
    }
    // codes using router.query
  }, [router]);

  const { connection } = useConnection();
  const walletAdapter = useWallet();

  const TOKEN_METADATA_PROGRAM_ID = new web3.PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );

  useEffect(() => {
    if (!mintKey || !workspace.nfts || workspace.nfts.length === 0) return;

    const selectedNft = workspace.nfts.find(
      (nft) => nft.mint.address.toString() === mintKey.toString()
    );

    if (selectedNft) {
      setNft(selectedNft);
    }
  }, [nftChanged, mintKey, workspace]);

  // Now that all the hooks have loaded, if there is no minteky, return from the function here before any errors occurr trying to use a non-existent mintKey
  if (!mintKey) {
    return;
  }

  const handleBuyNft = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
    if (
      !walletAdapter.wallet ||
      !walletAdapter.publicKey ||
      !walletAdapter.connected
    ) {
      alert("Please connect your wallet first");
      return;
    }

    if (!nft) {
      console.log("error loading nft");
      return;
    }

    const [treasuryKey, treasuryKeyBump] =
      web3.PublicKey.findProgramAddressSync(
        [Buffer.from(`treasury`)],
        new PublicKey(PROGRAM_ID)
      );

    const projectKey = new PublicKey(
      "EoXeTQoYCaskdP4UrkMx93A43NaUuUQtYDBeXj2HEtLQ"
    );

    const [mintKey, mintKeyBump] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from(nft.json.name), new PublicKey(PROGRAM_ID).toBuffer()],
      new PublicKey(PROGRAM_ID)
    );


    const [nftPda, nftPdaBump] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from(`nftPDA`), mintKey.toBuffer()],
      new PublicKey(PROGRAM_ID)
    );

    const userATA = await getAssociatedTokenAddress(
      mintKey, // Token mint account
      walletAdapter.publicKey, // Owner of the account
      false // Allow the owner account to be a PDA (Program Derived Address)
    );

    const programATA = await getAssociatedTokenAddress(
      mintKey, // Token mint account
      nftPda, // Owner of the account
      true // Allow the owner account to be a PDA (Program Derived Address)
    );

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
      currentProgram: new PublicKey(PROGRAM_ID),
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      payer: walletAdapter.publicKey,
    };


    const transferInstruction = await workspace.program.methods
      .transferNft(nft.json.name)
      .accounts(accounts)
      .instruction();

    const transaction = new Transaction();
    transaction.add(transferInstruction);
    await sendAndConfirmTransaction(transaction);
  };

  const sendAndConfirmTransaction = async (transaction: Transaction) => {
    setIsConfirmingTransaction(true);

    try {
      const signature = await walletAdapter.sendTransaction(
        transaction,
        connection
      );
      console.log("signature is:");
      console.log(signature);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          signature: signature,
        },
        "finalized"
      );
      const newNft = { ...nft, owner: walletAdapter.publicKey.toString() };
      setNft(newNft);
    } catch (error) {
      console.log(error);
    } finally {
      setIsConfirmingTransaction(false);
    }
    console.log("Transaction complete");
  };

  const returnCta = (nft) => {
    const [nftPda, nftPdaBump] = PublicKey.findProgramAddressSync(
      [Buffer.from(`nftPDA`), nft.mint.address.toBuffer()],
      new PublicKey(PROGRAM_ID)
    );
    if (nft.owner.toString() === nftPda.toString()) {
      return (
        <article className="protect-cta">
          <h3>Protect it now</h3>
          <button
            className="medium-green-background white"
            onClick={handleBuyNft}
          >
            Protect it for {nft.json.price ? nft.json.price : 1} Sol
          </button>
        </article>
      );
    } else if (walletAdapter.publicKey) {
      if (nft.owner.toString() === walletAdapter.publicKey.toString()) {
        return (
          <article className="protect-cta">
            <h3>You are the guardian of this part of nature</h3>
            <button
              className="medium-green-background white"
              onClick={(e) => {
                e.preventDefault();
              }}
            >
              Thank you
            </button>
          </article>
        );
      }
    }
    return (
      <article className="protect-cta">
        <h3>This part of nature is guarded by someone else</h3>
        <button
          className="medium-green-background white"
          onClick={(e) => {
            e.preventDefault();
          }}
        >
          Thank you for your consideration
        </button>
      </article>
    );
    // }
  };

  return (
    <section className="white-background" id="nft-details-page">
      <Header />
      {!nft ? (
        <Loading />
      ) : (
        <section id="view-nft">
          <h1>{nft.json.name}</h1>
          <section className="nft-information">
            <img
              className="nft-information-image"
              src={nft.json.image}
              alt={nft.json.description}
            />
            <article className="nft-information-text">
              <article className="nft-information-category">
                <h2>Details</h2>
                <section className="nft-information-row">
                  <article className="nft-information-content">
                    <h3>Name</h3>
                    <p>{nft.json.name}</p>
                  </article>
                  <article className="nft-information-content">
                    <h3>Location</h3>
                    <p>{nft.json.location ? nft.json.location : "Mauritius"}</p>
                  </article>
                </section>
                <section className="nft-information-row">
                  <article className="nft-information-content">
                    <h3>Organisation</h3>
                    <p>
                      {nft.json.organisation
                        ? nft.json.organisation
                        : "Mauritius Nature Protection Society"}
                    </p>
                  </article>
                  <article className="nft-information-content">
                    <h3>Type</h3>
                    <p>
                      {nft.json.organisationType
                        ? nft.json.organisationType
                        : "NGO"}
                    </p>
                  </article>
                </section>
                <section className="nft-information-row">
                  <article className="nft-information-content">
                    <h3>Protect it for</h3>
                    <p>{nft.json.price ? nft.json.price : 1} Sol</p>
                  </article>
                  <article className="nft-information-content">
                    <h3>Duration</h3>
                    <p>{nft.json.duration ? nft.json.duration : "1 year"}</p>
                  </article>
                </section>
              </article>
              <article className="nft-information-category">
                <h2>Impacts</h2>
                <section className="nft-information-row">
                  <article className="nft-information-content">
                    <h3>Carbon offset</h3>
                    <p>
                      {nft.json.carbonOffset ? nft.json.carbonOffset : 0} tCO2
                    </p>
                  </article>
                  <article className="nft-information-content">
                    <h3>Animals saved</h3>
                    <p>
                      {nft.json.animalsSaved ? nft.json.animalsSaved : 200}{" "}
                      animals
                    </p>
                  </article>
                </section>
              </article>
              <article className="nft-information-category">
                <h2>Bonus Rewards</h2>
                <h3>
                  Purchasing this NFT will grant you the following rewards with
                  the{" "}
                  {nft.json.organisation
                    ? nft.json.organisation
                    : "Mauritius Nature Protection Society"}
                  :
                </h3>
                <ul>
                  <li>
                    Personalised site visit to see the imapct you have funded
                  </li>
                  <li>
                    Opportunity to contribute to naming newborn/newfound animals
                  </li>
                </ul>
              </article>
            </article>
          </section>
          {returnCta(nft)}
        </section>
      )}
    </section>
  );
}

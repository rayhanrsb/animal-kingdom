// Next.js imports
import Head from "next/head";
import Image from "next/image";
// Component imports from "@/components"
import Header from "@/components/Header";
import NFTs from "@/components/NFTs";
// Other imports
import React, { MouseEventHandler, useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js";

function Home() {
  const { connection } = useConnection();
  const walletAdapter = useWallet();

  // We want to be able to get the list of nfts regardless of whether the wallet is connected yet or not
  // So depenging on whether the wallet is connected or not, we switch between using wallet-adapter-react and web3.js
  const metaplex = useMemo(() => {
    if (connection && walletAdapter) {
      return Metaplex.make(connection).use(
        walletAdapterIdentity(walletAdapter)
      );
    } else {
      return Metaplex.make(connection);
    }
  }, [connection, walletAdapter]);

  const handleGetStarted = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
    const nftsSection = document.getElementById("nfts-section");
    nftsSection?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <Head>
        <title>Animal Kingdom</title>
        <meta
          name="description"
          content="Become a guardian of the Animal Kingdom. From animal families to sections of coral reef, every single NFT on this platform represents a real-life piece of nature in need of protection. Buy an NFT to fund its protection and become one of the guardians of the Animal Kingdom"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/small-logo.png" />
      </Head>
      <main className="white-background">
        <Header />
        <section id="hero" className="white-background">
          <Image
            src={"/logo-with-text.png"}
            width={200}
            height={287.04}
            alt="Animal Kingdom Logo"
          />
          <h1>Become a guardian of the Animal Kingdom</h1>
          <p>
            From animal families to sections of coral reef, every single NFT on
            this platform represents a real-life piece of nature in need of
            protection.
          </p>
          <p>
            Buy an NFT to fund its protection and become one of the guardians of
            the Animal Kingdom
          </p>
          <button
            className="medium-green-background white"
            onClick={handleGetStarted}
          >
            Get started
          </button>
        </section>
        <NFTs metaplex={metaplex} connection={connection} />
      </main>
    </>
  );
}

export default Home;

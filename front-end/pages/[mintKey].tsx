import { useRouter } from "next/router";
import Header from "@/components/Header";
import React, { MouseEventHandler, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Metaplex, walletAdapterIdentity } from "@metaplex-foundation/js";
import { PublicKey } from "@solana/web3.js";

export default function NftPage() {
  const [nft, setNft] = useState();
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { mintKey } = router.query;
  const { connection } = useConnection();
  const walletAdapter = useWallet();

  const metaplex = useMemo(() => {
    if (connection && walletAdapter) {
      return Metaplex.make(connection).use(
        walletAdapterIdentity(walletAdapter)
      );
    } else {
      return Metaplex.make(connection);
    }
  }, [connection, walletAdapter]);

  useEffect(() => {
    if (!metaplex) return;
    setLoading(true);

    try {
      const mintPubKey = new PublicKey(mintKey);
      metaplex
        .nfts()
        .findByMint({ mintAddress: new PublicKey(mintKey) })
        .then(async (nftObject) => {
          console.log("adding this nft:");
          console.log(nftObject);
          const largestAccounts = await connection.getTokenLargestAccounts(
            nftObject.mint.address
          );
          const largestAccountInfo = await connection.getParsedAccountInfo(
            largestAccounts.value[0].address
          );
          const newNftObject = {
            ...nftObject,
            owner: largestAccountInfo.value.data.parsed.info.owner,
          };
          setNft(newNftObject);
          setLoading(false);
        });
    } catch (error) {
      console.log(error);
      alert("There was a problem getting the NFT");
      setLoading(false);
    }
  });

  return (
    <section className="white-background">
      <Header />
      <section id="view-nft">
        <h1>{nft.json.name}</h1>
        <section className="nft-information">
          <img src={nft.json.image} alt={nft.json.description} />
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
      </section>
    </section>
  );
}

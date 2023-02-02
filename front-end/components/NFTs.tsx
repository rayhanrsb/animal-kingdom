import { FC, useState, useEffect } from "react";
import { PublicKey, Connection } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import Image from "next/image";

const NFTs: FC<{ metaplex: Metaplex; connection: Connection }> = ({
  metaplex,
  connection,
}) => {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);

  const programId = "Bco4dXjvoM1oPsU5c2u8rDKXesq2r9iKoM6cSGz53i87";

  useEffect(() => {
    if (!metaplex) return;
    setLoading(true);
    metaplex
      .nfts()
      .findAllByCreator({ creator: new PublicKey(programId) })
      .then((nftResults) => {
        const newNFTsArr = [];
        // for (const nftResult of nftResults) {
        //   fetch(nftResult.uri)
        //     .then((JsonMetadata) => JsonMetadata.json())
        //     .then((metadata) => {
        //       setNfts([...nfts, { ...nftResult, metadata: metadata }]);
        //     });
        // }

        nftResults.forEach((nftResult) => {
          metaplex
            .nfts()
            .load({ metadata: nftResult })
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
              newNFTsArr.push(newNftObject);
              // setNfts(newNFTsArr);
            })
            .then(() => {
              setNfts(newNFTsArr);
              setLoading(false);
            });
        });

        // for (const nftResult of nftResults) {
        //   metaplex
        //     .nfts()
        //     .load({ metadata: nftResult })
        //     .then((nftObject) => {
        //       newNFTsArr.push(nftObject);
        //       console.log("adding this nft:");
        //       console.log(nftObject);
        //       setNfts(newNFTsArr);
        //     });
        // }
      });
  }, [metaplex]);

  console.log("nfts are:");
  console.log(nfts);

  const animalNfts = nfts.filter(
    (nft) => nft.json.attributes[0].trait_type === "Animal"
  );

  console.log("animalNfts is:");
  console.log(animalNfts);

  console.log(loading);


  return (
    <section id="nfts-section"className="white-background">
      {loading ? (
        <p>Loading</p>
      ) : (
        <section className="nft-list white-background">
          <h2>Protect animal lives</h2>
          <section className="nft-row white-background">
            {animalNfts.map((nft) => {
              console.log("displayed nft is:");
              console.log(nft.address.toString());
              return (
                <article key={nft.address.toString()} className="nft">
                  <Image
                    src={nft.json.image}
                    height={100}
                    width={100}
                    alt={nft.json.description}
                  />
                  <article className="nft-text">
                    <h3 className="medium-green">{nft.json.name}</h3>
                    <article className="nft-details">
                      <article className="nft-detail">
                        <p className="small">Protect it for</p>
                        <p className="small bold">1 Sol</p>
                      </article>
                      <article className="nft-detail">
                        <p className="small">Location</p>
                        <p className="small bold">Columbia</p>
                      </article>
                    </article>
                  </article>
                </article>
              );
            })}
          </section>
        </section>
      )}
    </section>
  );
};

export default NFTs;

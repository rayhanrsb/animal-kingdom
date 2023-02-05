import Link from "next/link";
import { FC, useState, useEffect } from "react";
import { PublicKey, Connection } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import Image from "next/image";
import { useWorkspace } from "./WorkspaceProvider";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PROGRAM_ID } from "@/utils/constants";
import Loading from "./Loading";

const NFTs: FC = () => {
  const [loading, setLoading] = useState(true);
  const [animalNfts, setAnimalNfts] = useState([]);
  const [oceanNfts, setOceanNfts] = useState([]);
  const [landNfts, setLandNfts] = useState([]);
  const walletAdapter = useWallet();

  const workspace = useWorkspace();

  useEffect(() => {
    if (!workspace.nfts || workspace.nfts?.length === 0) return;
    const newAnimalNfts = workspace.nfts.filter(
      (nft) => nft.json.attributes[0].trait_type === "Animal"
    );
    const newOceanNfts = workspace.nfts.filter(
      (nft) => nft.json.attributes[0].trait_type === "Oceans"
    );
    const newLandNfts = workspace.nfts.filter(
      (nft) => nft.json.attributes[0].trait_type === "Land"
    );
    setAnimalNfts(newAnimalNfts);
    setOceanNfts(newOceanNfts);
    setLandNfts(newLandNfts);
    setLoading(false);
  }, [workspace]);

  const returnCta = (nft: object) => {
    const [nftPda, nftPdaBump] = PublicKey.findProgramAddressSync(
      [Buffer.from(`nftPDA`), nft.mint.address.toBuffer()],
      new PublicKey(PROGRAM_ID)
    );
    if (nft.owner.toString() === nftPda.toString()) {
      return (
        <article className="nft-detail">
          <p className="small">Protect it for</p>
          <p className="small bold">1 Sol</p>
        </article>
      );
    } else if (walletAdapter.connected && walletAdapter.publicKey) {
      if (nft.owner.toString() === walletAdapter.publicKey.toString()) {
        return (
          <article className="nft-detail">
            <p className="small">You own this NFT</p>
            <p className="small bold">Click to view details</p>
          </article>
        );
      }
    }
    return (
      <article className="nft-detail">
        <p className="small">Unavailable</p>
        <p className="small bold">Already protected</p>
      </article>
    );
  };

  return (
    <section id="nfts-section" className="white-background">
      {loading ? (
        <>
          <Loading />
          <p>
            The first time this loads it might take a bit longer - we appreciate
            your patience :))
          </p>
        </>
      ) : (
        <section id="nfts-section" className="white-background">
          {/* oceansNfts section */}
          <section className="nft-list white-background">
            <h2>Protect our oceans</h2>
            <section className="nft-row white-background">
              {oceanNfts.map((nft) => {
                return (
                  <Link
                    href={`/${nft.mint.address.toString()}`}
                    key={nft.address.toString()}
                  >
                    <article className="nft">
                      <Image
                        src={nft.json.image}
                        height={100}
                        width={100}
                        alt={nft.json.description}
                      />
                      <article className="nft-text">
                        <h3 className="medium-green">{nft.json.name}</h3>
                        <article className="nft-details">
                          {returnCta(nft)}
                          <article className="nft-detail">
                            <p className="small">Location</p>
                            <p className="small bold">Mauritius</p>
                          </article>
                        </article>
                      </article>
                    </article>
                  </Link>
                );
              })}
            </section>
          </section>

          {/* landNfts section */}
          <section className="nft-list white-background">
            <h2>Protect our forests</h2>
            <section className="nft-row white-background">
              {landNfts.map((nft) => {
                return (
                  <Link
                    href={`/${nft.mint.address.toString()}`}
                    key={nft.address.toString()}
                  >
                    <article className="nft">
                      <Image
                        src={nft.json.image}
                        height={100}
                        width={100}
                        alt={nft.json.description}
                      />
                      <article className="nft-text">
                        <h3 className="medium-green">{nft.json.name}</h3>
                        <article className="nft-details">
                          {returnCta(nft)}
                          <article className="nft-detail">
                            <p className="small">Location</p>
                            <p className="small bold">Mauritius</p>
                          </article>
                        </article>
                      </article>
                    </article>
                  </Link>
                );
              })}
            </section>
          </section>

          {/* animalNft section */}
          <section className="nft-list white-background">
            <h2>Protect animal lives</h2>
            <section className="nft-row white-background">
              {animalNfts.map((nft) => {
                return (
                  <Link
                    href={`/${nft.mint.address.toString()}`}
                    key={nft.address.toString()}
                  >
                    <article className="nft">
                      <Image
                        src={nft.json.image}
                        height={100}
                        width={100}
                        alt={nft.json.description}
                      />
                      <article className="nft-text">
                        <h3 className="medium-green">{nft.json.name}</h3>
                        <article className="nft-details">
                          {returnCta(nft)}
                          <article className="nft-detail">
                            <p className="small">Location</p>
                            <p className="small bold">Mauritius</p>
                          </article>
                        </article>
                      </article>
                    </article>
                  </Link>
                );
              })}
            </section>
          </section>
        </section>
      )}
    </section>
  );
};

export default NFTs;

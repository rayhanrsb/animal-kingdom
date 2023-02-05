import { createContext, useContext, useMemo, useState, useEffect } from "react";
import {
  Program,
  AnchorProvider,
  Idl,
  setProvider,
} from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
// import IDL from "@/utils/animal_kingdom.json";
import { AnimalKingdom, IDL } from "@/utils/animal_kingdom";
import { Connection } from "@solana/web3.js";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { PROGRAM_ID } from "@/utils/constants";
import {
  Metaplex,
  walletAdapterIdentity,
  Sft,
  SftWithToken,
  Nft,
  NftWithToken,
} from "@metaplex-foundation/js";

const WorkspaceContext = createContext({});
const programId = new PublicKey(PROGRAM_ID);

interface Workspace {
  connection?: Connection;
  provider?: AnchorProvider;
  program?: Program<AnimalKingdom>;
  nfts?: any[];
}

const WorkspaceProvider = ({ children }: any) => {
  const [nfts, setNfts] = useState([]);
  const wallet = useAnchorWallet() || MockWallet;
  const { connection } = useConnection();

  // We want to be able to get the list of nfts regardless of whether the wallet is connected yet or not
  // So depenging on whether the wallet is connected or not, we switch between using wallet-adapter-react and web3.js
  // const metaplex = useMemo(() => {
  //   if (connection && wallet) {
  //     return Metaplex.make(connection).use(walletAdapterIdentity(wallet));
  //   } else {
  //     return Metaplex.make(connection);
  //   }
  // }, [connection, wallet]);

  const metaplex = useMemo(() => {
    return Metaplex.make(connection);
  }, [connection]);

  useEffect(() => {
    if (!metaplex) return;
    metaplex
      .nfts()
      .findAllByCreator({ creator: new PublicKey(programId) })
      .then((nftResults) => {
        let newNFTsArr = [];
        nftResults.forEach((nftResult) => {
          metaplex
            .nfts()
            .load({ metadata: nftResult })
            .then(async (nftObject) => {
              if (nftObject.json?.name !== "Mountain Gorilla Family") {
                const largestAccounts =
                  await connection.getTokenLargestAccounts(
                    nftObject.mint.address
                  );
                const largestAccountInfo =
                  await connection.getParsedAccountInfo(
                    largestAccounts.value[0].address
                  );
                const newNftObject = {
                  ...nftObject,
                  owner: largestAccountInfo.value.data.parsed.info.owner,
                };
                // Filter out the extra dev ones
                newNFTsArr = [...newNFTsArr, newNftObject];
                // newNFTsArr.push(newNftObject);
                // setNfts(newNFTsArr);
              }
            })
            .then(() => {
              setNfts(newNFTsArr);
            });
        });
      });
  }, []);

  console.log("nfts are:");
  // nfts.forEach((nft) => {
  //   console.log(nft.owner);
  // });
  console.log(nfts);

  const provider = new AnchorProvider(connection, wallet, {});
  setProvider(provider);

  const animalKingdomProgram = new Program(IDL as Idl, programId);
  const workspace = {
    connection,
    provider,
    program: animalKingdomProgram,
    nfts,
  };

  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  );
};

const useWorkspace = (): Workspace => {
  return useContext(WorkspaceContext);
};

import { Keypair } from "@solana/web3.js";

const MockWallet = {
  publicKey: Keypair.generate().publicKey,
  signTransaction: () => Promise.reject(),
  signAllTransactions: () => Promise.reject(),
};

export { WorkspaceProvider, useWorkspace };

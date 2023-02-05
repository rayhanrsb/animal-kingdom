import { useState, useMemo, useEffect } from "react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWorkspace } from "@/components/WorkspaceProvider";
import Header from "@/components/Header";
import { BN } from "@project-serum/anchor";
import Votes from "@/components/Votes";
import VoteSummary from "@/components/VoteSummary";
import Loading from "@/components/Loading";

export default function DaoPage() {
  const workspace = useWorkspace();
  const [isConfirmingTransaction, setIsConfirmingTransaction] = useState(false);
  const { connection } = useConnection();
  const walletAdapter = useWallet();
  const [ownedNfts, setOwnedNfts] = useState<any[]>();
  const [votes, setVotes] = useState<any[]>([]);
  const [existingVoteDetails, setExistingVoteDetails] = useState<any[]>([]);
  const [elections, setElections] = useState<any[]>([]);

  // We know the upcoming election date
  const humanReadableElectionDate = "2023/02/26";
  const electionDate = Math.floor(
    new Date(humanReadableElectionDate).getTime() / 1000
  );

  // Get active elections:
  useEffect(() => {
    if (!workspace.nfts || workspace.nfts.length === 0 || !workspace.program)
      return;

    const [electionPda, electionPdaBump] = PublicKey.findProgramAddressSync(
      [Buffer.from(`election`), Buffer.from(electionDate.toString())],
      workspace.program.programId
    );

    workspace.program.account.election
      .fetch(electionPda)
      .then((electionPdaAccount) => {
        setElections([electionPdaAccount]);
      });
  }, [workspace]);

  // Get owned NFTs
  useEffect(() => {
    if (
      !workspace.nfts ||
      workspace.nfts.length === 0 ||
      !walletAdapter.wallet ||
      !walletAdapter.publicKey ||
      !walletAdapter.connected
    ) {
      return;
    }
    const address = walletAdapter.publicKey;
    const ownedNftArr: any[] = [];
    workspace.nfts.forEach((nft) => {
      if (nft.owner.toString() === address.toString()) {
        ownedNftArr.push(nft);
      }
    });
    if (ownedNftArr) {
      setOwnedNfts(ownedNftArr);
    }
  }, [workspace, walletAdapter]);

  // Get existing votes
  useEffect(() => {
    if (
      !workspace.nfts ||
      !workspace.program ||
      workspace.nfts.length === 0 ||
      !walletAdapter.wallet ||
      !walletAdapter.publicKey ||
      !walletAdapter.connected ||
      !ownedNfts
    ) {
      return;
    }

    let newVoteArr = [];
    let newExistingVoteDetailsArr = [];

    ownedNfts.forEach((nft) => {
      if (!workspace.program) return;
      const [mintKey, mintKeyBump] = PublicKey.findProgramAddressSync(
        [Buffer.from(nft.json.name), workspace.program.programId.toBuffer()],
        workspace.program.programId
      );

      const [electionPda, electionPdaBump] = PublicKey.findProgramAddressSync(
        [Buffer.from(`election`), Buffer.from(electionDate.toString())],
        workspace.program.programId
      );

      const [votePda, votePdaBump] = PublicKey.findProgramAddressSync(
        [mintKey.toBuffer(), electionPda.toBuffer()],
        workspace.program.programId
      );

      workspace.program.account.vote
        .fetchNullable(votePda)
        .then((votePdaAccount) => {
          if (votePdaAccount) {
            newVoteArr = [...newVoteArr, votePdaAccount];
            setVotes(newVoteArr);
            newExistingVoteDetailsArr = [
              ...newExistingVoteDetailsArr,
              {
                electionDate: electionDate,
                mint: votePdaAccount.mint,
                votes: votePdaAccount.vote,
              },
            ];
            setExistingVoteDetails(newExistingVoteDetailsArr);
          }
        });
    });
  }, [
    ownedNfts,
    walletAdapter.connected,
    walletAdapter.publicKey,
    walletAdapter.wallet,
    workspace.nfts,
    workspace.program,
    electionDate,
  ]);

  const handleVote = async (
    votes: object,
    nft: object,
    electionDate: number,
    election: object
  ) => {
    const [electionPda, electionPdaBump] = PublicKey.findProgramAddressSync(
      [Buffer.from(`election`), Buffer.from(electionDate.toString())],
      workspace.program.programId
    );

    const [votePda, votePdaBump] = PublicKey.findProgramAddressSync(
      [nft.mint.address.toBuffer(), electionPda.toBuffer()],
      workspace.program.programId
    );

    const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );

    const masterEdition = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        nft.mint.address.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )[0];

    const ataAccount = await getAssociatedTokenAddress(
      nft.mint.address, // Token mint account
      walletAdapter.publicKey, // Owner of the account
      false // Allow the owner account to be a PDA (Program Derived Address)
    );

    const accounts = {
      votePda: votePda,
      electionPda: electionPda,
      mint: nft.mint.address,
      mintAuthority: masterEdition,
      ataAccount: ataAccount,
      mauritiusWildlifeProtection:
        election.organisations.mauritiusWildlifeProtection.address,
      mauritiusNatureProtectionSociety:
        election.organisations.mauritiusNatureProtectionSociety.address,
      mauritiusMarineLifeProtection:
        election.organisations.mauritiusMarineLifeProtection.address,
      systemProgram: SystemProgram.programId,
      currentProgram: workspace.program.programId,
      payer: walletAdapter.publicKey,
    };

    const instruction = await workspace.program.methods
      .createVote(
        nft.json.name,
        new BN(electionDate),
        votes.mauritius_wildlife_protection,
        votes.mauritius_nature_protection_society,
        votes.mauritius_marine_life_protection
      )
      .accounts(accounts)
      .instruction();

    const transaction = new Transaction();
    transaction.add(instruction);
    await sendAndConfirmTransaction(transaction);

    const newExistingVoteDetailsArr = [
      ...existingVoteDetails,
      {
        electionDate: electionDate,
        mint: nft.mint.address,
        votes: {
          mauritiusWildlifeProtection: {
            amount: votes.mauritius_wildlife_protection,
            organisationAddress:
              election.organisations.mauritiusWildlifeProtection.address,
            organisationName: "mauritius_wildlife_protection",
          },
          mauritiusNatureProtectionSociety: {
            amount: votes.mauritius_nature_protection_society,
            organisationAddress:
              election.organisations.mauritiusNatureProtectionSociety.address,
            organisationName: "mauritius_nature_protection_society",
          },
          mauritiusMarineLifeProtection: {
            amount: votes.mauritius_marine_life_protection,
            organisationAddress:
              election.organisations.mauritiusMarineLifeProtection.address,
            organisationName: "mauritius_marine_life_protection",
          },
        },
      },
    ];
    setExistingVoteDetails(newExistingVoteDetailsArr);
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
    } catch (error) {
    } finally {
      setIsConfirmingTransaction(false);
    }
  };

  return (
    <>
      <section id="dao-page">
        <Header />
        <section className="dao-intro">
          <h1>DAO</h1>
          <p>
            Every NFT bought on Animal Kingdom is a commitment to protecting
            nature both at the individual animal, plant and habitat level, and
            also at the systemic / societal level. This is the only way we can
            effectively fight the impeding climate crisis.
          </p>
          <p>
            Every month, Animal Kingdom NFT holders can vote on this page to
            decide which systemic / societal initiatives Animal Kingdom will
            fund this month.
          </p>

          {workspace.nfts && !ownedNfts ? (
            <p>Please buy an NFT to be able to vote</p>
          ) : null}
        </section>

        {elections && (
          <section className="elections">
            <h2>Active Elections:</h2>
            {workspace.nfts?.length === 0 && <Loading />}
            {elections.map((election) => (
              <section key={election.date} className="election">
                <h3>{new Date(Number(election.date) * 1000).toDateString()}</h3>
                {!walletAdapter.publicKey && (
                  <p>Please connect your wallet to see the election details</p>
                )}
                {walletAdapter.publicKey && !ownedNfts ? (
                  <p>Please buy an NFT to see the election details and vote</p>
                ) : null}
                {ownedNfts?.map((nft) => (
                  <>
                    <p>
                      {existingVoteDetails.find(
                        (vote) =>
                          Number(vote.electionDate) === Number(election.date) &&
                          vote.mint.toString() === nft.mint.address.toString()
                      )
                        ? "You voted"
                        : "Vote"}{" "}
                      with NFT:
                      <br />
                      {nft.json.name.toString()}
                    </p>
                    {existingVoteDetails.find(
                      (vote) =>
                        Number(vote.electionDate) === Number(election.date) &&
                        vote.mint.toString() === nft.mint.address.toString()
                    ) ? (
                      <VoteSummary
                        vote={existingVoteDetails.find(
                          (vote) =>
                            Number(vote.electionDate) ===
                              Number(election.date) &&
                            vote.mint.toString() === nft.mint.address.toString()
                        )}
                      />
                    ) : (
                      <Votes
                        key={election.date}
                        election={election}
                        handleVote={handleVote}
                        nft={nft}
                      />
                    )}
                  </>
                ))}
              </section>
            ))}
          </section>
        )}
      </section>
    </>
  );
}

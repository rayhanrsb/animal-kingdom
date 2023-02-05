# Welcome to the Animal Kingdom

## Overview

This is a project exploring the potential of NFTs and DAOs on Solana for the protection of nature.

In order for us to effectively tackle the climate crisis, we need to care for nature both at the level of individual animals and habitats and at the broader level of environmental and societal systems.

This project uses NFTs to accomplish the former, and a DAO structure to accomplish the latter.

- NFTs - every single NFT on this platform represents a real-life piece of nature in need of protection, from animal families to sections of coral reef. The NFTs are not assets, they are conduits for donation. 50% of proceeds from an NFT sales go towards protection of the specific part of nature it represents. The other 50% goes into the DAO

1. DAO - the holders of Animal Kingdom NFTs are eligible to vote every month on which environmental / societal system level causes to support.

This is how we manage to tackle both the micro and macro level changes are necessary for us to protect our planet.

The demo platform is live [here](https://demo.animalkingdom.io)

The devnet Solana program ID is: Bco4dXjvoM1oPsU5c2u8rDKXesq2r9iKoM6cSGz53i87 [view on solana explorer](https://explorer.solana.com/address/Bco4dXjvoM1oPsU5c2u8rDKXesq2r9iKoM6cSGz53i87?cluster=devnet)

## Breakdown of the codebase

### The Anchor Program

The Anchor program can be viewed in the /anchor-program directory.

The code is in the anchor-program/programs/animal-kingdom/src/lib.rs file.

#### Creating an NFT

The three functions, `create_mint`, `create_metadata` and `create_master_edition` are the three steps required to create an NFT entirely through a Solana program. Putting them all in one function causes too many compute units to be consumed, so I have broken them up into three functions that should be called in one single transaction.

Note on line 449 that I have implemented stringent additional security checks, ensuring that only one validated address can mint NFTs through this program.
`#[account(mut, constraint = payer.key.to_string() == String::from("kq29PDUDGccE8WWACB76XVyn56TuozLfyGQ9NTDRyxH"))]`

This protects the platform from malicious users creating fake NFTs to steal money from donors.

#### DAO elections and voting

At the moment, the DAO implementation is very basic. The next step for this project is to use spl-governance for the DAO and integrate with Realms. For now, it uses a simple election and voting structure.

The function `create_election` starting on line 282 enables the creation of elections which allow holders of NFTs to vote on which projects the DAO should support. Again, it is restricted to only one trusted account at the moment, so that no malicious users can create fake elections. When spl-governance is used, we will implement mechanisms for users to add vote options to the monthly elections.

The function `create_vote` starting on line 320 enables the holder of an NFT to vote on an election. Look at the accounts struct for this function starting on line 699 to see all the security measures in place to protect the election. These include:

- Restricted ability to vote to Animal Kingdom NFT holders - This is done by validating that the `mint` account passed in is a valid PDA of the program, and that it has a total supply of 1. We then check that the associated token account passed in is for the same Mint, and that is has a balance of 1
- Stop double voting - This is done by recording the vote on a PDA, which once initialised cannot be re-initialised. Any user must pass in a valid vote PDA otherwise the transaction will fail. There is only one valid PDA per NFT per election, and if it is already initialised, the transaction fails.
- Prevent over-voting - This is done by ensuring the votes remain within the imposed limit of 100. If too many votes are cast, the program throws a custom error `InvalidVoteError::VoteTooLarge`.
- Prevent voting after the election - This is done by making the election PDA derived from the UNIX timestamp of the date of the election close, and then using `Clock::get()?.unix_timestamp` to check whether the election close is in the past. If it is, we throw a custom error: `InvalidVoteError::ElectionClosed`.

#### Next steps for the Solana program

There is still usage of `UncheckedAccount` in several places, which needs to be eradicated before Mainnet launch.

Integration of spl-governance and listing on realms.today.

### The Next.js Front-End

The Next.js front-end interface can be viewed in the /front-end directory.

There are three pages in the `/pages` directory, `index.tsx` ("/"), `[mintKey].tsx` and `dao.tsx` ("/"). There are two context-providing components in the `/components` directory, `WalletContextProvider.tsx` which uses `@solana/wallet-adapter-react` to handle all the wallet-related logic and `WorkspaceProvider.tsx` which uses React's `createContext` hook to provide the entire application with access to the animal Kingdom `Program`, and `nfts`.

#### NFTs on the front-end

The root page, `index.tsx` displays all the demo NFTs created by the Animal Kingdom program through the `NFTs.tsx` component.

The `WorkspaceProvider.tsx` component provides `NFTs.tsx` with the list of NFTs. It finds the approrpiate ones by calling:
`metaplex.nfts().findAllByCreator({ creator: new PublicKey(programId) })`
and then obtaining the metadata for each one using:
`metaplex.nfts().load({ metadata: nftResult })`
And then finally finding out who the owner of the NFT is by finding the largest (and only) holder of the token with:
`connection.getTokenLargestAccounts`
followed by:
`connection.getParsedAccountInfo`
then we add a "owner" field to the NFT which we use to dictate what actions a user can do with that NFT.

The `[mintKey].tsx` is called when a user clicks on an NFT from the root page, and displays information about an NFT. We verify if the owner of the NFT is still the custom PDA derived from its mint with:

```js
const [nftPda, nftPdaBump] = web3.PublicKey.findProgramAddressSync(
      [Buffer.from(`nftPDA`), mintKey.toBuffer()],
      new PublicKey(PROGRAM_ID)
    );
```

The function `returnCta` decides which call to action to render at the bottom of the page depening on whether the user owns the NFT, the Animal Kingdom PDA or a 3rd party.

#### DAO elections and voting on the front-end

The DAO functionality is handled through the `dao.tsx` page. The app fetches the upcoming election by first deriving the address of its PDA with:

```js
const [electionPda, electionPdaBump] = PublicKey.findProgramAddressSync(
    [Buffer.from(`election`), Buffer.from(electionDate.toString())],
    workspace.program.programId
);
```
The `electionDate` variable above stores the UNIX timestamp (in seconds) of the date of the closing of the election.
Elections close on the last day of every month, so it is predictable when the next one will be.
Then, using anchors handy `workspace.program.account.election.fetch(electionPda)` function, we fetch all the data we need from the election PDA. This information includes the options for voting, and the addresses of each organisation a user can choose to support. When a user votes for an organisation, the election PDA is updated to show the total number of votes each organisation has recieved this election.

The actual voting functionality is split throughout the three components `dao.tsx`, `votes.tsx` and `vote.tsx`. The function for submitting votes, `handleVote`, is defined in `dao.tsx` and passed to `votes.tsx` where it is called when the user submits their votes. `votes.tsx` and `vote.tsx` work together using a combination of React's `useState()` and `useEffect()` to give the user a smooth experience with slider inputs `<input type="range">` to help them allocate their votes across the proposed organisations, without exceeding their total number of votes.

In order to check whether a user has already voted, the app uses Anchor's function `workspace.program.account.vote.fetchNullable()` to check if a vote PDA for a given election and NFT exists. If it does, the user is presented with a summary of their vote as recorded on the vote PDA.

#### Next steps for the Next.js front-end

The initial loading is extremely slow, because of the multiple fetches we have to do for each NFT. My top priority is making this faster.

There are also currently several type errors throughout the codebase. For demo purposes, I have deployed anyway, but these must be addressed before the mainnet launch.

### The Tyepscript Script

This can be viewed in the `/nfts-script` directory. Almost all the code is contained in the `index.ts` file. The remaining code in `initializeKeypair.ts` is helper code to provide the main script with a wallet.

The script inside `index.ts` handles all of the sensitive interaction with the Solana program. The Solana program is configured to only accept sensitive function calls from the wallet that this script uses.

From line 57 to line 90, all of the variable necessary for interacting with a single NFT are declared. This makes it easy for me to run scripts affecting different NFTs by simply changing the values here, at the top of the file.

Throughout this file, the functions `createNft()`, `updateNft()`, `deleteNft()`,  `transferNft()`, `createElection()` and `createVote()` are defined. These functions derive the required accounts for the relevant program instruction and then call that instruction. These are called in the `main()` function. You will see the function calls commented out on lines 620-623.

#### Next steps for the script

Ideally, this script should not have to exist. In the early days of development, it is important for me to be able to keep control of sensitive functions in the Solana Program. However, as this project develops, I hope to be able to create secure decentralised governance workflows to manage the sensitive functions, so that the Animal Kingdom program can be completely managed by the Animal Kingdom DAO.

As such, the next steps for this script is actually to start phasing it out and to replace it with decentraliseed governance workflows that will allow the community to manage sensitive program functions.

## Technologies used

- Solana
- Rust
- Anchor
- Next.js
- React
- TypeScript
- JavaScript
- solana/wallet-adapter-react

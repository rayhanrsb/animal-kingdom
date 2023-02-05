use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::system_program;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{mint_to, transfer, Mint, MintTo, Token, TokenAccount, Transfer},
};
use mpl_token_metadata::{
    instruction::{burn_nft, create_master_edition_v3, create_metadata_accounts_v3},
    pda::find_metadata_account,
    ID as MetadataTokenId,
};

declare_id!("Bco4dXjvoM1oPsU5c2u8rDKXesq2r9iKoM6cSGz53i87");

#[program]
pub mod animal_kingdom {
    use super::*;

    pub fn initialize_mint_authority(ctx: Context<InitializeMintAuthority>) -> Result<()> {
        ctx.accounts.mint_authority.desc = String::from("PDA authority for NFT mints");
        Ok(())
    }

    pub fn create_mint(ctx: Context<CreateMint>, _name: String) -> Result<()> {
        msg!("Adding organisation_wallet pubkey to nftPda");
        ctx.accounts.nft_pda.conservation_address =
            ctx.accounts.organisation_wallet.key().to_string().clone();
        msg!("Added organisation_wallet pubkey to nftPda");

        msg!("Getting seeds of mint authority pda");
        let seeds = &[
            "mint".as_bytes(),
            &[*ctx.bumps.get("mint_authority").unwrap()],
        ];
        let signer = [&seeds[..]];
        msg!("Got seeds of mint authority pda");

        msg!(
            "Mint authority is: {}",
            ctx.accounts.mint_authority.key().to_string()
        );
        msg!(
            "Mint authority should be: {}",
            ctx.accounts.mint.mint_authority.unwrap().to_string()
        );

        msg!("Minting token");

        mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    authority: ctx.accounts.mint_authority.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                },
                &signer,
            ),
            1,
        )?;

        msg!("Token Minted !!!");

        ctx.accounts.nft_pda.mint = ctx.accounts.mint.key().clone();

        msg!("NFT PDA mint field updated !!!");

        Ok(())
    }

    pub fn create_metadata(
        ctx: Context<CreateMetadata>,
        name: String,
        uri: String,
        seller_fee_basis_points: u16,
        symbol: String,
    ) -> Result<()> {
        msg!("starting create metadata account process");

        msg!("Getting seeds of mint authority pda");
        let seeds = &[
            "mint".as_bytes(),
            &[*ctx.bumps.get("mint_authority").unwrap()],
        ];
        let signer = [&seeds[..]];
        msg!("Got seeds of mint authority pda");

        let account_info = vec![
            ctx.accounts.metadata.to_account_info(), // metadata account
            ctx.accounts.mint.to_account_info(),     // mint account
            ctx.accounts.mint_authority.to_account_info(), // mint authority
            ctx.accounts.payer.to_account_info(),          // payer
            ctx.accounts.mint_authority.to_account_info(), // update authority
            ctx.accounts.system_program.to_account_info(), // solana system program
                                                           // ctx.accounts.rent.to_account_info(),
        ];
        msg!("Account Info Assigned");
        let creator = vec![
            mpl_token_metadata::state::Creator {
                address: *ctx.accounts.current_program.key,
                verified: false,
                share: 100,
            },
            mpl_token_metadata::state::Creator {
                address: ctx.accounts.mint_authority.key(),
                verified: true,
                share: 0,
            },
        ];
        msg!("Creator Assigned");
        invoke_signed(
            &create_metadata_accounts_v3(
                ctx.accounts.token_metadata_program.key(), // token metadata program
                ctx.accounts.metadata.key(),               // metadata account PDA for mint
                ctx.accounts.mint.key(),                   // mint account
                ctx.accounts.mint_authority.key(), // mint authority
                ctx.accounts.payer.key(),          // payer for transaction
                ctx.accounts.mint_authority.key(), // update authority
                name,                              // name
                symbol,                            // symbol
                uri,                               // uri (offchain metadata)
                Some(creator),                     // (optional) creators
                seller_fee_basis_points,           // seller free basis points
                true,                              // (bool) update authority is signer
                true,                              // (bool) is mutable
                None,                              // (optional) collection
                None,                              // (optional) uses
                None,                              // (optional) collection details
            ),
            account_info.as_slice(),
            &signer,
        )?;
        msg!("Metadata Account Created !!!");

        Ok(())
    }

    pub fn create_master_edition(ctx: Context<CreateMasterEdition>, _name: String) -> Result<()> {
        msg!("starting create master edition process");

        msg!("Getting seeds of mint authority pda");
        let seeds = &[
            "mint".as_bytes(),
            &[*ctx.bumps.get("mint_authority").unwrap()],
        ];
        let signer = [&seeds[..]];
        msg!("Got seeds of mint authority pda");

        let master_edition_infos = vec![
            ctx.accounts.master_edition.to_account_info(), // master edition id
            ctx.accounts.mint.to_account_info(),           // mint id
            ctx.accounts.mint_authority.to_account_info(), // update authority id - set it to the current program, need to check if I need to create a PDA for this
            ctx.accounts.mint_authority.to_account_info(), // mint authority id - set it to the current program, need to check if I need to create a PDA for this
            ctx.accounts.payer.to_account_info(),          // payer id
            ctx.accounts.metadata.to_account_info(),       // metadata account id
            ctx.accounts.token_program.to_account_info(),  // spl token id
            ctx.accounts.system_program.to_account_info(), // system program id
                                                           // ctx.accounts.rent.to_account_info(),
        ];
        msg!("Master Edition Account Infos Assigned");
        invoke_signed(
            &create_master_edition_v3(
                ctx.accounts.token_metadata_program.key(), // token metadata program
                ctx.accounts.master_edition.key(),         // id of master edition account
                ctx.accounts.mint.key(),                   // mint id
                ctx.accounts.mint_authority.key(), // update authority id - set it to the current program, need to check if I need to create a PDA for this
                ctx.accounts.mint_authority.key(), // mint authority id - set it to the current program, need to check if I need to create a PDA for this
                ctx.accounts.metadata.key(),       // metadata account id
                ctx.accounts.payer.key(),          // payer id
                Some(1),                           // max supply
            ),
            master_edition_infos.as_slice(),
            &signer,
        )?;
        msg!("Master Edition Nft Minted !!!");

        Ok(())
    }

    pub fn delete_nft(ctx: Context<DeleteNft>, _name: String) -> Result<()> {
        msg!("starting burn nft process");

        msg!("Getting seeds of nft pda (owner of the nft)");
        let mint_key = ctx.accounts.mint.key().clone();
        let seeds = &[
            "nftPDA".as_bytes(),
            mint_key.as_ref(),
            &[*ctx.bumps.get("nft_pda").unwrap()],
        ];
        let signer = [&seeds[..]];
        msg!("Got seeds of nft pda");

        msg!("Assinging account infos");
        let burn_nft_account_infos = vec![
            ctx.accounts.metadata.to_account_info(), // `[writable]` NFT metadata
            ctx.accounts.nft_pda.to_account_info(),  // `[writable, signer]` Owner of NFT
            ctx.accounts.mint.to_account_info(),     // `[writable]` Mint of NFT
            ctx.accounts.token_account.to_account_info(), // `[writable]` NFT token account
            ctx.accounts.master_edition.to_account_info(), // `[writable]` NFT edition account
            ctx.accounts.token_program.to_account_info(), // `[]` SPL Token program
                                                     // Optional `[writable]` Collection metadata account
        ];
        msg!("Account infos assigned");
        msg!("Invoking metaplex");
        invoke_signed(
            &burn_nft(
                ctx.accounts.token_metadata_program.key(), // program_id: Pubkey,
                ctx.accounts.metadata.key(),               // metadata: Pubkey,
                ctx.accounts.nft_pda.key(),                // owner: Pubkey,
                ctx.accounts.mint.key(),                   // mint: Pubkey,
                ctx.accounts.token_account.key(),          // token: Pubkey,
                ctx.accounts.master_edition.key(),         // edition: Pubkey,
                ctx.accounts.token_program.key(),          // spl_token: Pubkey,
                None,                                      // collection_metadata: Option<Pubkey>,
            ),
            burn_nft_account_infos.as_slice(),
            &signer,
        )?;
        msg!("Success!");
        Ok(())
    }

    pub fn transfer_nft(ctx: Context<TransferNft>, _name: String) -> Result<()> {
        msg!("starting transfer nft process");

        msg!("Getting seeds of nft pda (current owner of the nft)");
        let mint_key = ctx.accounts.mint.key().clone();
        let seeds = &[
            "nftPDA".as_bytes(),
            mint_key.as_ref(),
            &[*ctx.bumps.get("authority_account").unwrap()],
        ];
        let signer = [&seeds[..]];
        msg!("Got seeds of nft pda");

        msg!(
            "Invoking anchor_spl::token::transfer for transferring sol to the conservation project"
        );
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.project_account.to_account_info(),
                },
            ),
            500_000_000,
        )?;
        msg!("Invoking anchor_spl::token::transfer for transferring sol to treasury");
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.treasury_account.to_account_info(),
                },
            ),
            500_000_000, // In lamports - should equal 0.5 sol
        )?;

        msg!("Invoking anchor_spl::token::transfer for transferring the nft");

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.from_account.to_account_info(),
                    to: ctx.accounts.to_account.to_account_info(),
                    authority: ctx.accounts.authority_account.to_account_info(),
                },
                &signer,
            ),
            1,
        )?;

        msg!("Success!!");

        Ok(())
    }

    pub fn create_election(ctx: Context<CreateElection>, date_of_election: i64) -> Result<()> {
        msg!("Starting create_election process");

        msg!("Validating the datetime passed in");
        let clock = Clock::get()?;
        let current_timestamp = clock.unix_timestamp;
        if date_of_election < current_timestamp {
            return err!(InvalidElectionError::InvalidDate);
        };
        msg!("Validated the datetime passed in");

        msg!("Creating new organisations struct");
        let election_organisations = Organisations {
            mauritius_wildlife_protection: Organisation {
                name: String::from("mauritius_wildlife_protection"),
                address: ctx.accounts.mauritius_wildlife_protection.key(),
                votes: 0,
            },
            mauritius_nature_protection_society: Organisation {
                name: String::from("mauritius_nature_protection_society"),
                address: ctx.accounts.mauritius_nature_protection_society.key(),
                votes: 0,
            },
            mauritius_marine_life_protection: Organisation {
                name: String::from("mauritius_marine_life_protection"),
                address: ctx.accounts.mauritius_marine_life_protection.key(),
                votes: 0,
            },
        };
        msg!("Successfully created new organisations struct");
        msg!("Updating newly created election_pda");
        ctx.accounts.election_pda.desc = String::from("election");
        ctx.accounts.election_pda.date = date_of_election;
        ctx.accounts.election_pda.organisations = election_organisations;
        msg!("Successfully updated newly created election_pda");
        Ok(())
    }

    pub fn create_vote(
        ctx: Context<CreateVote>,
        _name_of_nft: String,
        _date_of_election: i64,
        mauritius_wildlife_protection_vote: u32,
        mauritius_nature_protection_society_vote: u32,
        mauritius_marine_life_protection_vote: u32,
    ) -> Result<()> {
        msg!("Starting create vote process");

        msg!("Validating that the election is still active");
        let current_timestamp = Clock::get()?.unix_timestamp;
        if ctx.accounts.election_pda.date < current_timestamp {
            return err!(InvalidVoteError::ElectionClosed);
        };
        msg!("Validated that the election is still active");

        msg!("Validating that the amount of votes passed in is <= 100");
        if mauritius_wildlife_protection_vote
            + mauritius_nature_protection_society_vote
            + mauritius_marine_life_protection_vote
            > 100
        {
            return err!(InvalidVoteError::VoteTooLarge);
        }
        msg!("Validated the number of votes passed in");

        msg!("Creating Votes struct based on the votes passed in");
        let vote = Votes {
            mauritius_wildlife_protection: UserVote {
                amount: mauritius_wildlife_protection_vote,
                organisation_name: String::from("mauritius_wildlife_protection"),
                organisation_address: ctx.accounts.mauritius_wildlife_protection.key(),
            },
            mauritius_nature_protection_society: UserVote {
                amount: mauritius_nature_protection_society_vote,
                organisation_name: String::from("mauritius_nature_protection_society"),
                organisation_address: ctx.accounts.mauritius_nature_protection_society.key(),
            },
            mauritius_marine_life_protection: UserVote {
                amount: mauritius_marine_life_protection_vote,
                organisation_name: String::from("mauritius_marine_life_protection"),
                organisation_address: ctx.accounts.mauritius_marine_life_protection.key(),
            },
        };
        msg!("Created Votes struct based on the votes passed in");

        msg!("Updating newly created Vote PDA with the appropriate values and votes");
        ctx.accounts.vote_pda.desc = String::from("vote");
        ctx.accounts.vote_pda.mint = ctx.accounts.mint.key();
        ctx.accounts.vote_pda.voter = ctx.accounts.payer.key();
        ctx.accounts.vote_pda.ata = ctx.accounts.ata_account.key();
        ctx.accounts.vote_pda.date = current_timestamp;
        ctx.accounts.vote_pda.vote = vote;
        msg!("Updated newly created Vote PDA with the appropriate values and votes");

        msg!("Updating Election PDA with new values for the votes for each organisation");
        ctx.accounts
            .election_pda
            .organisations
            .mauritius_wildlife_protection
            .votes += mauritius_wildlife_protection_vote as u64;
        ctx.accounts
            .election_pda
            .organisations
            .mauritius_nature_protection_society
            .votes += mauritius_nature_protection_society_vote as u64;
        ctx.accounts
            .election_pda
            .organisations
            .mauritius_marine_life_protection
            .votes += mauritius_marine_life_protection_vote as u64;
        msg!("Updated Election PDA with new values for the votes for each organisation");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeMintAuthority<'info> {
    #[account(
        init,
        seeds = [b"mint".as_ref()],
        bump,
        payer = payer,
        space = 100
    )]
    pub mint_authority: Account<'info, MintAuthority>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    #[account(mut)]
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateMint<'info> {
    #[account(
        init,
        seeds = [&name.as_bytes().as_ref(), current_program.key.as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = mint_authority,
        mint::freeze_authority = mint_authority,
        payer = payer
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        seeds = [b"mint".as_ref()],
        bump,
    )]
    pub mint_authority: Account<'info, MintAuthority>,
    pub token_program: Program<'info, Token>,
    #[account(
        init,
        payer = payer,
        space = 200,
        seeds = [b"nftPDA".as_ref(), mint.key().as_ref()],
        bump
    )]
    pub nft_pda: Account<'info, NftPDA>,
    #[account(
        init,
        payer = payer,
        associated_token::mint = mint, // mint of the token
        associated_token::authority = nft_pda, // authority that should be a PDA account
    )]
    pub token_account: Account<'info, TokenAccount>,
    pub token_metadata_program: Program<'info, TokenMetaData>,
    // Security - I need to verify that the address requesting to create an NFT is authorised to request this, otherwise anyone can use this program to create fake NFTs
    #[account(mut, constraint = payer.key.to_string() == String::from("kq29PDUDGccE8WWACB76XVyn56TuozLfyGQ9NTDRyxH"))]
    pub payer: Signer<'info>, // Why do I have a payer and a signer - are they not the same thing?
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// CHECK: This is safe because I verify that the account passed in has the right public key
    #[account(constraint = current_program.key.to_string() == String::from("Bco4dXjvoM1oPsU5c2u8rDKXesq2r9iKoM6cSGz53i87"))]
    pub current_program: UncheckedAccount<'info>,
    /// CHECK: This is dangerous - I need to think about how to make this safe
    #[account(mut)]
    pub organisation_wallet: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateMetadata<'info> {
    #[account(
        seeds = [&name.as_bytes().as_ref(), current_program.key.as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = mint_authority,
        mint::freeze_authority = mint_authority
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        seeds = [b"mint".as_ref()],
        bump,
    )]
    pub mint_authority: Account<'info, MintAuthority>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Using "address" constraint to validate metadata account address
    #[account(
        mut,
        address=find_metadata_account(&mint.key()).0
    )]
    pub metadata: UncheckedAccount<'info>,
    pub token_metadata_program: Program<'info, TokenMetaData>,
    // Security - I need to verify that the address requesting to create an NFT is authorised to request this, otherwise anyone can use this program to create fake NFTs
    #[account(mut, constraint = payer.key.to_string() == String::from("kq29PDUDGccE8WWACB76XVyn56TuozLfyGQ9NTDRyxH"))]
    pub payer: Signer<'info>, // Why do I have a payer and a signer - are they not the same thing?
    pub system_program: Program<'info, System>,
    /// CHECK: This is safe because I verify that the account passed in has the right public key
    #[account(constraint = current_program.key.to_string() == String::from("Bco4dXjvoM1oPsU5c2u8rDKXesq2r9iKoM6cSGz53i87"))]
    pub current_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct CreateMasterEdition<'info> {
    #[account(
        seeds = [&name.as_bytes().as_ref(), current_program.key.as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = mint_authority,
        mint::freeze_authority = mint_authority,
        mut
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        seeds = [b"mint".as_ref()],
        bump,
    )]
    pub mint_authority: Account<'info, MintAuthority>,
    pub token_program: Program<'info, Token>,
    /// CHECK: Using "address" constraint to validate metadata account address
    #[account(
        mut,
        address=find_metadata_account(&mint.key()).0
    )]
    pub metadata: UncheckedAccount<'info>,
    pub token_metadata_program: Program<'info, TokenMetaData>,
    // Security - I need to verify that the address requesting to create an NFT is authorised to request this, otherwise anyone can use this program to create fake NFTs
    #[account(mut, constraint = payer.key.to_string() == String::from("kq29PDUDGccE8WWACB76XVyn56TuozLfyGQ9NTDRyxH"))]
    pub payer: Signer<'info>, // Why do I have a payer and a signer - are they not the same thing?
    pub system_program: Program<'info, System>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,
    /// CHECK: This is safe because I verify that the account passed in has the right public key
    #[account(constraint = current_program.key.to_string() == String::from("Bco4dXjvoM1oPsU5c2u8rDKXesq2r9iKoM6cSGz53i87"))]
    pub current_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct DeleteNft<'info> {
    // `[writable]` NFT metadata
    /// CHECK: Using "address" constraint to validate metadata account address
    #[account(
        mut,
        address=find_metadata_account(&mint.key()).0
    )]
    pub metadata: UncheckedAccount<'info>,

    // `[writable, signer]` Owner of NFT
    #[account(
        mut,
        seeds = [b"nftPDA".as_ref(), mint.key().as_ref()],
        bump
    )]
    pub nft_pda: Account<'info, NftPDA>,

    // `[writable]` Mint of NFT
    #[account(
        mut,
        seeds = [&name.as_bytes().as_ref(), current_program.key.as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = mint_authority,
        mint::freeze_authority = mint_authority,
    )]
    pub mint: Account<'info, Mint>,

    // `[writable]` NFT token account
    #[account(
        mut,
        associated_token::mint = mint, // mint of the token
        associated_token::authority = nft_pda, // authority that should be a PDA account
    )]
    pub token_account: Account<'info, TokenAccount>,

    // `[writable]` NFT edition account
    // Need to implement manual validation for this
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    // `[]` SPL Token program
    pub token_program: Program<'info, Token>,
    // Optional `[writable]` Collection metadata account
    // Not included yet - need to implement collections first

    // Token Metadata program
    pub token_metadata_program: Program<'info, TokenMetaData>,

    // Mint authority
    // It seems that after the creation of the master edition, the master edition becomes the mint authority
    // Need to implement manual validation for this
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub mint_authority: UncheckedAccount<'info>,

    //Current program
    /// CHECK: This is safe because I verify that the account passed in has the right public key
    #[account(constraint = current_program.key.to_string() == String::from("Bco4dXjvoM1oPsU5c2u8rDKXesq2r9iKoM6cSGz53i87"))]
    pub current_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(name: String)]
pub struct TransferNft<'info> {
    // project_account (sol account of the conservation project)
    /// CHECK - this is dangerous - need to implement PDAs to hold information about verified conservation project addresses
    #[account(mut)]
    pub project_account: UncheckedAccount<'info>,
    // Treasury account
    #[account(
        init_if_needed,
        space = 200,
        payer = payer,
        seeds = [b"treasury".as_ref()],
        bump,
        owner = current_program.key()
    )]
    pub treasury_account: Account<'info, Treasury>,
    // From account (token_account of the nft_pda)
    #[account(
        mut,
        associated_token::mint = mint, // mint of the token
        associated_token::authority = authority_account, // authority that should be a PDA account
    )]
    pub from_account: Account<'info, TokenAccount>,
    // To account (ATA of the wallet we are transferring to. May need to initialise it)
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint,
        associated_token::authority = payer
    )]
    pub to_account: Account<'info, TokenAccount>,
    // Authority account (nft_pda)
    #[account(
        mut,
        seeds = [b"nftPDA".as_ref(), mint.key().as_ref()],
        bump
    )]
    pub authority_account: Account<'info, NftPDA>,
    // Mint of the nft (used for validating accounts above)
    #[account(
        mut,
        seeds = [&name.as_bytes().as_ref(), current_program.key.as_ref()],
        bump,
        mint::decimals = 0,
        mint::authority = mint_authority,
        mint::freeze_authority = mint_authority,
    )]
    pub mint: Account<'info, Mint>,
    // Mint authority
    // It seems that after the creation of the master edition, the master edition becomes the mint authority
    // Need to implement validation for this
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub mint_authority: UncheckedAccount<'info>,
    // Current program
    /// CHECK: This is safe because I verify that the account passed in has the right public key
    #[account(constraint = current_program.key.to_string() == String::from("Bco4dXjvoM1oPsU5c2u8rDKXesq2r9iKoM6cSGz53i87"))]
    pub current_program: UncheckedAccount<'info>,
    // SPL Token program
    pub token_program: Program<'info, Token>,
    // Associated Token Program
    pub associated_token_program: Program<'info, AssociatedToken>,
    // System program
    pub system_program: Program<'info, System>,
    // User
    #[account(mut)]
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(date_of_election: i64)]
pub struct CreateElection<'info> {
    // Election PDA
    #[account(
        init,
        payer = payer,
        space = 300,
        seeds = [b"election".as_ref(), &date_of_election.to_string().as_bytes().as_ref()],
        bump
    )]
    pub election_pda: Box<Account<'info, Election>>,
    // mauritius_wildlife_protection account
    /// CHECK: This is safe because I verify that the account passed in has the right public key
    #[account(constraint = mauritius_wildlife_protection.key.to_string() == String::from("EoXeTQoYCaskdP4UrkMx93A43NaUuUQtYDBeXj2HEtLQ"))]
    pub mauritius_wildlife_protection: SystemAccount<'info>,
    // mauritius_nature_protection_society account
    /// CHECK: This is safe because I verify that the account passed in has the right public key
    #[account(constraint = mauritius_nature_protection_society.key.to_string() == String::from("EoXeTQoYCaskdP4UrkMx93A43NaUuUQtYDBeXj2HEtLQ"))]
    pub mauritius_nature_protection_society: SystemAccount<'info>,
    // mauritius_marine_life_protection account
    /// CHECK: This is safe because I verify that the account passed in has the right public key
    #[account(constraint = mauritius_marine_life_protection.key.to_string() == String::from("EoXeTQoYCaskdP4UrkMx93A43NaUuUQtYDBeXj2HEtLQ"))]
    pub mauritius_marine_life_protection: SystemAccount<'info>,
    // System program
    pub system_program: Program<'info, System>,
    // Payer - Security - I verify that the address requesting to create an election is authorised to request this, otherwise anyone can use this program to create fake elections
    #[account(mut, constraint = payer.key.to_string() == String::from("kq29PDUDGccE8WWACB76XVyn56TuozLfyGQ9NTDRyxH"))]
    pub payer: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(name_of_nft: String, date_of_election: i64, mauritius_wildlife_protection_vote: u32, mauritius_nature_protection_society_vote: u32, mauritius_marine_life_protection_vote: u32)]
pub struct CreateVote<'info> {
    // Vote PDA
    #[account(
            init,
            payer = payer,
            space = 400,
            seeds = [mint.key().as_ref(), election_pda.key().as_ref()],
            bump
        )]
    pub vote_pda: Box<Account<'info, Vote>>,
    // Election PDA
    #[account(
            seeds = [b"election".as_ref(), &date_of_election.to_string().as_bytes().as_ref()],
            bump
        )]
    pub election_pda: Box<Account<'info, Election>>,
    // Mint of the nft (used for validating accounts above) - need to make sure that this mint is a valid PDA of the program and the supply of this mint is 1
    #[account(
            mut,
            seeds = [&name_of_nft.as_bytes().as_ref(), current_program.key.as_ref()],
            bump,
            mint::decimals = 0,
            mint::authority = mint_authority,
            mint::freeze_authority = mint_authority,
            constraint = mint.supply == 1,
        )]
    pub mint: Account<'info, Mint>,
    // Mint authority
    // It seems that after the creation of the master edition, the master edition becomes the mint authority
    // Need to implement validation for this
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub mint_authority: UncheckedAccount<'info>,
    // ATA account (need to verify that the token balance is 1)
    #[account(
            mut,
            associated_token::mint = mint, // mint of the token
            associated_token::authority = payer, // authority that should be a PDA account
            constraint = ata_account.amount == 1
        )]
    pub ata_account: Account<'info, TokenAccount>,
    // mauritius_wildlife_protection account
    /// CHECK: This is safe because I verify that the account passed in has the right public key
    #[account(constraint = mauritius_wildlife_protection.key.to_string() == String::from("EoXeTQoYCaskdP4UrkMx93A43NaUuUQtYDBeXj2HEtLQ"))]
    pub mauritius_wildlife_protection: SystemAccount<'info>,
    // mauritius_nature_protection_society account
    /// CHECK: This is safe because I verify that the account passed in has the right public key
    #[account(constraint = mauritius_nature_protection_society.key.to_string() == String::from("EoXeTQoYCaskdP4UrkMx93A43NaUuUQtYDBeXj2HEtLQ"))]
    pub mauritius_nature_protection_society: SystemAccount<'info>,
    // mauritius_marine_life_protection account
    /// CHECK: This is safe because I verify that the account passed in has the right public key
    #[account(constraint = mauritius_marine_life_protection.key.to_string() == String::from("EoXeTQoYCaskdP4UrkMx93A43NaUuUQtYDBeXj2HEtLQ"))]
    pub mauritius_marine_life_protection: SystemAccount<'info>,
    // System program
    pub system_program: Program<'info, System>,
    // Current program
    /// CHECK: This is safe because I verify that the account passed in has the right public key
    #[account(constraint = current_program.key.to_string() == String::from("Bco4dXjvoM1oPsU5c2u8rDKXesq2r9iKoM6cSGz53i87"))]
    pub current_program: UncheckedAccount<'info>,
    // Payer
    #[account(mut)]
    pub payer: Signer<'info>,
}

#[derive(Clone)]
pub struct TokenMetaData;
impl anchor_lang::Id for TokenMetaData {
    fn id() -> Pubkey {
        MetadataTokenId
    }
}

#[account]
#[derive(Default)]
pub struct NftPDA {
    mint: Pubkey, // "mint"
    conservation_address: String,
}

#[account]
#[derive(Default)]
pub struct MintAuthority {
    desc: String, // "mint authority"
}

#[account]
#[derive(Default)]
pub struct Treasury {
    desc: String, // "treasury"
}

// Election PDA
// Seeds for this will  be [b"election".as_ref(), date_of_election.to_string().as_bytes().as_ref()], current_program.key()
#[account]
#[derive(Default)]
pub struct Election {
    desc: String, // "election"
    date: i64,    // 26/02/2023
    organisations: Organisations,
}

// Vote PDA
// Seeds for this will  be [mint.key().as_ref(), election.key().as_bytes().as_ref()], current_program.key()
#[account]
#[derive(Default)]
pub struct Vote {
    desc: String,  // "vote" 32 + 4
    mint: Pubkey,  // the mint address of the nft that qualifies the voter to vote 32 + 4
    voter: Pubkey, // the address of the person voting 32 + 4
    ata: Pubkey, // the ATA of the voter that contains the nft that qualifies the voter to vote 32 + 4
    date: i64,
    vote: Votes,
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Debug, Default, Clone)]
pub struct Organisations {
    mauritius_wildlife_protection: Organisation,
    mauritius_nature_protection_society: Organisation,
    mauritius_marine_life_protection: Organisation,
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Debug, Default, Clone)]
pub struct Organisation {
    name: String,
    address: Pubkey,
    votes: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Debug, Default, Clone)]
pub struct Votes {
    mauritius_wildlife_protection: UserVote,
    mauritius_nature_protection_society: UserVote,
    mauritius_marine_life_protection: UserVote,
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Debug, Default, Clone)]
pub struct UserVote {
    amount: u32,                  // amount of votes allocated 4
    organisation_name: String,    // name of the organisation being voted for
    organisation_address: Pubkey, // address of the organisation being voted for 4 + 32
}

#[error_code]
pub enum InvalidVoteError {
    #[msg("Number number of votes cast is too high")]
    VoteTooLarge,
    #[msg("Number number of votes cast should not be negative")]
    VoteNegative,
    #[msg("Election is closed - its date is in the past")]
    ElectionClosed,
}

#[error_code]
pub enum InvalidElectionError {
    #[msg("Passed in date is in the past")]
    InvalidDate,
}

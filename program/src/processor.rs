use crate::error::StakeError;
use crate::instruction::StakeInstruction;
use crate::state::StakeAccountState;
use borsh::BorshSerialize;
use mpl_token_metadata::ID as mpl_metadata_program_id;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    borsh::try_from_slice_unchecked,
    clock::Clock,
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_pack::IsInitialized,
    pubkey::Pubkey,
    system_instruction,
    sysvar::{rent::Rent, Sysvar},
};
use spl_token::ID as spl_token_program_id;

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let instruction = StakeInstruction::unpack(instruction_data)?;

    match instruction {
        StakeInstruction::InitializeStakeAccount => {
            process_initialize_stake_account(program_id, accounts)?;
        }
        StakeInstruction::Stake => {
            process_stake(program_id, accounts)?;
        }
        StakeInstruction::Redeem => {
            process_redeem(program_id, accounts)?;
        }
        StakeInstruction::Unstake => {
            process_unstake(program_id, accounts)?;
        }
    }
    Ok(())
}

pub fn process_initialize_stake_account(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
) -> ProgramResult {
    // In the completed version, it would be good if we did some checks on the nft account to check
    // That is it an appropriate ATA belonging to the initialiser. Maybe we could also offer a way
    // For the user to change their designated withdraw account in the future

    // Iterate over accounts
    let account_info_iter = &mut accounts.iter();
    let initializer = next_account_info(account_info_iter)?;
    let nft_account = next_account_info(account_info_iter)?;
    let pda_account = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Security - Signer Check
    if !initializer.is_signer {
        msg!("Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Derive PDA address
    let (pda, bump_seed) = Pubkey::find_program_address(
        &[initializer.key.as_ref(), nft_account.key.as_ref()],
        program_id,
    );

    // Security - PDA account validation
    if pda != *pda_account.key {
        msg!("Invalid seeds for PDA");
        return Err(ProgramError::InvalidArgument);
    }

    // Calculate space and rent for PDA address
    // Space
    let account_len = 1000;
    // Rent
    let rent = Rent::get()?;
    let rent_lamports = rent.minimum_balance(account_len);

    // Create the account
    invoke_signed(
        &system_instruction::create_account(
            initializer.key,
            pda_account.key,
            rent_lamports,
            account_len.try_into().unwrap(),
            program_id,
        ),
        &[
            initializer.clone(),
            pda_account.clone(),
            system_program.clone(),
        ],
        &[&[
            initializer.key.as_ref(),
            nft_account.key.as_ref(),
            &[bump_seed],
        ]],
    )?;

    msg!("PDA created: {}", pda);

    msg!("unpacking state account");
    let mut account_data =
        try_from_slice_unchecked::<StakeAccountState>(&pda_account.data.borrow()).unwrap();
    msg!("borrowed account data");

    account_data.is_initialized = true;
    account_data.currently_staked = false;
    account_data.token_account = *nft_account.key;
    account_data.user_account = *initializer.key;
    account_data.last_staked = None;
    account_data.last_withdrawn = None;

    msg!("serializing account");
    account_data.serialize(&mut &mut pda_account.data.borrow_mut()[..])?;
    msg!("state account serialized");

    Ok(())
}

pub fn process_stake(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    // Iterate over accounts
    let account_info_iter = &mut accounts.iter();
    let initializer = next_account_info(account_info_iter)?;
    let nft_account = next_account_info(account_info_iter)?;
    let nft_mint = next_account_info(account_info_iter)?;
    let nft_edition = next_account_info(account_info_iter)?;
    let stake_state = next_account_info(account_info_iter)?;
    let program_authority = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let metadata_program = next_account_info(account_info_iter)?;

    // Security - Signer Check
    if !initializer.is_signer {
        msg!("Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Deriving PDA to be the authority to freeze the NFT while it is staked
    let (delegated_auth_pda, delegate_bump) =
        Pubkey::find_program_address(&[b"authority"], program_id);
    if delegated_auth_pda != *program_authority.key {
        msg!("Invalid seeds for PDA");
        return Err(StakeError::InvalidPDA.into());
    }

    // Derive PDA which stores state of the stake
    let (stake_state_pda, _bump_seed) = Pubkey::find_program_address(
        &[initializer.key.as_ref(), nft_account.key.as_ref()],
        program_id,
    );
    if stake_state_pda != *stake_state.key {
        msg!("Invalid seeds for PDA");
        return Err(StakeError::InvalidPDA.into());
    }

    msg!("Approving delegation");
    invoke(
        &spl_token::instruction::approve(
            &spl_token_program_id,
            nft_account.key,
            program_authority.key,
            initializer.key,
            &[initializer.key],
            1,
        )?,
        &[
            nft_account.clone(),
            program_authority.clone(),
            initializer.clone(),
            token_program.clone(),
        ],
    )?;

    msg!("freezing NFT token account");
    invoke_signed(
        &mpl_token_metadata::instruction::freeze_delegated_account(
            mpl_metadata_program_id,
            *program_authority.key,
            *nft_account.key,
            *nft_edition.key,
            *nft_mint.key,
        ),
        &[
            program_authority.clone(),
            nft_account.clone(),
            nft_edition.clone(),
            nft_mint.clone(),
            metadata_program.clone(),
        ],
        &[&[b"authority", &[delegate_bump]]],
    )?;

    msg!("unpacking state account");
    let mut account_data =
        try_from_slice_unchecked::<StakeAccountState>(&stake_state.data.borrow()).unwrap();
    msg!("borrowed account data");

    // Security - Check that the Stake Account PDA is initialised
    if !account_data.is_initialized() {
        msg!("Account not initialized");
        return Err(StakeError::UnitializedAccount.into());
    }

    // Security - Check that the initializer account is the same as at initialization
    if account_data.user_account != *initializer.key {
        msg!("The signer/user is not the same initializer who created the stake");
        return Err(StakeError::InvalidStakeAccount.into());
    }

    // Security - Check that the token account is the one passed at initialization
    if account_data.token_account != *nft_account.key {
        msg!("Token account is not the same as the one passed in at stake initialisation");
        return Err(StakeError::InvalidTokenAccount.into());
    }

    // Security - Check that the account is not already staking
    if account_data.currently_staked {
        msg!("Account is already staking the NFT!");
        return Err(StakeError::InvalidStakeOperation.into());
    }

    let clock = Clock::get()?;
    let time_staked = clock.unix_timestamp;

    msg!("Staked commenced at {}", time_staked);

    account_data.is_initialized = true;
    account_data.currently_staked = true;
    account_data.token_account = *nft_account.key;
    account_data.user_account = *initializer.key;
    account_data.last_staked = Some(time_staked);

    msg!("serializing account");
    account_data.serialize(&mut &mut stake_state.data.borrow_mut()[..])?;
    msg!("state account serialized");

    Ok(())
}

pub fn process_redeem(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    // Iterate over accounts
    let account_info_iter = &mut accounts.iter();
    let user = next_account_info(account_info_iter)?;
    let nft_token_account = next_account_info(account_info_iter)?;
    let stake_state = next_account_info(account_info_iter)?;
    let stake_mint = next_account_info(account_info_iter)?;
    let stake_authority = next_account_info(account_info_iter)?;
    let user_stake_ata = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    // Security - Signer Check
    if !user.is_signer {
        msg!("Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Derive PDA address
    let (stake_state_pda, _bump_seed) = Pubkey::find_program_address(
        &[user.key.as_ref(), nft_token_account.key.as_ref()],
        program_id,
    );

    // Security - PDA account validation
    if stake_state_pda != *stake_state.key {
        msg!("Invalid seeds for PDA");
        return Err(ProgramError::InvalidArgument);
    }

    // Derive authority PDA and do security validation
    let (stake_auth_pda, auth_bump) = Pubkey::find_program_address(&[b"mint"], program_id);

    if *stake_authority.key != stake_auth_pda {
        msg!("Invalid stake mint authority!");
        return Err(StakeError::InvalidPDA.into());
    }

    // Unpack state account
    msg!("unpacking state account");
    let mut account_data =
        try_from_slice_unchecked::<StakeAccountState>(&stake_state.data.borrow()).unwrap();
    msg!("borrowed account data");

    // Security - Check that the Stake Account PDA is initialised
    if !account_data.is_initialized() {
        msg!("Account not initialized");
        return Err(StakeError::UnitializedAccount.into());
    }

    // Security - Check that the account is currently staking
    if !account_data.currently_staked {
        msg!("Account is not staking the NFT!");
        return Err(StakeError::InvalidStakeOperation.into());
    }

    // Security - Check that the initializer account is the same as at initialization
    if account_data.user_account != *user.key {
        msg!("The signer/user is not the same initializer who created the stake");
        return Err(StakeError::InvalidStakeAccount.into());
    }

    // Security - Check that the token account is the correct one
    if account_data.token_account != *nft_token_account.key {
        msg!("Token account is not the same as the one passed in at stake initialisation");
        return Err(StakeError::InvalidTokenAccount.into());
    }

    // Security - Check that there is a timestamp for last_staked
    if account_data.last_staked == None {
        msg!("No start time for the stake recorded - cannot proceed with redeem");
        return Err(StakeError::InvalidStakeOperation.into());
    }

    let clock = Clock::get()?;
    let redeem_time = clock.unix_timestamp;
    let staked_time = redeem_time - account_data.last_staked.unwrap();
    let redeem_amount = 100 * staked_time;
    msg!("Redeeming {} tokens", redeem_amount);

    invoke_signed(
        &spl_token::instruction::mint_to(
            token_program.key,
            stake_mint.key,
            user_stake_ata.key,
            stake_authority.key,
            &[stake_authority.key],
            redeem_amount.try_into().unwrap(),
        )?,
        &[
            stake_mint.clone(),
            user_stake_ata.clone(),
            stake_authority.clone(),
            token_program.clone(),
        ],
        &[&[b"mint", &[auth_bump]]],
    )?;

    account_data.last_redeemed = Some(redeem_time);

    msg!("serializing account");
    account_data.serialize(&mut &mut stake_state.data.borrow_mut()[..])?;
    msg!("state account serialized");

    Ok(())
}

pub fn process_unstake(program_id: &Pubkey, accounts: &[AccountInfo]) -> ProgramResult {
    // When this program is extended to become the transfer authority for the NFT, this function will
    // need to transfer the transfer authority back to the user

    // Iterate over accounts
    let account_info_iter = &mut accounts.iter();
    let user = next_account_info(account_info_iter)?;
    let nft_token_account = next_account_info(account_info_iter)?;
    let nft_mint = next_account_info(account_info_iter)?;
    let nft_edition = next_account_info(account_info_iter)?;
    let stake_state = next_account_info(account_info_iter)?;
    let program_authority = next_account_info(account_info_iter)?;
    let stake_mint = next_account_info(account_info_iter)?;
    let stake_authority = next_account_info(account_info_iter)?;
    let user_stake_ata = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let metadata_program = next_account_info(account_info_iter)?;

    // Security - Signer Check
    if !user.is_signer {
        msg!("Missing required signature");
        return Err(ProgramError::MissingRequiredSignature);
    }

    // Derive PDA address
    let (stake_state_pda, _bump_seed) = Pubkey::find_program_address(
        &[user.key.as_ref(), nft_token_account.key.as_ref()],
        program_id,
    );

    // Security - PDA account validation
    if stake_state_pda != *stake_state.key {
        msg!("Invalid seeds for PDA");
        return Err(ProgramError::InvalidArgument);
    }

    let (delegated_auth_pda, delegate_bump) =
        Pubkey::find_program_address(&[b"authority"], program_id);
    if delegated_auth_pda != *program_authority.key {
        msg!("Invalid seeds for PDA");
        return Err(StakeError::InvalidPDA.into());
    }

    let (stake_auth_pda, auth_bump) = Pubkey::find_program_address(&[b"mint"], program_id);
    if *stake_authority.key != stake_auth_pda {
        msg!("Invalid stake mint authority!");
        return Err(StakeError::InvalidPDA.into());
    }

    // Unpack state account
    msg!("unpacking state account");
    let mut account_data =
        try_from_slice_unchecked::<StakeAccountState>(&stake_state.data.borrow()).unwrap();
    msg!("borrowed account data");

    // Security - Check that the Stake Account PDA is initialised
    if !account_data.is_initialized() {
        msg!("Account not initialized");
        return Err(StakeError::UnitializedAccount.into());
    }

    // Security - Check that the account is currently staking
    if !account_data.currently_staked {
        msg!("Account is not staking the NFT!");
        return Err(StakeError::InvalidStakeOperation.into());
    }

    // Security - Check that the initializer account is the same as at initialization
    if account_data.user_account != *user.key {
        msg!("The signer/user is not the same initializer who created the stake");
        return Err(StakeError::InvalidStakeAccount.into());
    }

    // Security - Check that the token account is the correct one
    if account_data.token_account != *nft_token_account.key {
        msg!("Token account is not the same as the one passed in at stake initialisation");
        return Err(StakeError::InvalidTokenAccount.into());
    }

    // Thaw the NFT
    msg!("thawing NFT token account");
    invoke_signed(
        &mpl_token_metadata::instruction::thaw_delegated_account(
            mpl_metadata_program_id,
            *program_authority.key,
            *nft_token_account.key,
            *nft_edition.key,
            *nft_mint.key,
        ),
        &[
            program_authority.clone(),
            nft_token_account.clone(),
            nft_edition.clone(),
            nft_mint.clone(),
            metadata_program.clone(),
        ],
        &[&[b"authority", &[delegate_bump]]],
    )?;

    // Revoke delegation of freeze authority
    msg!("Revoke delegation");
    invoke(
        &spl_token::instruction::revoke(
            &spl_token_program_id,
            nft_token_account.key,
            user.key,
            &[user.key],
        )?,
        &[
            nft_token_account.clone(),
            user.clone(),
            token_program.clone(),
        ],
    )?;

    let clock = Clock::get()?;
    let withdraw_time = clock.unix_timestamp;
    let redeem_amount = 100 * withdraw_time;
    msg!(
        "Withdrawn at {}, redeemed {} tokens",
        withdraw_time,
        redeem_amount
    );

    invoke_signed(
        &spl_token::instruction::mint_to(
            token_program.key,
            stake_mint.key,
            user_stake_ata.key,
            stake_authority.key,
            &[stake_authority.key],
            redeem_amount.try_into().unwrap(),
        )?,
        &[
            stake_mint.clone(),
            user_stake_ata.clone(),
            stake_authority.clone(),
            token_program.clone(),
        ],
        &[&[b"mint", &[auth_bump]]],
    )?;

    account_data.currently_staked = false;
    account_data.last_withdrawn = Some(withdraw_time);

    msg!("serializing account");
    account_data.serialize(&mut &mut stake_state.data.borrow_mut()[..])?;
    msg!("state account serialized");

    Ok(())
}

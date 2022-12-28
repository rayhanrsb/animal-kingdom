use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    clock::UnixTimestamp,
    program_pack::{IsInitialized, Sealed},
    pubkey::Pubkey
};

#[derive(BorshSerialize, BorshDeserialize)]
pub struct StakeAccountState {
    pub is_initialized: bool,
    pub currently_staked: bool,
    pub token_account: Pubkey,
    pub user_account: Pubkey,
    pub last_staked: Option<UnixTimestamp>,
    pub last_redeemed: Option<UnixTimestamp>,
    pub last_withdrawn: Option<UnixTimestamp>
}

impl Sealed for StakeAccountState {}

impl IsInitialized for StakeAccountState {
    fn is_initialized(&self) -> bool {
        self.is_initialized
    }
}

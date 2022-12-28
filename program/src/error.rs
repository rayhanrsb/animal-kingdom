use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StakeError {
    // Error 0
    #[error("Account not initialised")]
    UnitializedAccount,
    // Error 1
    #[error("PDA derived does not equal PDA passed in")]
    InvalidPDA,
    // Error 2
    #[error("Wrong Stake Account passed in")]
    InvalidStakeAccount,
    // Error 3
    #[error("Wrong Token Account passed in")]
    InvalidTokenAccount,
    // Error 4
    #[error("Invalid stake operation")]
    InvalidStakeOperation,
}

impl From<StakeError> for ProgramError {
    fn from(error: StakeError) -> Self {
        ProgramError::Custom(error as u32)
    }
}

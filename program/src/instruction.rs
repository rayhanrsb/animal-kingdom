// use borsh::BorshDeserialize;
use solana_program::program_error::ProgramError;

pub enum StakeInstruction {
    InitializeStakeAccount,
    Stake,
    Redeem,
    Unstake
}

impl StakeInstruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (&variant, rest) = input
            .split_first()
            .ok_or(ProgramError::InvalidInstructionData)?;
        // let payload = StakePayload::try_from_slice(rest).unwrap();
        Ok(match variant {
            0 => Self::InitializeStakeAccount,
            1 => Self::Stake,
            2 => Self::Redeem,
            3 => Self::Unstake,
            _ => return Err(ProgramError::InvalidInstructionData),
        })
    }
}

// #[derive(BorshDeserialize)]
// struct StakePayload {}
//! The Furnace - a one-way door for $SOW.
//!
//! Tokens sent to a furnace vault can only ever leave by being burned.
//! There is no withdraw, close, or authority-gated instruction: `stoke` is
//! permissionless and burns the entire vault balance, writing a permanent
//! on-chain receipt for every burn.

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token_interface::{self, Burn, Mint, TokenAccount, TokenInterface};

declare_id!("sowY54dvBKFqyeHCAALzt84AWxRYvxXLAowa8FdKmeW");

pub const FURNACE_SEED: &[u8] = b"furnace";
pub const RECEIPT_SEED: &[u8] = b"receipt";
pub const MAX_MEMO_LEN: usize = 64;

#[program]
pub mod sow_furnace {
    use super::*;

    /// Lights a furnace for `mint` and creates its vault (the furnace PDA's ATA).
    /// The authority is recorded for provenance only - it has no powers.
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let furnace = &mut ctx.accounts.furnace;
        furnace.mint = ctx.accounts.mint.key();
        furnace.authority = ctx.accounts.authority.key();
        furnace.total_burned = 0;
        furnace.burn_count = 0;
        furnace.bump = ctx.bumps.furnace;

        emit!(FurnaceLit {
            furnace: furnace.key(),
            mint: furnace.mint,
            authority: furnace.authority,
            vault: ctx.accounts.vault.key(),
        });
        Ok(())
    }

    /// Permissionless: burns the entire vault balance and writes a receipt.
    pub fn stoke(ctx: Context<Stoke>, memo: String) -> Result<()> {
        require!(memo.len() <= MAX_MEMO_LEN, FurnaceError::MemoTooLong);

        let amount = ctx.accounts.vault.amount;
        require!(amount > 0, FurnaceError::EmptyVault);

        let mint_key = ctx.accounts.mint.key();
        let bump = ctx.accounts.furnace.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[FURNACE_SEED, mint_key.as_ref(), &[bump]]];

        token_interface::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.mint.to_account_info(),
                    from: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.furnace.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        let clock = Clock::get()?;
        let furnace = &mut ctx.accounts.furnace;
        let index = furnace.burn_count;
        furnace.total_burned = furnace
            .total_burned
            .checked_add(amount)
            .ok_or(FurnaceError::Overflow)?;
        furnace.burn_count = index.checked_add(1).ok_or(FurnaceError::Overflow)?;

        let receipt = &mut ctx.accounts.receipt;
        receipt.furnace = furnace.key();
        receipt.index = index;
        receipt.amount = amount;
        receipt.slot = clock.slot;
        receipt.unix_ts = clock.unix_timestamp;
        receipt.caller = ctx.accounts.caller.key();
        receipt.memo = memo.clone();
        receipt.bump = ctx.bumps.receipt;

        emit!(Stoked {
            furnace: furnace.key(),
            mint: mint_key,
            index,
            amount,
            total_burned: furnace.total_burned,
            caller: receipt.caller,
            memo,
            slot: clock.slot,
            unix_ts: clock.unix_timestamp,
        });
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mint::token_program = token_program)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = 8 + Furnace::INIT_SPACE,
        seeds = [FURNACE_SEED, mint.key().as_ref()],
        bump,
    )]
    pub furnace: Account<'info, Furnace>,

    // init_if_needed: anyone can pre-create an ATA for the furnace PDA, which
    // must not be able to block initialization. The ATA constraints pin it.
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = furnace,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Stoke<'info> {
    /// Anyone. Pays rent for the burn receipt.
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [FURNACE_SEED, mint.key().as_ref()],
        bump = furnace.bump,
        has_one = mint @ FurnaceError::MintMismatch,
    )]
    pub furnace: Account<'info, Furnace>,

    #[account(mut, mint::token_program = token_program)]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = furnace,
        associated_token::token_program = token_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = caller,
        space = 8 + BurnReceipt::INIT_SPACE,
        seeds = [RECEIPT_SEED, furnace.key().as_ref(), &furnace.burn_count.to_le_bytes()],
        bump,
    )]
    pub receipt: Account<'info, BurnReceipt>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Furnace {
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub total_burned: u64,
    pub burn_count: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BurnReceipt {
    pub furnace: Pubkey,
    pub index: u64,
    pub amount: u64,
    pub slot: u64,
    pub unix_ts: i64,
    pub caller: Pubkey,
    #[max_len(64)]
    pub memo: String,
    pub bump: u8,
}

#[event]
pub struct FurnaceLit {
    pub furnace: Pubkey,
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub vault: Pubkey,
}

#[event]
pub struct Stoked {
    pub furnace: Pubkey,
    pub mint: Pubkey,
    pub index: u64,
    pub amount: u64,
    pub total_burned: u64,
    pub caller: Pubkey,
    pub memo: String,
    pub slot: u64,
    pub unix_ts: i64,
}

#[error_code]
pub enum FurnaceError {
    #[msg("The furnace vault is empty - nothing to burn")]
    EmptyVault,
    #[msg("Memo exceeds 64 bytes")]
    MemoTooLong,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Mint does not match this furnace")]
    MintMismatch,
}

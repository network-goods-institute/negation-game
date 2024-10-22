# 1. Privy for auth

Date: 2024-10-07

## Status

Accepted

## Context

This version of the negation game will still run on Web2 rails, but ocasionally we want to use contracts for the tokens and staking. We also want to target DAOs as users, and a lot of those users already use their wallets as auth for the work they do on the DAOs, so it's important to support Web3 wallet login.

That being considered, we also want the login to be friendly outside the context of crypto, so login with e-mail or social providers is also important.

[Privy](https://www.privy.io/) can help with support for both target audiences, without sacrificing UX for neither. It will also be helpful if we want to implement Farcaster integrations, since they support sign-in-with-farcaster, which we could use to link accounts

## Decision

We'll use Privy for auth.

## Consequences

Since they don't handle profile data, we'll have to host profile pictures, usernames and bios ourselves.
Also, if we outgrow the 1000 MAUs available on the free tier, we'll have to sign up for their $99/mo developer plan for up to 2500 MAUs, and $299/mo for 10k MAUs after that

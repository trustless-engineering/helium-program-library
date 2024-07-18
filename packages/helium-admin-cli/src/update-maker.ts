import * as anchor from "@coral-xyz/anchor";
import { makerKey, init as initHem } from "@helium/helium-entity-manager-sdk";
import { Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import Squads from "@sqds/sdk";
import os from "os";
import yargs from "yargs/yargs";
import { loadKeypair, sendInstructionsOrSquads } from "./utils";
import { HNT_MINT, MOBILE_MINT } from "@helium/spl-utils";
import { daoKey } from "@helium/helium-sub-daos-sdk";

export async function run(args: any = process.argv) {
  const yarg = yargs(args).options({
    wallet: {
      alias: "k",
      describe: "Anchor wallet keypair",
      default: `${os.homedir()}/.config/solana/id.json`,
    },
    url: {
      alias: "u",
      default: "http://127.0.0.1:8899",
      describe: "The solana url",
    },
    name: {
      alias: "n",
      type: "string",
      required: true,
      describe: "Name of the maker, case sensitive",
    },
    executeTransaction: {
      type: "boolean",
    },
    multisig: {
      type: "string",
      describe:
        "Address of the squads multisig to be authority. If not provided, your wallet will be the authority",
    },
    authorityIndex: {
      type: "number",
      describe: "Authority index for squads. Defaults to 1",
      default: 1,
    },
    updateAuthority: {
      type: "string",
      describe: "The new update authority to set",
    },
    issuingAuthority: {
      type: "string",
      describe: "The new issuing authority to set",
    },
  });
  const argv = await yarg.argv;
  process.env.ANCHOR_WALLET = argv.wallet;
  process.env.ANCHOR_PROVIDER_URL = argv.url;
  anchor.setProvider(anchor.AnchorProvider.local(argv.url));
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const wallet = new anchor.Wallet(loadKeypair(argv.wallet));
  const program = await initHem(provider);

  const instructions: TransactionInstruction[] = [];

  const maker = makerKey(daoKey(HNT_MINT)[0], argv.name)[0];
  const carrierAcc = await program.account.makerV0.fetch(maker);

  instructions.push(
    await program.methods
      .updateMakerV0({
        issuingAuthority: argv.issuingAuthority
          ? new PublicKey(argv.issuingAuthority)
          : null,
        updateAuthority: argv.updateAuthority
          ? new PublicKey(argv.updateAuthority)
          : null,
      })
      .accounts({
        maker,
        updateAuthority: carrierAcc.updateAuthority,
      })
      .instruction()
  );

  const squads = Squads.endpoint(process.env.ANCHOR_PROVIDER_URL, wallet, {
    commitmentOrConfig: "finalized",
  });

  await sendInstructionsOrSquads({
    provider,
    instructions,
    executeTransaction: argv.executeTransaction,
    squads,
    multisig: argv.multisig ? new PublicKey(argv.multisig) : undefined,
    authorityIndex: argv.authorityIndex,
    signers: [],
  });
}

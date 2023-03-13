import * as anchor from "@coral-xyz/anchor";
import { init as initCb, mintWindowedBreakerKey } from "@helium/circuit-breaker-sdk";
import { daoKey, init as initHsd } from "@helium/helium-sub-daos-sdk";
import {
  PublicKey
} from "@solana/web3.js";
import Squads from "@sqds/sdk";
import os from "os";
import yargs from "yargs/yargs";
import { loadKeypair, parseEmissionsSchedule, sendInstructionsOrSquads } from "./utils";


const { hideBin } = require("yargs/helpers");
const yarg = yargs(hideBin(process.argv)).options({
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
  hntMint: {
    required: true,
    type: "string",
    describe: "HNT mint of the dao to be updated",
  },
  newAuthority: {
    required: false,
    describe: "New DAO authority",
    type: "string",
    default: null,
  },
  newEmissionsSchedulePath: {
    required: false,
    describe: "Path to file that contains the new emissions schedule",
    type: "string",
    default: null,
  },
  newHstEmissionsSchedulePath: {
    required: false,
    describe: "Path to file that contains the new HST emissions schedule",
    type: "string",
    default: null,
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
});



async function run() {
  const argv = await yarg.argv;
  process.env.ANCHOR_WALLET = argv.wallet;
  process.env.ANCHOR_PROVIDER_URL = argv.url;
  anchor.setProvider(anchor.AnchorProvider.local(argv.url));
  const wallet = loadKeypair(argv.wallet);
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const govProgramId = new PublicKey(argv.govProgramId);
  const councilKey = new PublicKey(argv.councilKey);
  const program = await initHsd(provider);
  const cbProgram = await initCb(provider);

  const instructions = [];

  const hntMint = new PublicKey(argv.hntMint);
  const dao = daoKey(hntMint)[0];
  const daoAcc = await program.account.daoV0.fetch(dao);
  if (argv.newAuthority) {
    const hntCircuitBreaker = mintWindowedBreakerKey(hntMint)[0]
    const hntCbAcc = await cbProgram.account.mintWindowedCircuitBreakerV0.fetch(hntCircuitBreaker);
    instructions.push(await cbProgram.methods.updateMintWindowedBreakerV0({
      newAuthority: new PublicKey(argv.newAuthority),
      config: null,
    }).accounts({
      circuitBreaker: hntCircuitBreaker,
      authority: hntCbAcc.authority,
    }).instruction());
  }
  instructions.push(await program.methods.updateDaoV0({
    authority: new PublicKey(argv.newAuthority),
    emissionSchedule: argv.newEmissionsSchedulePath ? await parseEmissionsSchedule(argv.newEmissionsSchedulePath) : null,
    hstEmissionSchedule: argv.newHstEmissionsSchedulePath ? await parseEmissionsSchedule(argv.newHstEmissionsSchedulePath) : null,
  }).accounts({
    dao,
    authority: daoAcc.authority,
  }).instruction());

  const squads = Squads.endpoint(
    process.env.ANCHOR_PROVIDER_URL,
    provider.wallet
  );
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

run()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .then(() => process.exit());

import { AccountFetchCache } from "@helium-foundation/spl-utils";
import * as anchor from "@project-serum/anchor";
import { SOLANA_URL } from "./env";

anchor.setProvider(anchor.AnchorProvider.local(SOLANA_URL));

export const provider = anchor.getProvider() as anchor.AnchorProvider;
export const cache = new AccountFetchCache({
  connection: provider.connection,
  commitment: "confirmed",
  extendConnection: true,
});

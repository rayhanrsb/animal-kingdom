import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { AnimalKingdom } from "../target/types/animal_kingdom";

describe("animal-kingdom", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.AnimalKingdom as Program<AnimalKingdom>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});

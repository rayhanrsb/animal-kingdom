import { FC } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";

const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function Header() {
  return (
    <header className="header">
      <Link href="/">
        <Image
          src={"/logo.png"}
          width={82.29}
          height={100}
          alt="Animal Kingdom Logo"
        />
      </Link>

      <section className="buttons">
        <Link href="/">
          <p className="home-nav-button">Home</p>
        </Link>
        <Link href="/dao">
          <p>DAO</p>
        </Link>
        <WalletMultiButtonDynamic className="wallet-adapter-button-trigger" />
      </section>
    </header>
  );
}

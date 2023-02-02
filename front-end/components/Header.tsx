import { FC } from 'react';
import dynamic from "next/dynamic";

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false }
);

export default function Header () {
    return (
        <header className='header'>
            <WalletMultiButtonDynamic className="wallet-adapter-button-trigger" />
        </header>
    )
};
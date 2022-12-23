<<<<<<< HEAD
import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import "@solana/wallet-adapter-react-ui/styles.css";

const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const url = useMemo(() => clusterApiUrl("devnet"), []);
    const phantom = useMemo(() => new PhantomWalletAdapter(), []);

    return (
        <ConnectionProvider endpoint={url}>
            <WalletProvider wallets={[phantom]} autoConnect={true}>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    )
}

=======
import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import "@solana/wallet-adapter-react-ui/styles.css";

const WalletContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const url = useMemo(() => clusterApiUrl("devnet"), []);
    const phantom = useMemo(() => new PhantomWalletAdapter(), []);

    return (
        <ConnectionProvider endpoint={url}>
            <WalletProvider wallets={[phantom]} autoConnect={true}>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    )
}

>>>>>>> 205c421d3d8d866de5a33a3100d4134d345c9951
export default WalletContextProvider
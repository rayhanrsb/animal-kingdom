<<<<<<< HEAD
import { HStack, Spacer } from "@chakra-ui/react";
import { FC } from 'react';
import styles from "../styles/Home.module.css";
import dynamic from "next/dynamic";

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false }
);

export default function NavBar () {
    return (
        <HStack width="full" padding="4">
            <Spacer />
            <WalletMultiButtonDynamic className={styles["wallet-adapter-button-trigger"]} />
        </HStack>
    )
=======
import { HStack, Spacer } from "@chakra-ui/react";
import { FC } from 'react';
import styles from "../styles/Home.module.css";
import dynamic from "next/dynamic";

const WalletMultiButtonDynamic = dynamic(
    async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton, { ssr: false }
);

export default function NavBar () {
    return (
        <HStack width="full" padding="4">
            <Spacer />
            <WalletMultiButtonDynamic className={styles["wallet-adapter-button-trigger"]} />
        </HStack>
    )
>>>>>>> 205c421d3d8d866de5a33a3100d4134d345c9951
};
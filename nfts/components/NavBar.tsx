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
};
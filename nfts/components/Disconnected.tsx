import { FC, MouseEventHandler, useCallback } from 'react';
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { useWallet } from "@solana/wallet-adapter-react"
import { Button, Container, Heading, HStack, Text, VStack }  from '@chakra-ui/react';
import { ArrowForwardIcon } from '@chakra-ui/icons';

export default function Disconnected () {

    const modalState = useWalletModal()
    const { wallet, connect } = useWallet()


    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        (event) => {
            if (event.defaultPrevented) {
                return
            };
            if (!wallet) {
                modalState.setVisible(true);
            } else {
                connect().catch(() => {});
            };
        }, [wallet, connect, modalState]
    );


    return (
        <Container>
            <VStack spacing={20}>
                <Heading color="white" as="h1" size="2xl" noOfLines={4} textAlign="center">Mint Animal Kingdom NFTs. Protect nature. Earn&nbsp;$ALKM.</Heading>
                <Button bgColor="accent" color="white" maxW="380px" onClick={handleClick}>
                    <HStack>
                        <Text>become an animal kingdom protector</Text>
                        <ArrowForwardIcon />
                    </HStack>
                </Button>
            </VStack>
        </Container>
    )
}
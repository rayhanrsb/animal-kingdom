import { FC, MouseEventHandler, useCallback, useEffect, useMemo, useState } from 'react';
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Metaplex, walletAdapterIdentity, CandyMachineV2 } from "@metaplex-foundation/js";
import { useRouter } from "next/router";
import { Button, Container, Heading, HStack, Text, VStack, Image } from '@chakra-ui/react';
import { ArrowForwardIcon } from '@chakra-ui/icons';

const Connected: FC = () => {
    const { connection } = useConnection();
    const walletAdapter = useWallet();
    const [candyMachine, setCandyMachine] = useState<CandyMachineV2>();
    const [isMinting, setIsMinting] = useState(false);

    const metaplex = useMemo(() => {
        return Metaplex.make(connection).use(walletAdapterIdentity(walletAdapter))
    }, [connection, walletAdapter]);

    useEffect(() => {
    if (!metaplex) return

    metaplex
        .candyMachinesV2()
        .findByAddress({
        address: new PublicKey("4hqoKaA1LPd2Fm5RaAgZhCiXb3AuCigCiduziQ33yALy"),
        })
        .then((candyMachine) => {
        console.log(candyMachine)
        setCandyMachine(candyMachine)
        })
        .catch((error) => {
        alert(error)
        })
    }, [metaplex]);
    
    const router = useRouter();

    const handleClick: MouseEventHandler<HTMLButtonElement> = useCallback(
        async (event) => {
          if (event.defaultPrevented) return
    
          if (!walletAdapter.connected || !candyMachine) {
            return
          }
    
          try {
            setIsMinting(true)
            const nft = await metaplex.candyMachinesV2().mint({ candyMachine });
    
            console.log(nft);
            router.push(`/newMint?mint=${nft.nft.address.toBase58()}`);
          } catch (error) {
            alert(error);
          } finally {
            setIsMinting(false);
          }
        },
        [metaplex, walletAdapter, candyMachine]
      )

    return (
        <VStack spacing={20}>
            <Container>
                <VStack spacing={8}>
                    <Heading color="white" lineHeight="initial" height="fit-content" as="h1" size="2xl" noOfLines={2} textAlign="center">Welcome to the Animal Kingdom</Heading>
                    <Text color="bodyText" fontSize="medium" textAlign="center">
                        Each Animal Kingdom NFT represents a specific real world habitat, animal community or animal. 
                        Mint an Animal Kingdom NFT to enable people to fund the protection and preservation of that habitat or species. 
                        NFTs can be staked to earn <Text as="b">$ALKM</Text>. Use <Text as="b">$ALKM</Text> to upgrade NFTs and provide ongoing 
                        support and protection to the habitat or species.
                    </Text>
                </VStack>
            </Container>

            <HStack spacing={10}>
                <Image src="tiger.png" w="200px" alt="Tiger NFT" />
                <Image src="lion.png" w="200px" alt="Lion NFT" />
                <Image src="monkey.png" w="200px" alt="Monkey NFT" />
                <Image src="ocean.png" w="200px" alt="Ocean NFT" />
                <Image src="forest.png" w="200px" alt="Forest NFT" />
            </HStack>

            <Button bgColor="accent" color="white" maxW="380px" onClick={handleClick} isLoading={isMinting}>
                <HStack>
                    <Text>mint NFT</Text>
                    <ArrowForwardIcon />
                </HStack>
            </Button>
        </VStack>
    )
}

export default Connected;
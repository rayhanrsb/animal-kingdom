import { FC, ReactNode } from "react"
import Head from "next/head"
import styles from "../styles/Home.module.css"
import { Box, Center, Spacer, Stack } from "@chakra-ui/react"
import NavBar from "../components/NavBar"
import { useWallet } from "@solana/wallet-adapter-react"

const MainLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const { connected } = useWallet()

  return (
    <div className={styles.container}>
      <Head>
        <title>Animal Kingdom</title>
        <meta name="description" content="Support and protect nature with NFTs" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <Box w="full" minH="calc(100vh)" bgImage={connected ? "" : "url(/background.svg)"} backgroundPosition="center">
            <Stack w="full" minH="calc(100vh)" justify="center">
                <NavBar />
                <Spacer />

                <Center>{children}</Center>

                <Spacer />

                <Center>
                    <Box marginBottom="4" color="white">
                        <a href='https://www.linkedin.com/in/rayhan-beebeejaun' target="_blank" rel="noopener noreferrer">
                        Built by Rayhan Beebeejaun
                        </a>
                    </Box>
                    </Center>
                </Stack>
            </Box>
      </main>
    </div>
  )
}

export default MainLayout;
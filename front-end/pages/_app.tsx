import "@/styles/styles.css";
import type { AppProps } from "next/app";
import { Red_Hat_Display } from "@next/font/google";
import WalletContextProvider from "@/components/WalletContextProvider";

const RHD = Red_Hat_Display({ subsets: ["latin"] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main className={RHD.className}>
      <WalletContextProvider>
        <Component {...pageProps} />
      </WalletContextProvider>
    </main>
  );
}

import "@/styles/styles.css";
import type { AppProps } from "next/app";
import { Red_Hat_Display } from "@next/font/google";
import WalletContextProvider from "@/components/WalletContextProvider";
import { WorkspaceProvider } from "@/components/WorkspaceProvider";

const RHD = Red_Hat_Display({ subsets: ["latin"] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <main className={RHD.className}>
      <WalletContextProvider>
        <WorkspaceProvider>
          <Component {...pageProps} />
        </WorkspaceProvider>
      </WalletContextProvider>
    </main>
  );
}

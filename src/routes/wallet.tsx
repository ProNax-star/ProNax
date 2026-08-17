import { createFileRoute } from "@tanstack/react-router";
import WalletPage from "@/features/pages/WalletPage";

export const Route = createFileRoute("/wallet")({
  head: () => ({
    meta: [
      { title: "Wallet — ProNax" },
      { name: "description", content: "Track your ProNax earnings, payouts and transactions." },
      { property: "og:title", content: "Wallet — ProNax" },
      { property: "og:description", content: "Track your ProNax earnings, payouts and transactions." },
    ],
  }),
  component: WalletPage,
});

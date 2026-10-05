import Link from "next/link";

export const metadata = {
  title: "Terms of Service | sow.fun",
  description: "The terms that govern your use of sow.fun.",
};

const SECTIONS: { title: string; body: (string | React.ReactNode)[] }[] = [
  {
    title: "1. Acceptance of these terms",
    body: [
      "These Terms of Service (the \"Terms\") govern your access to and use of the website sow.fun and the services available through it (together, the \"Service\"), operated by SOW FUN LLC, a New Mexico limited liability company (\"sow.fun\", \"we\", \"us\"). By accessing or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.",
    ],
  },
  {
    title: "2. What the Service is",
    body: [
      "sow.fun is a non-custodial interface for launching and viewing tokens on the Solana blockchain using Meteora's Dynamic Bonding Curve program. Each token launched through the Service carries an on-chain trading fee configuration that allocates a fixed share of fees to the token's creator, a share pledged toward a microloan for a borrower listed on Kiva.org, and a share for operations. This configuration is set at launch and cannot be modified afterward by anyone, including us.",
      "The Service also publishes an impact ledger documenting how pledged fees are converted and deployed as Kiva loans, including transaction references for each step.",
    ],
  },
  {
    title: "3. Eligibility",
    body: [
      "You must be at least 18 years old and legally capable of entering into these Terms. You may not use the Service if you are located in, or a resident of, any jurisdiction where use of the Service would be unlawful, or if you are subject to economic sanctions or listed on any government list of prohibited or restricted parties. You are solely responsible for compliance with the laws that apply to you.",
    ],
  },
  {
    title: "4. Non-custodial service; your wallet",
    body: [
      "We never take custody of your funds, tokens, or private keys. All transactions are initiated and signed by you through your own wallet software and executed by public blockchain programs we do not control. Creator fee shares are claimable by creators directly from the relevant on-chain pool; the Service never holds them. You are solely responsible for securing your wallet and private keys. Transactions on Solana are irreversible; we cannot reverse, cancel, or refund them.",
    ],
  },
  {
    title: "5. The impact pledge",
    body: [
      "A fixed share of each token's trading fees accrues to a publicly identified vault and is periodically claimed, converted to fiat currency, and lent to borrowers on Kiva.org through our public lender account. Kiva does not accept cryptocurrency for loans, so this process necessarily crosses a fiat bridge; we document each step with receipts in the public ledger.",
      "If a pledged borrower's loan is fully funded or expires before fees are deployed, pledged amounts roll to a successor borrower under the policy published on the Service. Kiva loans are loans, not donations: they are typically repaid over time and recycled into further loans, they are not tax-deductible, and they may not be withdrawn by us or by token creators or holders for personal use once deployed.",
      "sow.fun is not affiliated with, endorsed by, or sponsored by Kiva Microfunds. Borrower information displayed on the Service is sourced from Kiva's public API and belongs to its respective owners. The success, repayment, or outcome of any loan is outside our control and is not guaranteed.",
    ],
  },
  {
    title: "6. No investment advice; no offer of securities",
    body: [
      "Tokens launched through the Service are memecoins created by their respective creators for cultural and charitable-pledge purposes. Nothing on the Service is an offer, solicitation, or recommendation to buy or sell any token or other financial instrument, and nothing on the Service is investment, legal, accounting, or tax advice. We make no representation that any token will maintain any value, and you should expect that tokens may lose all value. Do not use funds you cannot afford to lose.",
    ],
  },
  {
    title: "7. Risks you accept",
    body: [
      "Using blockchain systems involves significant risk, including: extreme price volatility and total loss of value; bugs or exploits in smart contracts and wallet software (including third-party programs such as Meteora's, which we do not control); network congestion or failure; loss of private keys; regulatory uncertainty; and reliance on third-party services (including Kiva, RPC providers, and exchanges) that may change or become unavailable. You accept these risks in full when you use the Service.",
    ],
  },
  {
    title: "8. Prohibited conduct",
    body: [
      "You agree not to: use the Service for any unlawful purpose, including money laundering, terrorist financing, or sanctions evasion; engage in market manipulation, including wash trading intended to farm creator rewards; launch tokens whose names, imagery, or metadata infringe third-party rights, impersonate others, or are unlawful; interfere with or disrupt the Service; or attempt to circumvent any technical limitation of the Service.",
      "Creator rewards are calculated against verified funded loans rather than raw volume specifically to make wash trading uneconomic; we reserve the right to exclude from reward eligibility any activity we reasonably determine to be manipulative.",
    ],
  },
  {
    title: "9. Intellectual property",
    body: [
      "The Service's design, text, illustrations, and branding are owned by SOW FUN LLC. Token creators retain responsibility for the content they submit at launch and represent that they have the rights to use it. Borrower photographs and stories are sourced from Kiva's public API and remain subject to Kiva's terms.",
    ],
  },
  {
    title: "10. Disclaimers",
    body: [
      "THE SERVICE IS PROVIDED \"AS IS\" AND \"AS AVAILABLE\" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE, OR THAT ANY ON-CHAIN PROGRAM WILL FUNCTION AS INTENDED.",
    ],
  },
  {
    title: "11. Limitation of liability",
    body: [
      "TO THE MAXIMUM EXTENT PERMITTED BY LAW, SOW FUN LLC AND ITS MEMBERS, OFFICERS, AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, OR FOR ANY LOSS OF PROFITS, TOKENS, OR DATA, ARISING FROM OR RELATING TO YOUR USE OF THE SERVICE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE WILL NOT EXCEED ONE HUNDRED U.S. DOLLARS (US$100).",
    ],
  },
  {
    title: "12. Indemnification",
    body: [
      "You agree to indemnify and hold harmless SOW FUN LLC from any claims, damages, losses, and expenses (including reasonable attorneys' fees) arising from your use of the Service, your violation of these Terms, or your violation of any law or third-party right.",
    ],
  },
  {
    title: "13. Changes to the Service and these Terms",
    body: [
      "We may modify or discontinue the Service at any time. We may update these Terms by posting a revised version with a new effective date; continued use of the Service after changes take effect constitutes acceptance. On-chain fee configurations of already-launched tokens are immutable and are unaffected by any change to these Terms.",
    ],
  },
  {
    title: "14. Governing law",
    body: [
      "These Terms are governed by the laws of the State of New Mexico, United States, without regard to conflict-of-laws principles. Any dispute arising from these Terms or the Service will be resolved in the state or federal courts located in New Mexico, and you consent to their jurisdiction.",
    ],
  },
  {
    title: "15. Contact",
    body: [
      "SOW FUN LLC - questions about these Terms: contact@sow.fun, or @sowfunhq on X.",
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* HERO */}
      <div className="bg-[#223829] text-[#EDF4F1] pt-12 pb-10 px-6 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
          <h1 className="font-serif text-4xl md:text-5xl font-medium tracking-tight leading-[1.1]">Terms of Service</h1>
          <p className="opacity-70 text-sm">Effective date: September 30, 2026</p>
        </div>
      </div>

      <div className="max-w-[820px] mx-auto px-6 py-14">
        <div className="bg-[#FBF6EA]/80 border border-[#F8CD69]/30 rounded-2xl p-5 text-sm text-[#223829]/80 leading-relaxed mb-10">
          The short version: sow.fun is a non-custodial launchpad. We never hold your funds,
          token fee splits are locked on-chain at launch, 45% of every trade is pledged to real
          Kiva microloans with public receipts, and memecoins are risky - never trade more than
          you can afford to lose. The legally binding version follows.
        </div>

        <div className="flex flex-col gap-8">
          {SECTIONS.map(({ title, body }) => (
            <section key={title}>
              <h2 className="text-lg font-extrabold text-[#223829] mb-2.5">{title}</h2>
              {body.map((p, i) => (
                <p key={i} className="text-[15px] text-gray-600 leading-relaxed mb-2.5">{p}</p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/" className="text-sm font-bold text-[#276A43] hover:underline">← Back to sow.fun</Link>
        </div>
      </div>
    </div>
  );
}

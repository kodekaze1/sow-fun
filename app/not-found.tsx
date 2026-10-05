import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-20 bg-white">
      <div className="max-w-md text-center">
        <img src="/images/illustrations/plant-coin.png" alt="" aria-hidden="true"
          className="w-28 mx-auto mb-6 rotate-[-3deg] mix-blend-multiply" />
        <div className="text-xs font-black uppercase tracking-widest text-[#276A43] mb-2.5">404</div>
        <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-[#223829] mb-3">
          Nothing sown here yet.
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8">
          This page doesn&apos;t exist. If you followed a token link, the coin may not be listed - check the launches board.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="bg-[#276A43] hover:bg-[#223829] text-white rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
            Back home
          </Link>
          <Link href="/launch" className="border border-[#D9E6DF] hover:border-[#276A43] rounded-full px-6 py-2.5 text-sm font-bold transition-colors">
            Launch a coin
          </Link>
          <Link href="/launches" className="text-sm font-bold text-[#276A43] hover:underline px-2 py-2.5">
            All launches
          </Link>
        </div>
      </div>
    </div>
  );
}

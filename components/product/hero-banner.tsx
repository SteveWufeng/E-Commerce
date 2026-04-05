import Link from "next/link";

/**
 * Hero banner for the storefront homepage.
 *
 * Displays a promotional message with a CTA.
 * Designed to be eye-catching on all screen sizes.
 */
export function HeroBanner() {
  return (
    <section className="bg-gradient-to-r from-primary-600 to-primary-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
            Fresh Products,
            <br />
            <span className="text-primary-200">Ready for Pickup</span>
          </h1>
          <p className="mt-4 text-lg text-primary-100 max-w-lg">
            Browse our selection, order online, and pick up at your convenience.
            No shipping fees, no waiting.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/#products" className="bg-white text-primary-700 font-semibold px-6 py-3 rounded-lg hover:bg-primary-50 transition-colors shadow-sm">
              Shop Now
            </Link>
            <Link href="/pickup" className="border border-white/30 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors">
              Schedule Pickup
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

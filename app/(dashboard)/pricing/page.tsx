import { getUser } from '@/lib/db/queries';
import { PricingCards } from './pricing-cards';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const user = await getUser();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
          Planes y Precios
        </h1>
        <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
          La solución definitiva para la administración financiera y operativa de tu centro médico.
        </p>
      </div>
      <PricingCards isLoggedIn={!!user} />
    </main>
  );
}

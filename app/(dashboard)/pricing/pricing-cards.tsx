'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type PlanData = {
    id: number;
    slug: string;
    name: string;
    mpPlanId: string;
    price: string;
    isActive: boolean;
};

// Map static features and descriptions to each slug pattern
const planDetailsMap: Record<string, { description: string, features: string[] }> = {
    inicial: {
        description: 'El Autónomo / Consultorio Chico',
        features: [
            '1 Doctor. Limitado a 1 Asistente.',
            'Dashboard general de turnos (vista lista/calendario)',
            'Reportes: Estadísticas básicas',
        ]
    },
    especialista: {
        description: 'La Clínica en Crecimiento',
        features: [
            'Hasta 5 Doctores. Múltiples asistentes.',
            'Dashboards individuales por doctor',
            'Reportes Pro: Análisis de ausentismo',
        ]
    },
    institucional: {
        description: 'Gestión Integral y Billetera',
        features: [
            'Doctores y Asistentes Ilimitados',
            'Auditoría: Log de cambios en turnos',
            'Sección Billetera: Auditoría de Mercado Pago',
            'Integración de Webhooks externos',
        ]
    }
};

export function PricingCards({ isLoggedIn }: { isLoggedIn: boolean }) {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PlanData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { data: dbPlans, isLoading: isFetchingPlans } = useSWR<PlanData[]>('/api/plans', fetcher);

    const handleSelectPlan = (plan: PlanData) => {
        if (!isLoggedIn) {
            router.push(`/sign-up?planSlug=${plan.slug}`);
            return;
        }
        setSelectedPlan(plan);
        setIsModalOpen(true);
    };

    const handleSubscribe = async () => {
        if (!selectedPlan) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch('/api/membership/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planSlug: selectedPlan.slug,
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to subscribe');
            }

            if (data.init_point) {
                window.location.href = data.init_point;
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    if (isFetchingPlans) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-primary size-8" />
            </div>
        )
    }

    if (!dbPlans || dbPlans.length === 0) {
        return <div className="text-center text-muted-foreground">No active plans available at the moment.</div>;
    }

    return (
        <>
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {dbPlans.map((plan) => {
                    const details = planDetailsMap[plan.slug] || { description: '', features: [] };

                    return (
                        <div key={plan.id} className="pt-6 border rounded-lg p-6 shadow-sm bg-white flex flex-col">
                            <h2 className="text-2xl font-medium text-gray-900 mb-2">{plan.name}</h2>
                            <p className="text-sm text-gray-600 mb-4 h-10">{details.description}</p>
                            <p className="text-4xl font-medium text-gray-900 mb-6">
                                ${parseFloat(plan.price).toLocaleString('es-AR')}{' '}
                                <span className="text-xl font-normal text-gray-600">
                                    / mes
                                </span>
                            </p>
                            <ul className="space-y-4 mb-8 flex-1">
                                {details.features.map((feature, index) => (
                                    <li key={index} className="flex items-start">
                                        <Check className="h-5 w-5 text-orange-500 mr-2 mt-0.5 flex-shrink-0" />
                                        <span className="text-gray-700">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button
                                onClick={() => handleSelectPlan(plan)}
                                className="w-full bg-primary text-white hover:bg-primary/90"
                            >
                                Seleccionar Plan
                            </Button>
                        </div>
                    );
                })}
            </div>

            {isModalOpen && selectedPlan && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-xl font-semibold mb-2">Confirmar Suscripción</h3>
                        <p className="text-gray-600 mb-4">
                            Estás por suscribirte al plan <strong>{selectedPlan.name}</strong> por ${parseFloat(selectedPlan.price).toLocaleString('es-AR')} / mes.
                        </p>
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
                                {error}
                            </div>
                        )}
                        <div className="flex gap-4 justify-end">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={loading}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSubscribe} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Pagar con Mercado Pago
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

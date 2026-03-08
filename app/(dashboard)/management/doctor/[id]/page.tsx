'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ArrowLeft, Save, Loader2, Calendar, Wallet, Stethoscope,
    Link2, Link2Off, Plus, X, CheckCircle2, AlertCircle, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { useCurrentDepartment } from '@/components/providers/department-provider';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DoctorProfilePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { currentDepartmentId } = useCurrentDepartment();
    const doctorId = params.id as string;

    // Fetch doctor data
    const { data: doctorData, isLoading, mutate } = useSWR(`/api/doctors/${doctorId}`, fetcher);
    // Fetch available services for the department 
    const { data: servicesData } = useSWR(
        `/api/services?dep=${currentDepartmentId ?? 'cookie'}`,
        fetcher
    );

    const doctor = doctorData?.data;
    const availableServices: any[] = servicesData?.data ?? [];

    // Form state
    const [name, setName] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Services state
    const [addingService, setAddingService] = useState(false);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [removingServiceId, setRemovingServiceId] = useState<number | null>(null);

    // Calendar state
    const [unlinkingCalendar, setUnlinkingCalendar] = useState(false);

    // Hydrate from DB
    useEffect(() => {
        if (doctor) {
            setName(doctor.name ?? '');
            setSpecialty(doctor.specialty ?? '');
            setIsActive(doctor.isActive ?? true);
        }
    }, [doctor]);

    // Show toast based on OAuth callback result
    useEffect(() => {
        const calendarParam = searchParams.get('calendar');
        if (calendarParam === 'connected') {
            toast.success('Google Calendar vinculado correctamente');
            mutate();
        } else if (calendarParam === 'error') {
            toast.error('Error al vincular Google Calendar', { description: 'El flujo fue cancelado o ocurrió un error.' });
        } else if (calendarParam === 'no_refresh_token') {
            toast.error('Sin refresh token', { description: 'Revocá el acceso desde tu cuenta Google y volvé a intentarlo.' });
        }
    }, [searchParams]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/doctors/${doctorId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, specialty: specialty || null, isActive })
            });
            const json = await res.json();
            if (json.success) {
                toast.success('Cambios guardados');
                mutate();
            } else {
                toast.error('Error al guardar', { description: json.error });
            }
        } catch {
            toast.error('Error de red');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnlinkCalendar = async () => {
        setUnlinkingCalendar(true);
        try {
            const res = await fetch(`/api/doctors/${doctorId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ calendarStatus: 'disconnected', googleCalendarId: null })
            });
            const json = await res.json();
            if (json.success) {
                toast.success('Google Calendar desvinculado');
                mutate();
            } else {
                toast.error('Error al desvincular', { description: json.error });
            }
        } catch {
            toast.error('Error de red');
        } finally {
            setUnlinkingCalendar(false);
        }
    };

    const handleAddService = async () => {
        if (!selectedServiceId) return;
        setAddingService(true);
        try {
            const res = await fetch(`/api/doctors/${doctorId}/services`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serviceId: parseInt(selectedServiceId, 10) })
            });
            const json = await res.json();
            if (json.success) {
                toast.success('Prestación agregada');
                setSelectedServiceId('');
                mutate();
            } else {
                toast.error('Error', { description: json.error });
            }
        } catch {
            toast.error('Error de red');
        } finally {
            setAddingService(false);
        }
    };

    const handleRemoveService = async (serviceId: number) => {
        setRemovingServiceId(serviceId);
        try {
            const res = await fetch(`/api/doctors/${doctorId}/services/${serviceId}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                toast.success('Prestación removida');
                mutate();
            } else {
                toast.error('Error', { description: json.error });
            }
        } catch {
            toast.error('Error de red');
        } finally {
            setRemovingServiceId(null);
        }
    };

    const assignedServiceIds = new Set((doctor?.services ?? []).map((s: any) => s.id));
    const unassignedServices = availableServices.filter(s => !assignedServiceIds.has(s.id) && s.isActive);

    const calendarConnected = doctor?.calendarStatus === 'connected';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
            </div>
        );
    }

    if (!doctor) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                <AlertCircle className="w-10 h-10 opacity-40" />
                <p className="text-sm">Profesional no encontrado o sin acceso.</p>
                <Button variant="ghost" size="sm" onClick={() => router.push('/management')}>
                    <ArrowLeft className="w-4 h-4 mr-1" /> Volver
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push('/management')} className="shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{doctor.name}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {doctor.specialty ?? 'Sin especialidad'} ·{' '}
                        <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs ml-1">
                            {isActive ? 'Activo' : 'Pausado'}
                        </Badge>
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
                {/* Left: Info + Calendar + MP */}
                <div className="md:col-span-5 flex flex-col gap-6">
                    {/* Información Profesional */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Stethoscope className="w-4 h-4 text-primary" />
                                Información Profesional
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nombre completo</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Dr. Juan Pérez" />
                            </div>
                            <div className="space-y-2">
                                <Label>Especialidad</Label>
                                <Input value={specialty} onChange={e => setSpecialty(e.target.value)} placeholder="Cardiología" />
                            </div>
                            <div className="flex items-center gap-3 pt-1">
                                <Switch id="doctor-active" checked={isActive} onCheckedChange={setIsActive} />
                                <Label htmlFor="doctor-active" className="cursor-pointer text-sm">
                                    {isActive ? 'Profesional activo' : 'Profesional pausado'}
                                </Label>
                            </div>
                        </CardContent>
                        <Separator />
                        <CardFooter className="py-4 justify-end">
                            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Guardar Cambios
                            </Button>
                        </CardFooter>
                    </Card>

                    {/* Google Calendar */}
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                Google Calendar
                            </CardTitle>
                            <CardDescription>Sincronización de disponibilidad y creación de eventos al agendar un turno.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {calendarConnected ? (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-emerald-800">Calendario vinculado</p>
                                            <p className="text-xs text-emerald-700 mt-0.5 font-mono break-all">{doctor.googleCalendarId}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="w-full gap-2 text-destructive hover:text-destructive"
                                        onClick={handleUnlinkCalendar}
                                        disabled={unlinkingCalendar}
                                    >
                                        {unlinkingCalendar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2Off className="w-4 h-4" />}
                                        Desvincular Calendario
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 p-3 bg-muted/50 border rounded-md text-muted-foreground">
                                        <Calendar className="w-5 h-5 shrink-0 mt-0.5 opacity-50" />
                                        <p className="text-sm">No hay ningún calendario vinculado. Vinculalo para que el bot revise disponibilidad en tiempo real.</p>
                                    </div>
                                    <Button
                                        className="w-full gap-2"
                                        onClick={() => window.location.href = `/api/auth/google/initiate/${doctorId}`}
                                    >
                                        <Link2 className="w-4 h-4" />
                                        Vincular Google Calendar
                                        <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-60" />
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Mercado Pago */}
                    <Card className="shadow-sm opacity-70">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Wallet className="w-4 h-4 text-sky-500" />
                                Mercado Pago
                                <Badge variant="secondary" className="text-xs ml-auto">Próximamente</Badge>
                            </CardTitle>
                            <CardDescription>Configuración de cobros y señas por WhatsApp para este profesional.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-20 flex items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
                                Integración en desarrollo
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Prestaciones */}
                <div className="md:col-span-7">
                    <Card className="shadow-sm h-full">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Stethoscope className="w-4 h-4 text-primary" />
                                Prestaciones Asignadas
                            </CardTitle>
                            <CardDescription>Servicios que este profesional puede ofrecer para agendarse.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Add service */}
                            <div className="flex gap-2">
                                <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                                    <SelectTrigger className="flex-1">
                                        <SelectValue placeholder={unassignedServices.length === 0 ? 'Sin prestaciones disponibles' : 'Seleccionar prestación...'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {unassignedServices.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    onClick={handleAddService}
                                    disabled={!selectedServiceId || addingService}
                                    className="gap-1 shrink-0"
                                >
                                    {addingService ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Agregar
                                </Button>
                            </div>

                            <Separator />

                            {/* Assigned services list */}
                            {(doctor.services ?? []).length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                                    <Stethoscope className="w-7 h-7 opacity-25" />
                                    <p className="text-sm">Sin prestaciones asignadas aún.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {(doctor.services ?? []).map((svc: any) => (
                                        <div
                                            key={svc.id}
                                            className="flex items-center justify-between p-3 rounded-md border bg-muted/30 hover:bg-muted/60 transition-colors"
                                        >
                                            <div>
                                                <p className="text-sm font-medium">{svc.name}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {svc.durationMinutes ?? '—'} min · ${Number(svc.price).toLocaleString('es-AR')}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveService(svc.id)}
                                                disabled={removingServiceId === svc.id}
                                            >
                                                {removingServiceId === svc.id
                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    : <X className="w-3.5 h-3.5" />
                                                }
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Stethoscope, Plus, Edit2, Loader2, AlertCircle, RefreshCcw } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from 'swr';
import { useCurrentDepartment } from "@/components/providers/department-provider";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ManagementPage() {
    const router = useRouter();
    const { currentDepartmentId } = useCurrentDepartment();

    const { data: doctorsData, isLoading: loadingDoctors, mutate: mutateDoctors } = useSWR(
        `/api/doctors?dep=${currentDepartmentId ?? 'cookie'}`,
        fetcher
    );
    const { data: servicesData, isLoading: loadingServices } = useSWR(
        `/api/services?dep=${currentDepartmentId ?? 'cookie'}`,
        fetcher
    );

    const doctors: any[] = doctorsData?.data ?? [];
    const services: any[] = servicesData?.data ?? [];

    // New Doctor Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newSpecialty, setNewSpecialty] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreateDoctor = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        try {
            const res = await fetch('/api/doctors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim(), specialty: newSpecialty.trim() || null })
            });
            const json = await res.json();
            if (json.success) {
                toast.success('Profesional creado');
                setDialogOpen(false);
                setNewName('');
                setNewSpecialty('');
                mutateDoctors();
            } else {
                toast.error('Error al crear', { description: json.error });
            }
        } catch {
            toast.error('Error de red');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gestión Médica</h1>
                    <p className="text-sm text-muted-foreground mt-1">Administración de profesionales y prestaciones del área activa.</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 shrink-0">
                            <Plus className="h-4 w-4" /> Nuevo Profesional
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Agregar Profesional</DialogTitle>
                            <DialogDescription>Se creará en el área activa del contexto actual.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>Nombre completo *</Label>
                                <Input placeholder="Dr. Juan Pérez" value={newName} onChange={e => setNewName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Especialidad</Label>
                                <Input placeholder="Cardiología" value={newSpecialty} onChange={e => setNewSpecialty(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCreateDoctor} disabled={creating || !newName.trim()}>
                                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                Crear Profesional
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {!currentDepartmentId && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Seleccioná un área en el selector superior para ver sus profesionales.
                </div>
            )}

            <Tabs defaultValue="doctors" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[300px]">
                    <TabsTrigger value="doctors">Profesionales</TabsTrigger>
                    <TabsTrigger value="services">Prestaciones</TabsTrigger>
                </TabsList>

                {/* Doctores Tab */}
                <TabsContent value="doctors" className="mt-6 space-y-4">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Directorio de Profesionales</CardTitle>
                            <CardDescription>Médicos habilitados para recibir turnos a través del bot.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingDoctors ? (
                                <div className="flex items-center justify-center h-32">
                                    <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
                                </div>
                            ) : doctors.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                                    <Stethoscope className="w-8 h-8 opacity-30" />
                                    <p className="text-sm">Sin profesionales en este área. Agregá el primero.</p>
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Profesional</TableHead>
                                                <TableHead>Especialidad</TableHead>
                                                <TableHead className="text-center">Servicios</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead className="text-right">Acciones</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {doctors.map((doc: any) => (
                                                <TableRow
                                                    key={doc.id}
                                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                                    onClick={() => router.push(`/management/doctor/${doc.id}`)}
                                                >
                                                    <TableCell className="font-medium">{doc.name}</TableCell>
                                                    <TableCell>
                                                        {doc.specialty
                                                            ? <Badge variant="outline">{doc.specialty}</Badge>
                                                            : <span className="text-xs text-muted-foreground">—</span>
                                                        }
                                                    </TableCell>
                                                    <TableCell className="text-center text-muted-foreground">
                                                        {doc.services?.length ?? 0}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={doc.isActive ? 'default' : 'secondary'} className="text-xs">
                                                            {doc.isActive ? 'Activo' : 'Pausado'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => router.push(`/management/doctor/${doc.id}`)}
                                                        >
                                                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Servicios Tab */}
                <TabsContent value="services" className="mt-6 space-y-4">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Catálogo de Prestaciones</CardTitle>
                            <CardDescription>Servicios médicos que la IA puede ofrecer para reservar.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingServices ? (
                                <div className="flex items-center justify-center h-32">
                                    <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
                                </div>
                            ) : services.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
                                    <p className="text-sm">Sin prestaciones en este área.</p>
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Prestación</TableHead>
                                                <TableHead>Duración</TableHead>
                                                <TableHead>Valor</TableHead>
                                                <TableHead>Estado</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {services.map((svc: any) => (
                                                <TableRow key={svc.id}>
                                                    <TableCell className="font-medium">{svc.name}</TableCell>
                                                    <TableCell className="text-muted-foreground">{svc.durationMinutes ?? '—'} min</TableCell>
                                                    <TableCell className="font-medium">${Number(svc.price).toLocaleString('es-AR')}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={svc.isActive ? 'default' : 'secondary'} className="text-xs">
                                                            {svc.isActive ? 'Activo' : 'Inactivo'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

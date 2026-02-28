'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, CheckCircle2, AlertCircle, Plus, Wallet, Link as LinkIcon, Edit2, Trash2 } from "lucide-react";

const mockDoctors = [
    { id: 1, name: "Dr. Fernando Navarro", specialty: "Cardiología", email: "f.navarro@clinica.com", status: "active", servicesCount: 3 },
    { id: 2, name: "Dra. Laura Gomez", specialty: "Pediatría", email: "l.gomez@clinica.com", status: "active", servicesCount: 2 },
    { id: 3, name: "Dr. Carlos Ruiz", specialty: "Dermatología", email: "c.ruiz@clinica.com", status: "inactive", servicesCount: 1 },
];

const mockServices = [
    { id: 1, name: "Consulta Cardiológica Primera Vez", duration: "30 min", price: 25000, doctors: 1 },
    { id: 2, name: "Control Pediátrico Mensual", duration: "20 min", price: 15000, doctors: 1 },
    { id: 3, name: "Electrocardiograma", duration: "15 min", price: 10000, doctors: 1 },
    { id: 4, name: "Consulta Dermatológica General", duration: "20 min", price: 18000, doctors: 1 },
];

export default function ManagementPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gestión Médica</h1>
                    <p className="text-sm text-muted-foreground mt-1">Administración de profesionales, prestaciones e integraciones de pago.</p>
                </div>
                <Button className="gap-2 shrink-0">
                    <Plus className="h-4 w-4" /> Nuevo Profesional
                </Button>
            </div>

            <Tabs defaultValue="doctors" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[400px]">
                    <TabsTrigger value="doctors">Profesionales</TabsTrigger>
                    <TabsTrigger value="services">Prestaciones</TabsTrigger>
                    <TabsTrigger value="integrations">Integraciones</TabsTrigger>
                </TabsList>

                {/* Doctores Tab */}
                <TabsContent value="doctors" className="mt-6 space-y-4">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle>Directorio de Profesionales</CardTitle>
                            <CardDescription>
                                Médicos habilitados para recibir turnos a través del bot.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Profesional</TableHead>
                                            <TableHead>Especialidad</TableHead>
                                            <TableHead className="text-center">Servicios Asignados</TableHead>
                                            <TableHead>Estado</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mockDoctors.map((doc) => (
                                            <TableRow key={doc.id}>
                                                <TableCell className="font-medium">
                                                    {doc.name}
                                                    <div className="text-xs text-muted-foreground font-normal">{doc.email}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{doc.specialty}</Badge>
                                                </TableCell>
                                                <TableCell className="text-center text-muted-foreground">
                                                    {doc.servicesCount}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center space-x-2">
                                                        <Switch checked={doc.status === 'active'} />
                                                        <span className="text-xs text-muted-foreground">
                                                            {doc.status === 'active' ? 'Activado' : 'Pausado'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Servicios Tab */}
                <TabsContent value="services" className="mt-6 space-y-4">
                    <Card className="shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Catálogo de Prestaciones</CardTitle>
                                <CardDescription>Servicios médicos que la IA puede ofrecer para reservar.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Plus className="h-4 w-4" /> Nuevo Servicio
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Prestación</TableHead>
                                            <TableHead>Duración</TableHead>
                                            <TableHead>Valor Declarado</TableHead>
                                            <TableHead className="text-center">Profesionales Asignados</TableHead>
                                            <TableHead className="text-right">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {mockServices.map((service) => (
                                            <TableRow key={service.id}>
                                                <TableCell className="font-medium">{service.name}</TableCell>
                                                <TableCell className="text-muted-foreground">{service.duration}</TableCell>
                                                <TableCell className="font-medium">${service.price.toLocaleString()}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="secondary">{service.doctors}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Integraciones Tab */}
                <TabsContent value="integrations" className="mt-6 space-y-4">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="shadow-sm border-emerald-500/20">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Wallet className="w-5 h-5 text-emerald-600" />
                                    Mercado Pago
                                </CardTitle>
                                <CardDescription>Configura tus credenciales para cobrar las señas de los turnos automáticamente vía WhatsApp.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-md flex items-start gap-3 text-emerald-800">
                                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-semibold">Credenciales Validadas</p>
                                        <p className="opacity-90 mt-0.5">La conexión con Mercado Pago está funcionando correctamente.</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Access Token (Producción)</Label>
                                    <Input type="password" value="APP_USR-xxxx-xxxx-xxxx" readOnly className="bg-muted" />
                                </div>
                                <Button variant="outline" className="w-full">Cambiar Credenciales</Button>
                            </CardContent>
                        </Card>

                        <Card className="shadow-sm">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <LinkIcon className="w-5 h-5 text-zinc-600" />
                                    Google Calendar (Próximamente)
                                </CardTitle>
                                <CardDescription>Sincronización bidireccional con los calendarios personales de los médicos.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Client ID</Label>
                                    <Input disabled placeholder="Requerido para activar la sync..." />
                                </div>
                                <Button disabled variant="outline" className="w-full">Configurar Conexión</Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

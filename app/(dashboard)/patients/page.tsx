'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { useState } from "react";

const mockPatients = [
    { id: 1, name: "María González", phone: "1155443322", lastContact: "Hace 2 horas", status: "Turno Confirmado", aiInteractions: 12 },
    { id: 2, name: "Carlos López", phone: "1199887766", lastContact: "Ayer", status: "Duda Resuelta", aiInteractions: 5 },
    { id: 3, name: "Ana Martínez", phone: "1122334455", lastContact: "Hace 3 días", status: "Lead Perdido", aiInteractions: 2 },
    { id: 4, name: "Juan Pérez", phone: "2233445566", lastContact: "Hace 1 semana", status: "Turno Completado", aiInteractions: 8 },
    { id: 5, name: "+54 9 11 3322-1100", phone: "1133221100", lastContact: "Hace 5 minutos", status: "Hablando con IA", aiInteractions: 3 },
];

export default function PatientsPage() {
    const [search, setSearch] = useState("");

    const filteredPatients = mockPatients.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.phone.includes(search)
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">CRM Pacientes</h1>
                    <p className="text-sm text-muted-foreground mt-1">Directorio de contactos que interactuaron con el asistente virtual.</p>
                </div>
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Buscar por nombre o teléfono..."
                        className="pl-8 bg-background"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Directorio de WhatsApp</CardTitle>
                    <CardDescription>
                        Mostrando {filteredPatients.length} contactos indexados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Paciente</TableHead>
                                    <TableHead>WhatsApp ID</TableHead>
                                    <TableHead>Último Contacto</TableHead>
                                    <TableHead className="text-center">Mensajes con IA</TableHead>
                                    <TableHead className="text-right">Estado</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredPatients.map((patient) => (
                                    <TableRow key={patient.id} className="cursor-pointer hover:bg-muted/50">
                                        <TableCell className="font-medium whitespace-nowrap">{patient.name}</TableCell>
                                        <TableCell className="text-muted-foreground">{patient.phone}</TableCell>
                                        <TableCell className="text-sm">{patient.lastContact}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-mono">
                                                {patient.aiInteractions}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={
                                                patient.status.includes('Confirmado') || patient.status.includes('Completado') ? 'default' :
                                                    patient.status.includes('Hablando') ? 'secondary' :
                                                        patient.status.includes('Perdido') ? 'destructive' : 'outline'
                                            } className={
                                                patient.status.includes('Hablando') ? 'animate-pulse bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 border-blue-200' : ''
                                            }>
                                                {patient.status.includes('Hablando') && <Loader2 className="w-3 h-3 mr-1 inline animate-spin" />}
                                                {patient.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {filteredPatients.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No se encontraron pacientes.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

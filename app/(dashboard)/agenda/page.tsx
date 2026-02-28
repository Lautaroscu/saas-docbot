'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Plus, Phone, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";

const mockAppointments = [
    { id: 1, time: "09:00", patient: "María González", doctor: "Dr. Fernando Navarro", specialty: "Cardiología", status: "confirmed", duration: "30 min", phone: "1155443322" },
    { id: 2, time: "09:30", patient: "Carlos López", doctor: "Dr. Fernando Navarro", specialty: "Cardiología", status: "pending", duration: "30 min", phone: "1199887766" },
    { id: 3, time: "10:00", patient: "Ana Martínez", doctor: "Dra. Laura Gomez", specialty: "Pediatría", status: "canceled", duration: "20 min", phone: "1122334455" },
    { id: 4, time: "11:00", patient: "Juan Pérez", doctor: "Dr. Fernando Navarro", specialty: "Cardiología", status: "confirmed", duration: "30 min", phone: "2233445566" },
    { id: 5, time: "14:30", patient: "Lucía Fernández", doctor: "Dra. Laura Gomez", specialty: "Pediatría", status: "confirmed", duration: "20 min", phone: "1144556677" },
];

export default function AgendaPage() {
    const [date, setDate] = useState<Date | undefined>(new Date());

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
                    <p className="text-sm text-muted-foreground mt-1">Gestión de turnos centralizada de todas las agendas de tus profesionales.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select defaultValue="all">
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por Profesional" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los médicos</SelectItem>
                            <SelectItem value="fernando">Dr. Fernando Navarro</SelectItem>
                            <SelectItem value="laura">Dra. Laura Gomez</SelectItem>
                            <SelectItem value="carlos">Dr. Carlos Ruiz</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" /> Sobreturno
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-12 lg:grid-cols-10">
                {/* Calendar Sidebar */}
                <div className="md:col-span-5 lg:col-span-3 flex flex-col gap-6">
                    <Card className="shadow-sm border-none bg-muted/30">
                        <CardContent className="p-4 flex justify-center">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md"
                            />
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Métricas del Día</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Ocupación</span>
                                <span className="font-medium text-sm">85%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Turnos Confirmados</span>
                                <span className="font-medium text-sm text-emerald-600">3</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Cancelaciones</span>
                                <span className="font-medium text-sm text-destructive">1</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Day View */}
                <div className="md:col-span-7 lg:col-span-7">
                    <Card className="shadow-sm h-full flex flex-col">
                        <CardHeader className="border-b pb-4">
                            <div className="flex items-center gap-2 text-primary">
                                <CalendarIcon className="w-5 h-5" />
                                <CardTitle>
                                    {date ? new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date).replace(/^\w/, (c) => c.toUpperCase()) : 'Selecciona un día'}
                                </CardTitle>
                            </div>
                            <CardDescription>Mostrando {mockAppointments.length} turnos agendados.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 relative">
                            <ScrollArea className="h-[600px]">
                                <div className="flex flex-col">
                                    {mockAppointments.map((apt, i) => (
                                        <div key={apt.id} className={`flex items-stretch border-b last:border-0 hover:bg-muted/30 transition-colors ${i % 2 === 0 ? 'bg-muted/10' : ''}`}>
                                            {/* Time Column */}
                                            <div className="w-20 lg:w-24 shrink-0 p-4 border-r flex flex-col items-center justify-center bg-muted/5">
                                                <span className="font-semibold text-lg">{apt.time}</span>
                                                <span className="text-xs text-muted-foreground">{apt.duration}</span>
                                            </div>

                                            {/* Details Column */}
                                            <div className="flex-1 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="h-10 w-10 border">
                                                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                                            {apt.patient.split(' ').map(n => n[0]).join('')}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-semibold">{apt.patient}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal">
                                                                {apt.specialty}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground">{apt.doctor}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 sm:ml-auto">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors px-2 py-1 rounded-md hover:bg-muted">
                                                        <Phone className="w-3.5 h-3.5" />
                                                        <span className="text-xs">{apt.phone}</span>
                                                    </div>
                                                    <Badge variant={
                                                        apt.status === 'confirmed' ? 'default' :
                                                            apt.status === 'pending' ? 'secondary' : 'destructive'
                                                    } className={
                                                        apt.status === 'confirmed' ? 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-200' :
                                                            apt.status === 'pending' ? 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-200' : ''
                                                    }>
                                                        {apt.status === 'confirmed' ? 'Confirmado' :
                                                            apt.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

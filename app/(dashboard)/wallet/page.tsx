'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Wallet as WalletIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";

const mockTransactions = [
    { id: "MP-10293812", doctor: "Dr. Fernando (Cardiología)", amount: 15000, fee: 1500, net: 13500, status: "approved", date: "24 Oct, 2026 - 14:30" },
    { id: "MP-10293813", doctor: "Dra. Gomez (Pediatría)", amount: 12000, fee: 1200, net: 10800, status: "pending", date: "24 Oct, 2026 - 15:00" },
    { id: "MP-10293814", doctor: "Dr. Ruiz (Dermatología)", amount: 18000, fee: 1800, net: 16200, status: "approved", date: "24 Oct, 2026 - 16:15" },
    { id: "MP-10293815", doctor: "Dr. Fernando (Cardiología)", amount: 20000, fee: 2000, net: 18000, status: "refunded", date: "23 Oct, 2026 - 09:10" },
    { id: "MP-10293816", doctor: "Dra. Gomez (Pediatría)", amount: 12000, fee: 1200, net: 10800, status: "approved", date: "23 Oct, 2026 - 11:20" },
];

export default function WalletPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Finanzas & Billetera</h1>
                    <p className="text-sm text-muted-foreground mt-1">Gestión y auditoría de cobros por Mercado Pago.</p>
                </div>
                <Button variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Exportar Excel
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Volumen Bruto (Mes)</CardTitle>
                        <WalletIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$1,245,000</div>
                        <p className="text-xs text-emerald-500 font-medium flex items-center mt-1">
                            <ArrowUpRight className="h-3 w-3 mr-1" /> +12% vs mes anterior
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Comisiones Generadas</CardTitle>
                        <WalletIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">$124,500</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            10% fee promedio por turno
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Devoluciones</CardTitle>
                        <WalletIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">$38,000</div>
                        <p className="text-xs text-destructive/80 font-medium flex items-center mt-1">
                            <ArrowDownRight className="h-3 w-3 mr-1" /> 3 pacientes reembolsados
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Últimas Transacciones</CardTitle>
                    <CardDescription>
                        Auditoría en tiempo real de los pagos procesados por los médicos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Transacción ID</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Profesional</TableHead>
                                <TableHead>Monto Bruto</TableHead>
                                <TableHead>Comisión</TableHead>
                                <TableHead>Neto Doctor</TableHead>
                                <TableHead className="text-right">Estado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockTransactions.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell className="font-medium">{tx.id}</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">{tx.date}</TableCell>
                                    <TableCell>{tx.doctor}</TableCell>
                                    <TableCell>${tx.amount.toLocaleString()}</TableCell>
                                    <TableCell className="text-emerald-600 font-medium">${tx.fee.toLocaleString()}</TableCell>
                                    <TableCell>${tx.net.toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={
                                            tx.status === 'approved' ? 'default' :
                                                tx.status === 'pending' ? 'secondary' : 'destructive'
                                        } className={
                                            tx.status === 'approved' ? 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 border-emerald-200' :
                                                tx.status === 'pending' ? 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 border-amber-200' : ''
                                        }>
                                            {tx.status === 'approved' ? 'Aprobado' :
                                                tx.status === 'pending' ? 'Pendiente' : 'Devuelto'}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

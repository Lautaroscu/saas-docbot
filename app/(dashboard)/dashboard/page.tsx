'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, CalendarDays, DollarSign, BotMessageSquare } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const data = [
  { time: '08:00', messages: 400, turns: 240 },
  { time: '10:00', messages: 300, turns: 139 },
  { time: '12:00', messages: 200, turns: 980 },
  { time: '14:00', messages: 278, turns: 390 },
  { time: '16:00', messages: 189, turns: 480 },
  { time: '18:00', messages: 239, turns: 380 },
  { time: '20:00', messages: 349, turns: 430 },
];

const messages = [
  { id: 1, contact: 'Juan Pérez', content: 'Quería agendar un turno con cardiología', status: 'converted', time: '10 min ago' },
  { id: 2, contact: 'María García', content: '¿Tienen disponibilidad hoy?', status: 'pending', time: '15 min ago' },
  { id: 3, contact: 'Luis Rodríguez', content: 'Necesito cancelar mi turno de las 18hs', status: 'canceled', time: '1 hour ago' },
  { id: 4, contact: 'Ana Martínez', content: 'Hola, ¿qué obra social aceptan?', status: 'answered', time: '2 hours ago' },
  { id: 5, contact: 'Carlos López', content: 'Quiero un turno con dermatología', status: 'converted', time: '3 hours ago' },
];

export default function DashboardOverview() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Turnos de Hoy</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +4 respecto al promedio
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversión del Bot</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">48%</div>
            <p className="text-xs text-muted-foreground">
              Consultas terminadas en turno
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recaudación Est.</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$384,500</div>
            <p className="text-xs text-muted-foreground">
              Proyectado para el día
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interacciones Activas</CardTitle>
            <BotMessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Pacientes hablando con Paola
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Actividad del Bot vs Turnos</CardTitle>
            <CardDescription>Volumen de mensajes comparado con turnos agendados durante el día.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTurns" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <RechartsTooltip />
                <Area type="monotone" dataKey="messages" stroke="#8884d8" fillOpacity={1} fill="url(#colorMessages)" />
                <Area type="monotone" dataKey="turns" stroke="#82ca9d" fillOpacity={1} fill="url(#colorTurns)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-3 shadow-sm flex flex-col">
          <CardHeader>
            <CardTitle>Live Feed</CardTitle>
            <CardDescription>
              Últimas interacciones procesadas por la IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 px-6 pb-6">
            <ScrollArea className="h-[340px] pr-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{msg.contact}</span>
                      <span className="text-xs text-muted-foreground">{msg.time}</span>
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-1">{msg.content}</p>
                    <div className="flex items-center mt-1">
                      <Badge variant={
                        msg.status === 'converted' ? 'default' :
                          msg.status === 'pending' ? 'secondary' :
                            msg.status === 'canceled' ? 'destructive' : 'outline'
                      } className="text-[10px] px-1.5 py-0 h-4 rounded-sm font-medium">
                        {msg.status === 'converted' ? 'Turno Creado' :
                          msg.status === 'pending' ? 'Hablando' :
                            msg.status === 'canceled' ? 'Cancelado' : 'Respondido'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

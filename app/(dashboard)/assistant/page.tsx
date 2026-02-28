'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, Save, Play, RefreshCcw, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AssistantPage() {
    const [temperature, setTemperature] = useState([0.7]);
    const [isActive, setIsActive] = useState(true);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Cerebro IA (Paola)</h1>
                    <p className="text-sm text-muted-foreground mt-1">Configuración del comportamiento y las instrucciones del agente de WhatsApp.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="gap-1.5 py-1">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        n8n Conectado
                    </Badge>
                    <Badge variant="outline" className="gap-1.5 py-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Meta Webhook
                    </Badge>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-12">
                {/* Config Left Panel */}
                <div className="md:col-span-7 flex flex-col gap-6">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bot className="w-5 h-5 text-primary" />
                                Personalidad y Reglas
                            </CardTitle>
                            <CardDescription>
                                El System Prompt define cómo responde la IA, su tono, y las directivas estrictas que no debe romper.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Nombre del Asistente</Label>
                                <Input defaultValue="Paola" />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>System Prompt (Instrucciones base)</Label>
                                    <span className="text-xs text-muted-foreground">Markdown soportado</span>
                                </div>
                                <Textarea
                                    className="min-h-[250px] font-mono text-sm leading-relaxed"
                                    defaultValue={`Eres Paola, la asistente virtual médica de 'Clínica SaaS'.

REGLAS ESTRICTAS:
1. Eres amable, concisa y muy profesional.
2. Nunca inventes información. Si no sabes, pide disculpas y transfiere a un humano [transferir_humano].
3. Tu objetivo es agendar turnos o responder inquietudes breves.
4. Usa respuestas cortas ideales para WhatsApp (máx 2-3 oraciones).

CONTEXTO PROVISTO AUTOMÁTICAMENTE:
Las funciones n8n te proveerán de los datos actualizados del paciente y de los servicios de cada doctor de esta clínica. Usa esa data para responder.`}
                                />
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <Label>Creatividad (Temperatura: {temperature[0]})</Label>
                                    <span className="text-xs text-muted-foreground w-1/3 text-right">
                                        {temperature[0] < 0.3 ? "Respuestas muy fijas y formales" : temperature[0] > 0.8 ? "Muy creativa, riesgo de alucinación" : "Equilibrio ideal"}
                                    </span>
                                </div>
                                <Slider
                                    defaultValue={[0.7]}
                                    max={1}
                                    step={0.1}
                                    onValueChange={setTemperature}
                                />
                            </div>
                        </CardContent>
                        <Separator />
                        <CardFooter className="py-4 justify-between">
                            <div className="flex items-center space-x-2">
                                <Switch id="bot-active" checked={isActive} onCheckedChange={setIsActive} />
                                <Label htmlFor="bot-active" className="cursor-pointer">
                                    {isActive ? 'Bot Activo' : 'Bot Pausado'}
                                </Label>
                            </div>
                            <Button className="gap-2">
                                <Save className="w-4 h-4" /> Guardar Cambios
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Playground Right Panel */}
                <div className="md:col-span-5 flex flex-col h-full min-h-[500px]">
                    <Card className="shadow-sm flex-1 flex flex-col">
                        <CardHeader className="pb-3 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Play className="w-4 h-4 text-emerald-500" />
                                        Playground de Pruebas
                                    </CardTitle>
                                    <CardDescription className="text-xs mt-1">
                                        Chatea simulando ser un paciente
                                    </CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                                    <RefreshCcw className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col relative bg-muted/10">
                            <ScrollArea className="flex-1 p-4">
                                <div className="flex flex-col gap-4">
                                    {/* Mock Chat Bubbles */}
                                    <div className="flex w-full items-start gap-2 max-w-[85%] ml-auto">
                                        <div className="flex-1 bg-primary text-primary-foreground text-sm rounded-lg rounded-tr-none p-3 shadow-sm">
                                            Hola, necesito un turno con el Dr. Fernando para mañana, ¿se puede?
                                        </div>
                                    </div>
                                    <div className="flex w-full items-start gap-2 max-w-[85%]">
                                        <Avatar className="w-6 h-6 border bg-background mt-1 shrink-0">
                                            <AvatarImage src="/bot-avatar.png" />
                                            <AvatarFallback><Bot className="w-3 h-3" /></AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 bg-background border text-foreground text-sm rounded-lg rounded-tl-none p-3 shadow-sm">
                                            ¡Hola! Soy Paola. Busqué en la agenda del Dr. Fernando (Cardiología) y lamentablemente no tiene horarios disponibles para mañana.
                                            <br /><br />
                                            Sin embargo, tengo lugar el **jueves a las 15:30hs**. ¿Te gustaría que te reserve ese horario?
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                            <div className="p-3 border-t bg-background mt-auto">
                                <div className="relative">
                                    <Input
                                        placeholder="Escribe un mensaje de prueba..."
                                        className="pr-10 bg-muted/50"
                                    />
                                    <Button size="icon" variant="ghost" className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-primary rounded-l-none">
                                        <Play className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-center text-muted-foreground mt-2">
                                    Los mensajes del playground no se guardan en la base de datos real.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

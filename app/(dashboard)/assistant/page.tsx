'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Save, Play, RefreshCcw, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import useSWR from 'swr';
import { useCurrentDepartment } from "@/components/providers/department-provider";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then(res => res.json());

const TONE_OPTIONS = [
    { value: 'Profesional', label: '💼 Profesional' },
    { value: 'Empático', label: '🤝 Empático' },
    { value: 'Informal', label: '😊 Informal' },
    { value: 'Técnico', label: '🔬 Técnico' },
    { value: 'Directo', label: '⚡ Directo' },
];

export default function AssistantPage() {
    const { currentDepartmentId } = useCurrentDepartment();

    // SWR fetches keyed to active department
    const { data: contextData } = useSWR('/api/user/context', fetcher);
    const { data: assistantData, isLoading, mutate } = useSWR(
        // Always fetch — the API reads the department from the server-side cookie.
        // We include currentDepartmentId in the key so SWR re-validates when the user
        // switches departments (even though the API ignores the query param).
        `/api/assistants?dep=${currentDepartmentId ?? 'cookie'}`,
        fetcher
    );

    const userRole = contextData?.data?.role;
    const isReadOnly = userRole === 'DOCTOR';
    const assistant = assistantData?.data;

    // Local form state
    const [name, setName] = useState('');
    const [persona, setPersona] = useState('');
    const [tone, setTone] = useState('Profesional');
    const [initialGreeting, setInitialGreeting] = useState('');
    const [temperature, setTemperature] = useState([0.7]);
    const [isActive, setIsActive] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Hydrate form when data loads or department changes
    useEffect(() => {
        if (assistant) {
            setName(assistant.name ?? '');
            setPersona(assistant.persona ?? '');
            setTone(assistant.tone ?? 'Profesional');
            setInitialGreeting(assistant.initialGreeting ?? '');
            setTemperature([parseFloat(assistant.temperature ?? '0.7')]);
            setIsActive(assistant.isActive ?? true);
        } else if (assistantData?.data === null) {
            // Department has no assistant yet – reset to defaults
            setName('');
            setPersona('');
            setTone('Profesional');
            setInitialGreeting('');
            setTemperature([0.7]);
            setIsActive(true);
        }
    }, [assistant, assistantData]);

    const assembledPrompt = persona
        ? `${persona} Tu tono de respuesta debe ser ${tone}. Saluda siempre diciendo: ${initialGreeting}`
        : '';

    const handleSave = async () => {
        if (isReadOnly) return;
        setIsSaving(true);
        try {
            const res = await fetch('/api/assistants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, persona, tone, initialGreeting, temperature: temperature[0], isActive })
            });
            const json = await res.json();
            if (json.success) {
                await mutate();
                toast.success('Cambios guardados', { description: 'La configuración del asistente fue actualizada.' });
            } else {
                toast.error('Error al guardar', { description: json.error });
            }
        } catch {
            toast.error('Error de red', { description: 'No se pudo contactar al servidor.' });
        } finally {
            setIsSaving(false);
        }
    };

    const tempLabel = temperature[0] < 0.3
        ? 'Preciso y determinista'
        : temperature[0] > 0.8
            ? 'Muy creativo (riesgo de alucinación)'
            : 'Equilibrio ideal';

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Cerebro IA — {name || 'Asistente'}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Configuración del comportamiento y las instrucciones del agente de WhatsApp para el área activa.
                    </p>
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

            {isReadOnly && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Solo los administradores pueden modificar la configuración del asistente.
                </div>
            )}

            {!currentDepartmentId ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                    <Bot className="w-10 h-10 opacity-30" />
                    <p className="text-sm">Seleccioná un área en el selector superior para ver su asistente.</p>
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="animate-spin h-8 w-8 text-primary" />
                </div>
            ) : (
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
                                    Define quién es el agente, su tono y cómo saluda a los pacientes.
                                    El sistema ensamblará el prompt final automáticamente.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Name */}
                                <div className="space-y-2">
                                    <Label>Nombre del Asistente</Label>
                                    <Input
                                        placeholder="Ej: Paola"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                </div>

                                {/* Identity / Persona */}
                                <div className="space-y-2">
                                    <Label>Identidad del Agente</Label>
                                    <Textarea
                                        placeholder="Eres una asistente médica llamada Paola, especialista en cardiología. Tu objetivo es agendar turnos y responder dudas breves. Nunca inventes información clínica."
                                        className="min-h-[110px] leading-relaxed"
                                        value={persona}
                                        onChange={e => setPersona(e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                </div>

                                {/* Tone */}
                                <div className="space-y-2">
                                    <Label>Tono de Respuesta</Label>
                                    <Select value={tone} onValueChange={setTone} disabled={isReadOnly}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccioná un tono..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TONE_OPTIONS.map(o => (
                                                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Initial Greeting */}
                                <div className="space-y-2">
                                    <Label>Saludo Inicial</Label>
                                    <Input
                                        placeholder="¡Hola! Soy Paola, ¿en qué puedo ayudarte hoy?"
                                        value={initialGreeting}
                                        onChange={e => setInitialGreeting(e.target.value)}
                                        disabled={isReadOnly}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Este mensaje se enviará automáticamente cuando el bot inicie una nueva conversación.
                                    </p>
                                </div>

                                {/* Temperature */}
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Temperatura: {temperature[0].toFixed(1)}</Label>
                                        <span className="text-xs text-muted-foreground w-64 text-right">{tempLabel}</span>
                                    </div>
                                    <Slider
                                        value={temperature}
                                        min={0}
                                        max={1}
                                        step={0.1}
                                        onValueChange={setTemperature}
                                        disabled={isReadOnly}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        0.0 = determinista y preciso · 1.0 = creativo pero impredecible
                                    </p>
                                </div>

                                {/* Assembled prompt preview */}
                                {assembledPrompt && (
                                    <div className="rounded-md bg-muted/50 border p-3 space-y-1">
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vista previa del prompt → n8n</p>
                                        <p className="text-xs text-foreground/80 leading-relaxed font-mono">{assembledPrompt}</p>
                                    </div>
                                )}
                            </CardContent>
                            <Separator />
                            <CardFooter className="py-4 justify-between">
                                <div className="flex items-center space-x-2">
                                    <Switch id="bot-active" checked={isActive} onCheckedChange={setIsActive} disabled={isReadOnly} />
                                    <Label htmlFor="bot-active" className="cursor-pointer">
                                        {isActive ? 'Bot Activo' : 'Bot Pausado'}
                                    </Label>
                                </div>
                                {!isReadOnly && (
                                    <Button className="gap-2" onClick={handleSave} disabled={isSaving}>
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Guardar Cambios
                                    </Button>
                                )}
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
                                        {initialGreeting && (
                                            <div className="flex w-full items-start gap-2 max-w-[85%]">
                                                <Avatar className="w-6 h-6 border bg-background mt-1 shrink-0">
                                                    <AvatarImage src="/bot-avatar.png" />
                                                    <AvatarFallback><Bot className="w-3 h-3" /></AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 bg-background border text-foreground text-sm rounded-lg rounded-tl-none p-3 shadow-sm">
                                                    {initialGreeting}
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex w-full items-start gap-2 max-w-[85%] ml-auto">
                                            <div className="flex-1 bg-primary text-primary-foreground text-sm rounded-lg rounded-tr-none p-3 shadow-sm">
                                                Hola, necesito un turno con el cardiólogo para la próxima semana.
                                            </div>
                                        </div>
                                        <div className="flex w-full items-start gap-2 max-w-[85%]">
                                            <Avatar className="w-6 h-6 border bg-background mt-1 shrink-0">
                                                <AvatarImage src="/bot-avatar.png" />
                                                <AvatarFallback><Bot className="w-3 h-3" /></AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 bg-background border text-foreground text-sm rounded-lg rounded-tl-none p-3 shadow-sm">
                                                Claro, en base a la agenda disponible tengo turnos el martes o jueves. ¿Cuál te queda mejor?
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
            )}
        </div>
    );
}

import React, { useState } from "react";
import { EntityPanel } from "@/components/ui/entity-panel";
import { CyberFillerPanel } from "@/components/ui/cyber-filler-panel";
import { CyberSpacer } from "@/components/ui/cyber-spacer";
import { CyberModule } from "@/components/ui/cyber-module";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Terminal, Shield, Zap, Target, AlertTriangle, Layers } from "lucide-react";
import { SectionHeader } from "@/components/common/SectionHeader";

export default function ComponentShowcase() {
  const [activeTab, setActiveTab] = useState("typography");

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-20">
      <SectionHeader
        icon={Layers}
        title="Showcase de Componentes"
        description="Catálogo de componentes UI y elementos de diseño del sistema Shadowmore OS."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-card/50 border border-border">
          <TabsTrigger value="typography">Tipografía & Colores</TabsTrigger>
          <TabsTrigger value="cyber">Cyber Componentes</TabsTrigger>
          <TabsTrigger value="forms">Formularios & Inputs</TabsTrigger>
          <TabsTrigger value="panels">Paneles & Layout</TabsTrigger>
        </TabsList>

        <TabsContent value="typography" className="space-y-8">
          <EntityPanel title="Tipografía" icon={<Terminal className="size-5" />}>
            <div className="space-y-6 p-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Font: Oxanium (Títulos)</span>
                <h1 className="text-4xl font-oxanium font-bold text-foreground">Encabezado H1 Oxanium</h1>
                <h2 className="text-3xl font-oxanium font-semibold text-primary">Encabezado H2 Primary</h2>
                <h3 className="text-2xl font-oxanium font-medium text-accent1">Encabezado H3 Accent1</h3>
              </div>
              <CyberSpacer variant="line" />
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Font: Poppins (Cuerpo)</span>
                <p className="text-base font-poppins text-foreground mb-2">Párrafo base text-foreground. The quick brown fox jumps over the lazy dog.</p>
                <p className="text-sm font-poppins text-muted-foreground">Párrafo pequeño text-muted-foreground. The quick brown fox jumps over the lazy dog.</p>
              </div>
              <CyberSpacer variant="dots" />
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-widest block mb-2">Font: Yanone Kaffeesatz (Estilo especial)</span>
                <p className="text-2xl font-yanone text-accent2 tracking-wide uppercase">Texto Especial Yanone</p>
              </div>
            </div>
          </EntityPanel>

          <EntityPanel title="Paleta de Colores" icon={<Zap className="size-5" />} accent="accent2">
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <ColorBox name="background" bgClass="bg-background" textClass="text-foreground" />
              <ColorBox name="foreground" bgClass="bg-foreground" textClass="text-background" />
              <ColorBox name="card" bgClass="bg-card" textClass="text-foreground" />
              <ColorBox name="muted" bgClass="bg-muted" textClass="text-muted-foreground" />
              
              <ColorBox name="primary" bgClass="bg-primary" textClass="text-primary-foreground" />
              <ColorBox name="primary-foreground" bgClass="bg-primary-foreground" textClass="text-primary" />
              
              <ColorBox name="accent1" bgClass="bg-accent1" textClass="text-black" />
              <ColorBox name="accent2" bgClass="bg-accent2" textClass="text-white" />
              <ColorBox name="accent3" bgClass="bg-accent3" textClass="text-black" />
              <ColorBox name="accent4" bgClass="bg-accent4" textClass="text-black" />
              
              <ColorBox name="bg1" bgClass="bg-bg1" textClass="text-white" />
              <ColorBox name="bg2" bgClass="bg-bg2" textClass="text-white" />
              <ColorBox name="bg3" bgClass="bg-bg3" textClass="text-white" />
              <ColorBox name="bg4" bgClass="bg-bg4" textClass="text-white" />
              
              <ColorBox name="destructive" bgClass="bg-destructive" textClass="text-destructive-foreground" />
            </div>
          </EntityPanel>
        </TabsContent>

        <TabsContent value="cyber" className="space-y-8">
          <EntityPanel title="Cyber Spacers" pattern="dots">
            <div className="p-4 space-y-6">
              <div><Label className="mb-2 block">variant="line"</Label><CyberSpacer variant="line" /></div>
              <div><Label className="mb-2 block">variant="diamond"</Label><CyberSpacer variant="diamond" /></div>
              <div><Label className="mb-2 block">variant="brackets"</Label><CyberSpacer variant="brackets" /></div>
              <div><Label className="mb-2 block">variant="dots"</Label><CyberSpacer variant="dots" /></div>
              <div><Label className="mb-2 block">variant="circuit"</Label><CyberSpacer variant="circuit" /></div>
              <div><Label className="mb-2 block">variant="hazard"</Label><CyberSpacer variant="hazard" /></div>
              <div><Label className="mb-2 block">variant="crosshair"</Label><CyberSpacer variant="crosshair" /></div>
              <div><Label className="mb-2 block">Con accent="accent3"</Label><CyberSpacer variant="circuit" accent="accent3" /></div>
              <div><Label className="mb-2 block">Con glow=true</Label><CyberSpacer variant="diamond" glow accent="accent1" /></div>
            </div>
          </EntityPanel>

          <EntityPanel title="Cyber Modules" pattern="grid">
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CyberModule icon={Shield} title="DEFENSA GLOBAL" subtitle="SISTEMA ACTIVO" text="98%" variant="default" />
              <CyberModule icon={Target} title="PRECISIÓN TÁCTICA" subtitle="CALIBRANDO" text="1.02x" variant="accent1" glow />
              <CyberModule icon={Zap} title="ENERGÍA RESERVA" subtitle="NIVEL CRÍTICO" text="12%" variant="destructive" pattern="diagonal" showTelemetry />
              <CyberModule icon={Terminal} title="OVERRIDE CODE" subtitle="ESPERANDO INPUT" text="WAIT" variant="accent3" pattern="dots" />
            </div>
          </EntityPanel>
          
          <EntityPanel title="Cyber Filler Panels">
             <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <CyberFillerPanel icon={Terminal} title="TERMINAL VACÍA" subtitle="NO SE ENCONTRARON REGISTROS" variant="default" />
              <CyberFillerPanel icon={AlertTriangle} title="ERROR DE SISTEMA" subtitle="LA CONEXIÓN FUE INTERRUMPIDA" variant="accent2" pattern="diagonal" />
            </div>
          </EntityPanel>
        </TabsContent>

        <TabsContent value="forms" className="space-y-8">
          <EntityPanel title="Elementos de Formulario" pattern="diagonal">
            <div className="p-4 space-y-8">
              
              <div className="space-y-4">
                <h3 className="font-oxanium text-lg text-primary border-b border-border pb-2">Botones (Buttons)</h3>
                <div className="flex flex-wrap gap-4 items-center">
                  <Button variant="default">Default Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="outline">Outline Button</Button>
                  <Button variant="ghost">Ghost Button</Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-oxanium text-lg text-primary border-b border-border pb-2">Inputs & Textareas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Input Standard</Label>
                    <Input placeholder="Escribe aquí..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-bold uppercase tracking-widest text-foreground">Label Cyberpunk</Label>
                    <Input placeholder="INPUT REQUERIDO..." className="font-mono" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Textarea</Label>
                    <Textarea placeholder="Descripción detallada..." />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-oxanium text-lg text-primary border-b border-border pb-2">Selects & Toggles</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Select</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Elige opción" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Opción Uno</SelectItem>
                        <SelectItem value="2">Opción Dos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Switch Toggle</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Switch id="showcase-switch" />
                      <Label htmlFor="showcase-switch">Activar Módulo</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Checkbox</Label>
                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox id="showcase-check" />
                      <Label htmlFor="showcase-check">Confirmar acción</Label>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-oxanium text-lg text-primary border-b border-border pb-2">Badges</h3>
                <div className="flex flex-wrap gap-4 items-center">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge className="bg-accent1 text-black hover:bg-accent1/80">Accent 1</Badge>
                  <Badge className="bg-accent2 text-white hover:bg-accent2/80">Accent 2</Badge>
                </div>
              </div>

            </div>
          </EntityPanel>
        </TabsContent>

        <TabsContent value="panels" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <EntityPanel title="EntityPanel Default">
              <div className="p-4 text-sm text-muted-foreground">Panel estándar sin props adicionales.</div>
            </EntityPanel>

            <EntityPanel title="Con Icono & Badge" icon={<Shield className="size-4" />} badge="NIVEL 1">
              <div className="p-4 text-sm text-muted-foreground">Panel con icono en el título y un badge en la esquina.</div>
            </EntityPanel>

            <EntityPanel title="Corner Ticks" cornerTicks>
              <div className="p-4 text-sm text-muted-foreground">Panel con decoración cyber en las esquinas.</div>
            </EntityPanel>

            <EntityPanel title="Accent 1 & Glow" accent="accent1" glow>
              <div className="p-4 text-sm text-muted-foreground">Panel iluminado con el color de acento 1.</div>
            </EntityPanel>
            
             <EntityPanel title="Accent 2 + Grid Pattern" accent="accent2" pattern="grid" cornerTicks>
              <div className="p-4 text-sm text-muted-foreground text-white">Panel oscuro con patrón de rejilla y acento rojo.</div>
            </EntityPanel>
            
            <EntityPanel title="Accent 3 + Radial" accent="accent3" pattern="radial">
              <div className="p-4 text-sm text-muted-foreground text-white">Panel oscuro con brillo radial de fondo y acento azul.</div>
            </EntityPanel>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ColorBox({ name, bgClass, textClass }: { name: string, bgClass: string, textClass: string }) {
  return (
    <div className={`p-4 rounded-md border border-border flex flex-col items-center justify-center h-24 ${bgClass} ${textClass}`}>
      <span className="font-mono text-sm font-bold">{name}</span>
      <span className="text-[10px] opacity-70 mt-1">{bgClass}</span>
    </div>
  );
}

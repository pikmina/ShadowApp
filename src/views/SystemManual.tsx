import { BookOpen, AlertTriangle, Shield, Heart, Zap, Crosshair, ChevronRight, Activity, Hand, Target, ArrowLeft, BadgeCheck, Sparkles } from "lucide-react";
import useSWR from "swr";
import { fetcher } from "../lib/api";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function SystemManual() {
  const { user } = useAuth();
  const { data: rules } = useSWR('/api/rules', fetcher);
  
  const stagesRule = rules?.find((r: any) => r.key === 'system_stages') || { value: [] };
  const stages = stagesRule.value || [];
  
  const staminaCostsRule = rules?.find((r: any) => r.key === 'stamina_execution_costs') || { value: { baseAction: 1, objectUse: 1, techniqueByLevel: [], skillByLevel: [] } };
  const staminaCosts = staminaCostsRule.value;
  
  const mechanicsRule = rules?.find((r: any) => r.key === 'system_mechanics') || { value: [] };
  const mechanics = mechanicsRule.value || [];

  const difficultyRule = rules?.find((r: any) => r.key === 'system_difficulty') || { 
    value: {
      normal: [],
      sustained: []
    }
  };
  const difficulties = difficultyRule.value;

  const navigateToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="h-16 border-b border-border bg-card/60 flex items-center px-4 md:px-6 shrink-0 justify-between">
        <div className="flex items-center gap-2 text-primary font-oxanium font-bold tracking-wider">
          <BookOpen className="w-5 h-5" />
          <span>SHADOWMORE <span className="text-muted-foreground font-normal ml-2 text-sm hidden sm:inline">MANUAL DEL SISTEMA</span></span>
        </div>
        <Link to={user ? "/" : "/login"} className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver al Inicio
        </Link>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col overflow-y-auto">
          <div className="p-4 space-y-6 flex-1">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">1. Creación</h3>
              <ul className="space-y-1 text-sm">
                <li><button onClick={() => navigateToSection('atributos')} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground">1.1 Atributos Base</button></li>
                <li><button onClick={() => navigateToSection('derivadas')} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground">1.2 Est. Derivadas</button></li>
                <li><button onClick={() => navigateToSection('etapas')} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground">1.3 Etapas por Rango de Edad</button></li>
                <li><button onClick={() => navigateToSection('dificultades')} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground">1.4 Rangos de Dificultad</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">2. Combate</h3>
              <ul className="space-y-1 text-sm">
                <li><button onClick={() => navigateToSection('estamina')} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground">2.1 Economía de Estamina</button></li>
                <li><button onClick={() => navigateToSection('dano')} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground">2.2 Tipos de Daño</button></li>
                <li><button onClick={() => navigateToSection('plus-ultra')} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground">2.3 Recurso Plus Ultra</button></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">3. Mecánicas</h3>
              <ul className="space-y-1 text-sm">
                <li><button onClick={() => navigateToSection('categorias')} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground">3.1 Categorías Disponibles</button></li>
                <li><button onClick={() => navigateToSection('credenciales')} className="w-full text-left px-2 py-1.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground">3.2 Credenciales</button></li>
              </ul>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-background p-6 md:p-10 lg:p-14">
          <div className="max-w-3xl mx-auto space-y-16 pb-20">
            
            <div className="space-y-4">
              <h1 className="text-4xl font-oxanium font-bold tracking-tight text-foreground">Manual del Sistema</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">Guía pública y oficial de reglas, matemáticas y dinámicas del juego. Esta documentación se genera automáticamente desde la configuración del núcleo del sistema.</p>
            </div>

            <section id="atributos" className="space-y-6 pt-8 border-t border-border/50">
              <div className="space-y-2">
                <h2 className="text-2xl font-oxanium font-bold text-foreground flex items-center gap-2"><Activity className="w-6 h-6 text-primary" /> 1.1 Atributos Base</h2>
                <p className="text-muted-foreground">Los atributos representan las capacidades innatas del personaje y determinan el cálculo del resto de estadísticas.</p>
              </div>
              
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-border bg-card">
                  <h3 className="font-bold text-foreground mb-1">Fuerza (FUE)</h3>
                  <p className="text-sm text-muted-foreground">Potencia muscular y capacidad de carga. Aumenta directamente el daño base de ataques físicos.</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <h3 className="font-bold text-foreground mb-1">Destreza (DES)</h3>
                  <p className="text-sm text-muted-foreground">Coordinación, agilidad manual y puntería. Vital para la reserva de Estamina.</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <h3 className="font-bold text-foreground mb-1">Resistencia (RES)</h3>
                  <p className="text-sm text-muted-foreground">Aguante físico ante heridas y cansancio. Aumenta los Puntos de Salud máximos.</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <h3 className="font-bold text-foreground mb-1">Inteligencia (INT)</h3>
                  <p className="text-sm text-muted-foreground">Agudeza mental, memoria y razonamiento. Influye en la Iniciativa y el uso de mecánicas complejas.</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <h3 className="font-bold text-foreground mb-1">Voluntad (VOL)</h3>
                  <p className="text-sm text-muted-foreground">Fuerza mental y resistencia a la manipulación. Define la defensa mágica/psíquica (Coraje).</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-card">
                  <h3 className="font-bold text-foreground mb-1">Velocidad (VEL)</h3>
                  <p className="text-sm text-muted-foreground">Rapidez de movimiento y reflejos. Base principal de la Evasión.</p>
                </div>
              </div>
            </section>

            <section id="derivadas" className="space-y-6 pt-8 border-t border-border/50">
              <div className="space-y-2">
                <h2 className="text-2xl font-oxanium font-bold text-foreground flex items-center gap-2"><Target className="w-6 h-6 text-primary" /> 1.2 Estadísticas Derivadas</h2>
                <p className="text-muted-foreground">Se calculan de forma matemática usando los atributos y el valor base de la etapa actual.</p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-card gap-4">
                  <div>
                    <h3 className="font-bold flex items-center gap-2"><Heart className="w-4 h-4 text-red-400" /> Salud Máxima</h3>
                    <p className="text-sm text-muted-foreground">Puntos de daño que puedes resistir antes de caer.</p>
                  </div>
                  <div className="bg-muted px-4 py-2 rounded-md font-mono text-sm shrink-0 border border-border/50">
                    <span className="text-muted-foreground">Salud = </span> Base Etapa + RES
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-card gap-4">
                  <div>
                    <h3 className="font-bold flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-400" /> Estamina Máxima</h3>
                    <p className="text-sm text-muted-foreground">Tu energía para ejecutar técnicas y acciones en combate.</p>
                  </div>
                  <div className="bg-muted px-4 py-2 rounded-md font-mono text-sm shrink-0 border border-border/50">
                    <span className="text-muted-foreground">Estamina = </span> Base Etapa + DES
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-card gap-4">
                  <div>
                    <h3 className="font-bold flex items-center gap-2"><Crosshair className="w-4 h-4 text-blue-400" /> Evasión</h3>
                    <p className="text-sm text-muted-foreground">Dificultad base para que un enemigo te acierte con un ataque físico.</p>
                  </div>
                  <div className="bg-muted px-4 py-2 rounded-md font-mono text-sm shrink-0 border border-border/50">
                    <span className="text-muted-foreground">Evasión = </span> 10 + VEL
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-card gap-4">
                  <div>
                    <h3 className="font-bold flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-400" /> Coraje</h3>
                    <p className="text-sm text-muted-foreground">Resistencia frente a ataques mentales, mágicos o intimidatorios.</p>
                  </div>
                  <div className="bg-muted px-4 py-2 rounded-md font-mono text-sm shrink-0 border border-border/50">
                    <span className="text-muted-foreground">Coraje = </span> 10 + VOL
                  </div>
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-card gap-4">
                  <div>
                    <h3 className="font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-yellow-400" /> Iniciativa</h3>
                    <p className="text-sm text-muted-foreground">Determina quién actúa primero en el turno.</p>
                  </div>
                  <div className="bg-muted px-4 py-2 rounded-md font-mono text-sm shrink-0 border border-border/50">
                    <span className="text-muted-foreground">Iniciativa = </span> Modificador de [(INT + VEL) / 2]
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-card gap-4">
                  <div>
                    <h3 className="font-bold flex items-center gap-2"><Target className="w-4 h-4 text-orange-400" /> Modificador de Fuerza (Físico)</h3>
                    <p className="text-sm text-muted-foreground">Bonificador de daño aplicado a técnicas y ataques basados en la potencia física.</p>
                  </div>
                  <div className="bg-muted px-4 py-2 rounded-md font-mono text-sm shrink-0 border border-border/50">
                    <span className="text-muted-foreground">Mod. FUE = </span> FUE / 2 (Redondeado abajo)
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-card gap-4">
                  <div>
                    <h3 className="font-bold flex items-center gap-2"><Crosshair className="w-4 h-4 text-cyan-400" /> Modificador de Destreza (Precisión)</h3>
                    <p className="text-sm text-muted-foreground">Bonificador aplicado a puntería y daño de ataques basados en agilidad y armas a distancia.</p>
                  </div>
                  <div className="bg-muted px-4 py-2 rounded-md font-mono text-sm shrink-0 border border-border/50">
                    <span className="text-muted-foreground">Mod. DES = </span> DES / 2 (Redondeado abajo)
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border border-border bg-card gap-4">
                  <div>
                    <h3 className="font-bold flex items-center gap-2"><Shield className="w-4 h-4 text-slate-400" /> Reducción de Daño (RD)</h3>
                    <p className="text-sm text-muted-foreground">Cantidad de daño que el personaje ignora al recibir un impacto (Armadura y habilidades pasivas).</p>
                  </div>
                  <div className="bg-muted px-4 py-2 rounded-md font-mono text-sm shrink-0 border border-border/50">
                    <span className="text-muted-foreground">RD = </span> Suma de Pasivas y Equipo
                  </div>
                </div>

              </div>
            </section>

            <section id="etapas" className="space-y-6 pt-8 border-t border-border/50">
              <div className="space-y-2">
                <h2 className="text-2xl font-oxanium font-bold text-foreground">1.3 Etapas por Rango de Edad</h2>
                <p className="text-muted-foreground">Define la edad general de un personaje. Establece los límites de atributos, madurez y bases de estadísticas de su cuerpo.</p>
              </div>
              
              <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 font-medium">Etapa</th>
                      <th className="px-4 py-3 font-medium text-center">Edad</th>
                      <th className="px-4 py-3 font-medium text-center">Pts. Atributo</th>
                      <th className="px-4 py-3 font-medium text-center">Máx. por Atributo</th>
                      <th className="px-4 py-3 font-medium text-center">Salud Base</th>
                      <th className="px-4 py-3 font-medium text-center">Estamina Base</th>
                      <th className="px-4 py-3 font-medium text-center">Dado Base</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {stages.map((st: any) => (
                      <tr key={st.name} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{st.name}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">{st.minAge} - {st.maxAge}</td>
                        <td className="px-4 py-3 text-center">{st.attrPoints}</td>
                        <td className="px-4 py-3 text-center">{st.maxAttr}</td>
                        <td className="px-4 py-3 text-center text-red-400 font-medium">{st.baseHealth}</td>
                        <td className="px-4 py-3 text-center text-emerald-400 font-medium">{st.baseStamina}</td>
                        <td className="px-4 py-3 text-center text-orange-400 font-medium">{st.baseDamage}</td>
                      </tr>
                    ))}
                    {stages.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground bg-card">No hay etapas configuradas en el sistema.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="dificultades" className="space-y-6 pt-8 border-t border-border/50">
              <div className="space-y-2">
                <h2 className="text-2xl font-oxanium font-bold text-foreground flex items-center gap-2"><Target className="w-6 h-6 text-primary" /> 1.4 Rangos de Dificultad (RD)</h2>
                <p className="text-muted-foreground">La Dificultad o RD (Rango de Dificultad) es el número objetivo que el jugador debe igualar o superar con su tirada (1D20 + Modificadores) para lograr una acción exitosa.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold font-oxanium mb-3 text-orange-400">Tiradas Normales</h3>
                  <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3 font-medium w-[150px]">Nombre</th>
                          <th className="px-4 py-3 font-medium w-[80px] text-center">RD</th>
                          <th className="px-4 py-3 font-medium">Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 bg-card">
                        {difficulties.normal?.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-emerald-400">{item.rd}</td>
                            <td className="px-4 py-3 text-muted-foreground text-sm">{item.desc}</td>
                          </tr>
                        ))}
                        {(!difficulties.normal || difficulties.normal.length === 0) && (
                          <tr><td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">No configurado</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold font-oxanium mb-3 text-orange-400">Tiradas Sostenidas (Máximo 5 tiradas)</h3>
                  <p className="text-sm text-muted-foreground mb-3">Para proyectos largos o complejos, en lugar de superar una única dificultad alta, el jugador debe acumular una cantidad de éxitos (tiradas que superan la RD normal) antes de llegar al límite de 5 tiradas o sacar 3 fallos críticos.</p>
                  <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3 font-medium w-[150px]">Nombre</th>
                          <th className="px-4 py-3 font-medium w-[150px] text-center">Éxitos Requeridos</th>
                          <th className="px-4 py-3 font-medium">Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 bg-card">
                        {difficulties.sustained?.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                            <td className="px-4 py-3 text-center font-mono font-bold text-emerald-400">{item.successes} / 5</td>
                            <td className="px-4 py-3 text-muted-foreground text-sm">{item.desc}</td>
                          </tr>
                        ))}
                        {(!difficulties.sustained || difficulties.sustained.length === 0) && (
                          <tr><td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">No configurado</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            <section id="estamina" className="space-y-6 pt-8 border-t border-border/50">
              <div className="space-y-2">
                <h2 className="text-2xl font-oxanium font-bold text-foreground flex items-center gap-2"><Zap className="w-6 h-6 text-primary" /> 2.1 Economía de Estamina</h2>
                <p className="text-muted-foreground">Cualquier acción en combate requiere un mínimo de Estamina. El CE final es el mayor entre ese mínimo y la suma de las opciones activas. Las reglas pasivas no consumen Estamina.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                  <div>
                    <h3 className="font-bold">Acción Estándar</h3>
                    <p className="text-xs text-muted-foreground">Atacar o usar técnica sin nivel</p>
                  </div>
                  <div className="text-xl font-oxanium font-bold text-emerald-400">{staminaCosts.baseAction} CE</div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                  <div>
                    <h3 className="font-bold">Uso de Objeto</h3>
                    <p className="text-xs text-muted-foreground">Consumir un ítem rápido</p>
                  </div>
                  <div className="text-xl font-oxanium font-bold text-emerald-400">{staminaCosts.objectUse} CE</div>
                </div>
              </div>

              <div className="rounded-md bg-emerald-950/20 border border-emerald-900/30 p-4 flex gap-3 text-sm text-emerald-200/80">
                <AlertTriangle className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <strong className="text-emerald-400 block mb-1">Cálculo de Coste Final (CE)</strong>
                  El coste final de una técnica es el mayor entre: el <b>Mínimo</b> por tipo/nivel, O la <b>Suma de sus componentes</b> mecánicos. Nunca pagarás dos veces por la base.
                </div>
              </div>
            </section>

            <section id="dano" className="space-y-6 pt-8 border-t border-border/50">
              <div className="space-y-2">
                <h2 className="text-2xl font-oxanium font-bold text-foreground">2.2 Tipos de Daño</h2>
                <p className="text-muted-foreground">El sistema soporta dos formas de expresar la potencia de impacto de armas y técnicas.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-lg border border-border bg-card shadow-sm">
                  <h3 className="text-lg font-bold font-oxanium mb-2 text-orange-400">Daño de Dados (Ej. 1D6)</h3>
                  <p className="text-sm text-muted-foreground mb-3">Expresado como número de dados por caras. Se tira virtual o físicamente. Ideal para armas de probabilidad variable.</p>
                  <div className="text-xs bg-muted p-2 rounded text-muted-foreground font-mono border border-border/50">1D6 significa tirar un dado de 6 caras.</div>
                </div>
                <div className="p-5 rounded-lg border border-border bg-card shadow-sm">
                  <h3 className="text-lg font-bold font-oxanium mb-2 text-orange-400">Daño Fijo (Ej. 3)</h3>
                  <p className="text-sm text-muted-foreground mb-3">Un valor inmutable que se resta a la salud enemiga. No requiere tirada. Seguro y constante.</p>
                  <div className="text-xs bg-muted p-2 rounded text-muted-foreground font-mono border border-border/50">3 significa literalmente 3 puntos exactos de daño.</div>
                </div>
              </div>
            </section>

            <section id="plus-ultra" className="space-y-6 pt-8 border-t border-border/50">
              <div className="space-y-2">
                <h2 className="text-2xl font-oxanium font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-orange-400" /> 2.3 Recurso Heroico: Plus Ultra
                </h2>
                <p className="text-muted-foreground">
                  Puntos extraordinarios concedidos manualmente por el Narrador para premiar el heroísmo, la creatividad táctica o momentos cumbres de la narrativa.
                </p>
              </div>

              <div className="p-5 rounded-lg border border-orange-500/30 bg-orange-500/5 shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded border border-orange-500/40 bg-orange-500/10 text-orange-400">
                    Regla de Meta-Recurso
                  </span>
                  <span className="text-xs text-muted-foreground">Otorgado exclusivamente por el Narrador</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Los puntos <strong>Plus Ultra</strong> no tienen un límite máximo prefijado y nunca se recuperan automáticamente al descansar ni con el paso del tiempo. Son una reserva que permite romper los límites del personaje cuando la situación es crítica.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-background/60 p-3 rounded border border-border text-xs space-y-1">
                    <strong className="text-foreground block">Repetición de Tiradas</strong>
                    <span className="text-muted-foreground">Permite volver a tirar los dados de una acción crucial o técnica que haya fallado.</span>
                  </div>
                  <div className="bg-background/60 p-3 rounded border border-border text-xs space-y-1">
                    <strong className="text-foreground block">Acción al Límite</strong>
                    <span className="text-muted-foreground">Permite realizar un ataque o acción heroica incluso cuando la Estamina del personaje está en cero.</span>
                  </div>
                </div>
              </div>
            </section>

            <section id="categorias" className="space-y-6 pt-8 border-t border-border/50">
              <div className="space-y-2">
                <h2 className="text-2xl font-oxanium font-bold text-foreground flex items-center gap-2"><Hand className="w-6 h-6 text-primary" /> 3.1 Categorías Mecánicas del Sistema</h2>
                <p className="text-muted-foreground">Listado automático de comportamientos que puedes aplicar a tus técnicas o equipamiento, y sus posibles costes de Estamina asociados.</p>
              </div>

              <div className="space-y-6">
                {mechanics.map((mech: any) => (
                  <div key={mech.id} className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-lg text-foreground">{mech.name}</h3>
                        <p className="text-sm text-muted-foreground">{mech.description}</p>
                      </div>
                      <span className="shrink-0 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded border border-border/50 bg-background text-muted-foreground">
                        {{"offensive": "Ofensiva", "defensive": "Defensiva", "support": "Soporte", "control": "Control", "utility": "Utilidad"}[mech.logicalType as string] || mech.logicalType}
                      </span>
                    </div>
                    <div className="p-0 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/10 border-b border-border/50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Regla Módulo</th>
                            <th className="px-4 py-2 text-left font-medium text-muted-foreground">Efecto Lógico</th>
                            <th className="px-4 py-2 text-right font-medium text-muted-foreground w-24">Coste</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 bg-card">
                          {mech.rules?.map((rule: any) => (
                            <tr key={rule.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3 font-medium text-foreground">{rule.name}</td>
                              <td className="px-4 py-3 text-muted-foreground text-xs leading-relaxed">{rule.mechDesc || "-"}</td>
                              <td className="px-4 py-3 text-right">
                                {rule.cost === 0 && rule.effect?.timing === 'passive' ? (
                                  <span className="text-muted-foreground text-xs uppercase tracking-wider">Pasivo</span>
                                ) : (
                                  <span className={`font-bold inline-flex items-center justify-end ${rule.cost > 0 ? 'text-emerald-400' : rule.cost < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                                    {rule.cost > 0 ? '+' : ''}{rule.cost} CE
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                          {(!mech.rules || mech.rules.length === 0) && (
                            <tr>
                              <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground text-sm bg-card">Sin opciones modulares definidas.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                {mechanics.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground border border-border border-dashed rounded-lg bg-card/50">
                    No hay mecánicas de sistema configuradas en la base de datos.
                  </div>
                )}
              </div>
            </section>

            <section id="credenciales" className="space-y-6 pt-8 border-t border-border/50">
              <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-2xl font-oxanium font-bold text-foreground"><BadgeCheck className="size-6 text-amber-400" /> 3.2 Licencias, permisos y certificaciones</h2>
                <p className="text-muted-foreground">Son elementos persistentes del catálogo que un moderador asigna a una ficha. Pueden utilizarse como requisitos verificables para empleos, compras y otras reglas del sistema.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-4"><h3 className="font-bold text-amber-400">Licencia</h3><p className="mt-2 text-sm text-muted-foreground">Autoriza una actividad regulada o el uso de un recurso. Ejemplos: licencia profesional de héroe o licencia de conducir.</p></div>
                <div className="rounded-lg border border-border bg-card p-4"><h3 className="font-bold text-cyan-400">Permiso</h3><p className="mt-2 text-sm text-muted-foreground">Concede una autorización concreta, normalmente limitada por una institución, lugar o circunstancia.</p></div>
                <div className="rounded-lg border border-border bg-card p-4"><h3 className="font-bold text-emerald-400">Certificación</h3><p className="mt-2 text-sm text-muted-foreground">Acredita formación, evaluación o competencia demostrada. No implica por sí sola autorización legal para actuar.</p></div>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                <h3 className="mb-2 font-bold text-foreground">Funcionamiento</h3>
                <ol className="list-decimal space-y-2 pl-5"><li>Un administrador crea el elemento en el Catálogo y lo publica.</li><li>Un moderador lo otorga o retira desde la administración del personaje, indicando un motivo.</li><li>La credencial aparece en la ficha y queda registrada como posesión del elemento mediante su identificador estable.</li><li>Cuando un puesto la exige, ShadowApp comprueba automáticamente que el personaje la posea antes de permitir la asignación.</li></ol>
                <p className="mt-3">Los borradores no pueden asignarse. Retirar una credencial puede provocar que el personaje deje de cumplir requisitos futuros, pero no elimina automáticamente un empleo ya concedido.</p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

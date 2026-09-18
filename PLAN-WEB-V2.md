# Plan de la web v2 — seekialabs.com

> Investigación y plan cerrados el **17 sept 2026**. Decisiones tomadas por Julen ese mismo día.
> **Estado: aprobado, pendiente de ejecutar** — no se toca `index.html` hasta que Julen dé la orden.
> Fuentes: memoria (`project_seekia_web`, `feedback_diseno_color_marca`, `feedback_diseno_escala`,
> `project_tracking_demos`, `reference_costes_voz`, `reference_ionos_recepcionista`),
> `sistema-ventas/PLAN-SEPTIEMBRE-2026.md`, `DIAGNOSTICO-CRITICO-31AGO2026.md`,
> `seekia-content/instagram/seekialabs/SISTEMA-VISUAL-V2.md`.

---

## 0. Diagnóstico de la web actual (medido, no opinado)

**Lo que está bien y se conserva:** Lighthouse móvil da SEO 100, Best Practices 100, accesibilidad 91.
La estructura de argumentos (problema → producto → cómo funciona → FAQ) es correcta. El local
`index.html` es idéntico byte a byte al que sirve producción (86.333 B).

**Lo que está roto:**

| Problema | Dato medido |
|---|---|
| No hay ninguna demo | Los 2 botones "Ver demo en directo" y "Calcular mi ROI" apuntan a `#contacto`. Hay 3 demos vivas y ninguna está en la web |
| Peso inútil en móvil | Tailwind CDN = **123 KB de JS** en runtime (uso no soportado en producción por el propio Tailwind) + `Logo-trans.png` de **283 KB** para un cactus de 28px. ~400 KB tirados en audiencia 100% móvil-desde-WhatsApp |
| Contradice el sistema visual v2 | **23 tamaños de fuente · 16 radios · 15 hex + 40 rgba = 55 colores.** `#A8E04A` aparece **65 veces** → el lima como pintura, prohibido por `feedback_diseno_color_marca`. Misma enfermedad que la auditoría de Instagram; la web es la única pieza que nunca recibió el v2 |
| Cero prueba social | Ni cara, ni nombre, ni conversación real. Web anónima para un visitante que acaba de recibir un Loom de un desconocido de 20 años |
| Contenido desalineado | Sigue anclada al giro dental de junio. Desde el 10 sept solo hay carril estética. Vende la voz como producto de captación, justo lo que `reference_ionos_recepcionista` desaconseja (IONOS: 29 €/mes ilimitado) |
| FAQ sin las objeciones reales | Faltan **control** ("me gusta tener el control", objeción nº1), "ya tengo recepcionista" y "mi software no se conecta" |
| Fallos Lighthouse | Sin `<main>`, inputs sin `<label>`, árbol de accesibilidad mal formado |
| Bug visual en desktop | En el hero, las burbujas del chat se salen del contenedor y los badges se solapan |

---

## 1. Hallazgos técnicos que desbloquean el proyecto

Todo esto **ya existe montado**. No hay que construir infraestructura nueva.

### a) Las demos ya aceptan a seekialabs.com
```
$ curl -X OPTIONS -H "Origin: https://seekialabs.com" \
    https://paneln8n.seekialabs.com/webhook/estetica-aura-demo/chat
access-control-allow-origin: https://seekialabs.com
access-control-allow-methods: OPTIONS, GET, POST
```
Y el chat hospedado **no manda `X-Frame-Options` ni `frame-ancestors`** → también es empotrable en iframe.
El asistente real puede vivir dentro de la web con nuestro diseño, no como mockup.

- Workflow estética: `Pli3FL3G6T8Lg8IN` — "Centro de Belleza Aura" (17 nodos)
- Workflow dental: `rAliXqheWQ5ZZ6LF` — "Clínica Dental Nova" (Marta)
- El trigger usa `responseMode: responseNodes` con respuesta en varias partes → **usar la librería oficial
  `@n8n/chat`**, que ya sabe manejar ese protocolo. No reimplementar el streaming a mano.
- El nodo `chatTrigger` expone `customCss` y `allowedOrigins` — se puede re-estilar el chat hospedado
  sin tocar la lógica (mejora también las demos que se mandan por WhatsApp).

### b) La voz se puede probar desde el navegador, sin teléfono
Ya se montó una vez: `voz-demo/demo-voz-widget-web-LEGACY.html` (public key de VAPI + `variableValues`
para inyectar centro, servicios, horario y fecha al vuelo).

- Asistente vigente: **`03e83fce-6297-4457-8f3c-17f425c0e800`** ("SeekIA - Asistente Voz BASE v2"),
  Haiku 4.5 + 11labs `7k6n1AfTEk6nYLMpXMOM` + Deepgram nova-2 con `language: "es"`, `maxDurationSeconds` 240.
  ⚠️ El fichero legacy apunta al v1 (`e5367188…`), superado — usar el v2.
- Con `variableValues` se personaliza al vuelo → **los mismos negocios ficticios que los chats**
  (Centro de Belleza Aura / Clínica Dental Nova). Coherencia total sin crear agentes nuevos.
- Alternativa: Retell `POST /v3/create-web-call` (clave pública restringida por dominio + reCAPTCHA
  opcional). Se queda como plan B; VAPI es el camino ya probado en casa.

### c) El tracking ya existe
El puente de `project_tracking_demos` (`mQg9VgtlWWY7gMAx`) registra aperturas en Postgres
(`demo_sesiones` / `demo_mensajes`). Las pruebas desde web entran como `lead = web-estetica` /
`web-dental` sin montar nada. ⚠️ Hay que añadir las verticales nuevas al objeto `urls` del nodo
**"Resolver destino"** o redirigen en silencio a Aura.

### d) El hueco de mercado está confirmado
chatbotdental.es (+70 clínicas) enseña una conversación **simulada**. Ninguno del sector tiene demo
probable. SeekIA puede tener tres (chat, voz, calculadora).

---

## 2. Decisiones tomadas (17 sept 2026)

| Decisión | Elegido |
|---|---|
| Dirección visual | **Híbrido oscuro + papel** |
| Voz en navegador | **Sí, con tope de 2 min** y guardarraíles |
| Precios públicos | **No** — se mantiene la decisión vigente |
| Estructura | **Home + `/estetica` + `/dental`** |

---

## 3. Concepto: "Sequía"

SeekIA = seek IA + **sequía** → cactus. Hoy esa metáfora no se usa en ninguna parte de la web.
La página entera es el arco **agenda seca → agenda llena**.

- Arranca en tierra seca (neutros, huecos muertos, mensajes sin contestar) y el **lima aparece solo
  donde el sistema actúa**: el mensaje contestado, el hueco ocupado. Al bajar, la página se enciende.
- **Lima como luz, nunca como pintura** (≤10% del área). Cero cuadrícula de fondo, cero glow radial,
  cero losa verde a sangre.
- El movimiento es narrativo: lo que se mueve es **la agenda llenándose**, no partículas.
- **Escala grande de salida** (`feedback_diseno_escala`): titulares, botones y aire por encima de lo
  que parezca razonable en el primer intento.

### Ritmo oscuro / papel
```
OSCURO   hero + probador (chat vivo + agenda)
         la sequía · dónde se escapa el dinero
PAPEL    la conversación real (registro, mono)
         ¿y mi programa? (comprobador)
OSCURO   los 3 servicios + voz
PAPEL    lo que NO hacemos · FAQ
OSCURO   quién está detrás + cierre
```
El papel es donde va **la evidencia**; el oscuro donde va la promesa. El contraste separa las dos cosas
y da ritmo a una página larga.

### Tokens (portados de `SISTEMA-VISUAL-V2.md`)
- **Neutrales (rampa de 6):** `--ink-0 #060606` · `--ink-1 #0F0F0F` · `--ink-2 #181818` ·
  `--ink-3 #2B2B2B` · `--ink-4 #7A7A7A` · `--ink-5 #B4B4B4` · `--paper #EDEAE3`
- **Acento con trabajo asignado:** `--lime #A8E04A` (resultado, lo que gana el cliente) ·
  `--teal #32D9A0` (sistema, lo que hace la máquina) · `--alert #FF5A5A` (problema, nunca decorativo)
- **Tipografía, tres voces:** **Archivo** titulares (`wdth 112, wght 800`) · **Montserrat** cuerpo/UI ·
  **JetBrains Mono** datos, horas, etiquetas. Cierra el círculo que el propio v2 dejó pendiente
  ("cuando la web se retoque, debería adoptar Archivo en titulares").
- **Forma:** un solo radio de tarjeta. Nada de 16 radios.
- **Contraste mínimo** 4.5:1 en lectura, 3:1 en titulares. Sobre papel el lima **no vale como texto**
  (1.3:1): se usa `#456B0C` o solo como filo/subrayado.
- Nunca azul ni morado (cliché de startup de IA).

---

## 4. Secciones de la home

1. **Hero = el probador.** Titular grande + **el asistente real** + una **agenda al lado donde ves
   aterrizar la cita** que acabas de pedirle. Demuestra la promesa entera ("te llena la agenda") en
   30 segundos sin leer nada. Botones de arranque: *"Pídele cita" · "Pregúntale el precio" ·
   "Escríbele a las 23:40"*. Botón grande **"Llámalo y habla con él"** (voz por micro). Sin formulario.
2. **La franja del registro.** 3 datos reales medidos, en mono. **Nada de "24 horas" ni "100%
   personalizado"** (los actuales no son datos, son relleno).
3. **La sequía.** Dónde se escapa el dinero: en cabina, fuera de horario, el mensaje de las 23:07
   (caso real propio). Aquí vive el `--alert`, y solo aquí.
4. **Los 3 servicios, cada uno con su prueba.** Chat → pruébalo · Voz → llámalo · Reactivación →
   calculadora. ⚠️ **La voz se posiciona como upsell y como integración real, no como precio**
   (IONOS gana esa guerra: 29 €/mes ilimitado; ver `reference_ionos_recepcionista`).
5. **"Tú decides, él propone".** Un interruptor que enseña la MISMA conversación en modo automático y
   en modo manual. Mata la objeción nº1 documentada (control).
6. **"¿Y mi programa?"** — comprobador honesto. Eliges Koibox / Bewe / Estetical / Fresha / Booksy /
   Shortcuts / EsteticGEST / TIMIFY / Flowww / Google Calendar / papel → te dice **exactamente** qué se
   puede y qué no. Son 9 meses de inteligencia de mercado convertidos en conversión, y **pre-filtra el
   ICP solo** (regla de septiembre: preguntar el software ANTES de invertir tiempo).
7. **Lo que NO hacemos.** No sustituye a tu recepcionista · no llamamos en frío (es ilegal en España,
   art. 66.1.a LGT) · no prometemos integración con software cerrado · **no decimos "gratis" nunca,
   decimos "sin riesgo"**. El manual de producto convertido en argumento. En un sector de promesas
   infladas, la honestidad radical es el foso.
8. **Cómo va.** 3 pasos, plazo real (~2 semanas, nunca "esta semana"), qué necesita de ti (15 min).
9. **FAQ reescrita** con las objeciones reales del campo + quién paga los mensajes de Meta desde el
   1 de octubre. Mantener "sin permanencia, 15 días de aviso" (es lo que dice el contrato real,
   verificado en `sistema-ventas/plantillas/acuerdo-plantilla.html`).
10. **Quién está detrás.** Julen, con cara y nombre, Donosti. Hoy la web es anónima y eso es un agujero
    de confianza: *"lo monto yo, hablas conmigo, no con un comercial"*.
11. **Cierre.** WhatsApp + llamada + correo. Sin abusar de "sin compromiso" (`feedback_copy_outreach`).

### Landings por vertical
`/estetica` (Aura) y `/dental` (Nova): misma espina, copy en el idioma del vertical, su demo y sus
objeciones. ⚠️ **No se cambia el embudo:** el D1 sigue mandando el enlace directo de la demo, que ya
funciona. La web es el destino de "¿quiénes son estos?", no un paso intermedio nuevo.

---

## 5. Stack

**Sin build.** HTML estático + CSS propio con tokens + JS vanilla en módulos.
Fuera Tailwind CDN. Se despliega exactamente igual que hoy y no añade herramientas que mantener.

```
seekia-web/
├── index.html · estetica.html · dental.html
├── privacidad.html · aviso-legal.html · conectar-whatsapp.html   (se conservan)
├── css/  tokens.css · base.css · secciones.css
├── js/   probador.js · voz.js · agenda.js · software.js · reveal.js
└── assets/  logo.svg (o PNG recortado) · og.png · fuentes
```

- Logo: sustituir los 283 KB por SVG o PNG recortado (<10 KB). El `Logo-trans.png` original es 42 %
  margen transparente (ya diagnosticado en el v2).
- Fuentes: `font-display: swap`, solo los pesos que se usan.
- Añadir: favicon, OG image, `<main>`, labels, JSON-LD (`LocalBusiness` + `FAQPage`), sitemap, robots.

---

## 6. Fases

| Fase | Qué | Bloqueantes |
|---|---|---|
| **0** | Resolver el despliegue | 🔴 **Ver §8** |
| **1** | Sistema de diseño + esqueleto: tokens, 3 tipografías, logo optimizado, `<main>`/labels, favicon, OG, JSON-LD, sitemap. Fuera Tailwind CDN | — |
| **2** | **El probador**: chat en vivo + agenda que se rellena + voz en navegador | Permiso de Julen para 2-3 conversaciones de prueba (tokens reales) |
| **3** | Secciones nuevas: comprobador de software, "lo que no hacemos", FAQ real, quién está detrás | Foto de Julen |
| **4** | `/estetica` y `/dental` | — |
| **5** | Medición + Lighthouse + prueba en móvil real | — |

---

## 7. Coste, guardarraíles y medición

- **Chat:** ~0,01 €/conversación. Irrelevante aunque lo pruebe todo el mundo.
- **Voz:** ~0,10 €/min (`reference_costes_voz`). Guardarraíles obligatorios:
  1. **Tope de 120 s** por sesión (cliente + `maxDurationSeconds` en el asistente).
  2. **Requiere clic.** Nunca arranca sola, nunca autoplay.
  3. **Dominio restringido** en VAPI a seekialabs.com.
  4. **Interruptor para apagarla** sin tocar el resto de la web.
  - Peor caso realista: ~15 €/mes.
- **Medición:** eventos a n8n → Postgres. Cero cookies, cero coste, cero banner, y encaja con el panel
  que ya existe. Eventos mínimos: visita, prueba de chat iniciada, mensajes enviados, llamada de voz
  iniciada/duración, software elegido en el comprobador, clic en WhatsApp.
  El **software elegido es el dato más valioso de toda la web**: dice qué agendas trae el mercado real
  que llega a SeekIA.

---

## 8. 🔴 Bloqueante abierto

`seekia-web/` **no es un repo git** en el Mac de Julen y no hay otra copia en disco
(`find /Users/julen -name "seekia*"` → solo `seekia-content` y `seekia-web`). La memoria dice
"repositorio GitHub conectado a Vercel con auto-deploy", pero desde esta máquina no se puede publicar.

**Falta saber cómo sube Julen los cambios hoy a seekialabs.com** (¿arrastrar a Vercel? ¿subir por la
web de GitHub? ¿otra cosa?). Sin eso, la fase 1 se construye a ciegas.

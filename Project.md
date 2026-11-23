# UpConta Mx — Contexto general del ecosistema

Documento raíz para desarrolladores y agentes de IA. Describe cómo se relacionan los
proyectos de UpConta México y las reglas que aplican a **todos**. Cada proyecto tiene
además su propio `AGENTS.md` con el detalle técnico.

**Orden de precedencia:** el código manda sobre la documentación; el `AGENTS.md` del
proyecto manda sobre este documento en lo específico de ese proyecto. Si encuentras una
contradicción, corrígela en el mismo PR.

> Idioma: código de dominio, comentarios, mensajes al usuario y documentación en
> **español**. Los tipos de Conventional Commits van en inglés (`feat`, `fix`…).

---

## 1. Visión general

UpConta Mx es una plataforma SaaS modular (TOC Systems) para la gestión administrativa,
tributaria, contable y de nómina de empresas mexicanas: emisión y cancelación de CFDI 4.0,
descarga masiva de CFDI ante el SAT, contabilidad, tesorería, inventarios y generación de
documentos PDF.

## 2. Mapa de proyectos

| Proyecto | Repositorio (`github.com/tocsystems`) | Rol | Stack | Node | Puerto local |
|---|---|---|---|---|---|
| `/api` | `upcontamx.api` | Backend principal: API REST y lógica de negocio | restify 8 + mongoose 6 (MongoDB) | 16 | `3001` |
| `/app` | `upcontamx.app` | Frontend de clientes finales | Next.js 15 (Pages) + antd 5 | 22 | `4000` |
| `/admin` | `upcontamx.admin` | Panel interno de administración (reemplaza al antiguo `app-vue`) | Next.js 16 (Pages) + antd 6 | 24 | `4001` |
| `/utils` | `upcontamx.utils` | Microservicio stateless: XSLT/XSD, procesamiento SAT, lectura de PDFs, scraping DOF | Fastify 5 | 22 | `3005` |
| `/pdf-generator` | `upcontamx.pdf-generator` | Convierte JSON en PDF (SSR + Puppeteer) | Next.js 12 (Pages) | 22 | `2800` |
| `/bot-scrapping` | — | Automatizaciones con el portal del SAT (descargas masivas, cancelaciones) | — | — | — |

- Librería compartida de frontend: **`upconta.frontend-utils`** (paquete npm) — tema, layout,
  hooks de vistas, reglas, filtros y `rewrites`. La usan `/app` y `/admin`; un cambio en ella
  afecta a ambos.
- Usa la versión de Node de cada proyecto (`nvm use` dentro de su carpeta). Las herramientas
  pueden fallar con otra versión (p. ej. ESLint 9 no corre en Node 16).

## 3. Organización local (obligatoria)

Todos los proyectos se clonan como **carpetas hermanas dentro de una misma carpeta raíz**,
junto a este `Project.md`. El nombre de la carpeta raíz y de cada proyecto puede variar entre
colaboradores; lo único que se asume es esa relación de hermanos.

```
<carpeta-raiz>/                 ← repositorio de contexto compartido (ver README.md de la raíz)
  Project.md                    ← este documento
  CLAUDE.md / AGENTS.md         ← cargan este documento en los agentes
  plugins/upconta/              ← skills compartidos (§9)
  api/  app/  admin/  utils/  pdf-generator/  bot-scrapping/   ← repos independientes
```

- Para referirse a otro proyecto (en documentación, prompts o comentarios) se usa la notación
  `/api`, `/app`, `/admin`, `/utils`, `/pdf-generator`, `/bot-scrapping`; nunca una ruta absoluta
  ni personal (`mx/api`, `~/Documentos/...`).
- Desde un proyecto, este documento siempre es `../Project.md`.

## 4. Comunicación entre proyectos

```
          ┌────────── /api/*  (rewrite Next) ──────────┐
 app  ────┤                                            ▼
 admin ───┤                                          api ──── MongoDB
          └────────── /utils/* (rewrite Next) ─┐      │ │ └─── SAT / PAC (SOAP)
                                               ▼      │ └───── pdf-generator  (PDF_GENERATOR_HOST)
                                             utils ◄──┘        (HOST_UPCONTA_UTILS)
```

- Los frontends nunca llaman a hosts absolutos: usan rutas relativas `/api/v3/...` y
  `/utils/...`, que Next reenvía según `NEXT_PUBLIC_API` / `NEXT_PUBLIC_UTILS`.
- `/api` es el único que habla con MongoDB, el SAT y el PAC (SeFactura).
- `/utils` y `/pdf-generator` no tienen base de datos ni autenticación: solo los consume la red interna.

## 5. Infraestructura

- **Base de datos:** MongoDB en DigitalOcean, con *Network Access* restringido a IPs conocidas.
- **Cómputo:** DigitalOcean Kubernetes (node pool de 5 nodos). Imágenes Docker publicadas en
  GHCR (`ghcr.io/tocsystems/...`) mediante GitHub Actions.
- **Red:** VPC, Cloud NAT y un Load Balancer por el que entra y sale toda petición. Timeouts de
  hasta **5 minutos** para procesos pesados (scraping, reportes masivos): los procesos largos
  deben responder rápido y continuar en segundo plano o procesarse por lotes.
- **Monitoreo:** Prometheus en el mismo clúster; acceso local por `kubectl port-forward`.

## 6. Reglas transversales (aplican a todos los proyectos)

### 6.1 Datos y entornos
- **Regla de oro:** nunca conectarse a bases de datos de producción o en la nube para pruebas
  ni para "entender el código". Usar solo la base local de pruebas (ver `AGENTS.md` de `/api`).
- Nunca hardcodear credenciales del SAT, tokens del PAC, llaves privadas ni cadenas de conexión
  reales. Configuración siempre por variables de entorno con un valor por defecto de
  desarrollo/pruebas. Los valores por defecto que hay hoy en el código son de pruebas.
- En frontends, las variables `NEXT_PUBLIC_*` se incrustan en el bundle: nunca secretos ahí.
- Certificados (CSD / e.firma): el contenido de la `.key` y su contraseña nunca se registra en
  logs, se devuelve en respuestas ni se guarda en texto plano.

### 6.2 Contratos entre proyectos
- No cambiar la ruta, método, campos del body o forma de respuesta de un endpoint sin actualizar
  a sus consumidores (`/app`, `/admin`, `/utils`, `/pdf-generator`, `/bot-scrapping`) en PRs
  coordinados. Preferir agregar campos o endpoints nuevos antes que modificar los existentes.
- Componentes o hooks útiles para más de un frontend van a `upconta.frontend-utils`.

### 6.3 Negocio y dominio
- **Multiempresa:** toda operación de `/api` se filtra por la empresa del token; nunca se confía en
  un `business` enviado por el cliente.
- **Terminología mexicana** en la interfaz: RFC, CFDI, timbres, persona física/moral, pesos MXN.
- Todo documento de negocio lleva bitácora (`_movements`) de quién y cuándo lo creó o modificó.

### 6.4 Calidad
- Antes de abrir un PR: verificación de tipos y lint del proyecto sin errores (ver la sección de
  comandos de su `AGENTS.md`).
- Revisión de PR: integridad de la red y de los contratos, manejo de errores, reutilización de
  código existente, nombres descriptivos, funciones con una sola responsabilidad e impacto
  cruzado en los demás proyectos.
- Antes de modificar un componente o función compartida, buscar todos sus usos.

## 7. Reglas semánticas de código (comunes)

Aplican a todo proyecto; cada `AGENTS.md` puede agregar reglas propias (p. ej. lo que exige su ESLint).

- **Imports** al inicio del archivo, ordenados del más corto al más largo (por longitud de línea).
- **Nombres descriptivos** de su acción, en español y camelCase: una función que suma dos números
  se llama `sumaDeDosNumeros`.
- **MAYÚSCULAS con guion bajo** solo para variables de entorno exportadas
  (`export const DEVELOPMENT_ENV = process.env.DEVELOPMENT_ENV || false`), declaradas al inicio
  del archivo de configuración del proyecto.
- Todo archivo `.ts`, `.tsx`, `.js` o `.yml` termina con un salto de línea.

## 8. Git y commits

- Ramas: `feature/...` o `fix/...` → PR a `develop` → PR a `main` (producción). Ver la rama
  por defecto de cada repositorio.
- **Conventional Commits**: `tipo(alcance): resumen en español, en imperativo` y cuerpo que
  explique el cambio:
  ```
  fix(subscriptions): corrige el cálculo de planes adicionales

  Problema: el importe de los adicionales en % se calculaba sobre el total con IVA.
  Solución: el porcentaje se aplica sobre el precio del plan antes de impuestos.
  Cambios:
  - types/Suscripcion.ts: calcularImportes usa el subtotal del plan.
  ```
  Para `feat`/`refactor`/`chore`, el cuerpo usa `Objetivo:` y `Cambios:`.
- No subir archivos generados ni de entorno local (`.env.local`, `build/`, `.next/`).

## 9. Skills compartidos para agentes

Los skills del equipo están en el plugin `plugins/upconta` de la carpeta raíz (instalación en
`README.md` de la raíz):

| Skill | Uso |
|---|---|
| `/upconta:revisar-codigo [staged \| rama \| archivos]` | Revisión de cambios con las reglas de este documento y del `AGENTS.md` del proyecto |
| `/upconta:commit [pista]` | Genera y crea el commit con el formato de §8 |

El plugin incluye un hook que rechaza los `git commit` de un agente que no cumplan el formato.
Skills nuevos: se agregan en `plugins/upconta/skills/<nombre>/SKILL.md` y se incrementa la
`version` de `plugins/upconta/.claude-plugin/plugin.json`.

## 10. Mantenimiento de este documento

- Si cambias algo que afecta a más de un proyecto (puertos, hosts, contratos, reglas comunes),
  actualiza este documento en el mismo PR.
- Lo específico de un proyecto va en su `AGENTS.md`, no aquí.

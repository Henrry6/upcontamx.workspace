---
name: revisar-codigo
description: Revisa los cambios de código de cualquier proyecto de UpConta Mx (/api, /app, /admin, /utils, /pdf-generator) contra las reglas del equipo en Project.md y el AGENTS.md del proyecto. Usar cuando el usuario pida revisar cambios, un diff, una rama o un PR, o antes de abrir un PR.
argument-hint: "[rama base | archivos | 'staged']"
---

# Revisión de código — UpConta Mx

Revisa cambios buscando **errores reales y violaciones de las reglas del equipo**. No
modifiques código: solo reporta. Responde en español.

## 1. Determinar qué revisar

Según `$ARGUMENTS`:
- vacío → cambios sin commitear: `git diff HEAD` (y `git status` para archivos nuevos).
  Si no hay cambios, la rama actual contra su base: `git diff develop...HEAD`
  (o `main` si no existe `develop`).
- `staged` → `git diff --staged`.
- nombre de rama → `git diff <rama>...HEAD`.
- rutas de archivos → solo esos archivos (`git diff HEAD -- <rutas>`).

Si el diff es muy grande, prioriza lógica de negocio, seguridad y contratos sobre estilo.

## 2. Cargar las reglas

1. `../Project.md` (reglas comunes; está en la carpeta raíz, hermana del proyecto).
2. `AGENTS.md` del proyecto actual (raíz del repositorio).
Las reglas del `AGENTS.md` del proyecto mandan en lo específico.

Lee el código alrededor de cada cambio (no solo el diff) antes de concluir algo.

## 3. Qué revisar

**Correctitud**
- Lógica rota, casos borde (null/undefined, listas vacías, fechas, redondeos de montos).
- Llamadas async sin `await`, errores sin `try/catch`, loaders sin `finally`.
- En `/api`: `next()` llamado más de una vez, sesiones de MongoDB sin cerrar.

**Seguridad y datos**
- Consultas de `/api` sin filtrar por `business` del token, o confiando en un `business` del cliente.
- Secretos, llaves o contraseñas en código, logs, respuestas o `NEXT_PUBLIC_*`.
- Conexiones a bases de datos de producción.

**Contratos entre proyectos**
- Cambios de ruta, método, body o respuesta de un endpoint: busca sus consumidores en los
  proyectos hermanos (`/app`, `/admin`, `/utils`, `/pdf-generator`; están en la carpeta padre `..`,
  pero el nombre de cada carpeta puede variar: lista `..` para ubicarlos) y verifica que
  estén actualizados.
- Cambios a componentes o funciones compartidas: busca todos sus usos.

**Reglas del equipo** (Project.md §6–7 y AGENTS.md del proyecto)
- Reutilización: ¿ya existe un helper o componente que lo resuelve?
- Bitácora `_movements` en registros que se crean o modifican.
- Terminología mexicana (RFC, CFDI…), textos en español.
- Imports ordenados del más corto al más largo, nombres descriptivos en camelCase,
  MAYÚSCULAS solo para variables de entorno, salto de línea al final del archivo.
- Reglas propias del proyecto (p. ej. responsive y antd 6 en `/admin`, `lanzarBloqueo` y
  transacciones en `/api`).

**Verificación automática**: si el proyecto tiene comandos de tipos/lint en su `AGENTS.md`,
ejecútalos y reporta los errores que correspondan a los archivos cambiados.

## 4. Verificar antes de reportar

Para cada hallazgo, confirma con el código que el problema existe (no lo supongas por el
nombre de una función). Descarta lo que no puedas sostener con una línea concreta.

## 5. Formato de la respuesta

```
## Revisión: <qué se revisó> (<N> archivos)

### 🔴 Bloqueantes
- `ruta/archivo.ts:42` — <problema>. **Escenario:** <entrada/estado → resultado incorrecto>.
  **Sugerencia:** <cómo corregirlo>.

### 🟡 Importantes
- ...

### 🔵 Sugerencias (estilo, reutilización)
- ...

### Verificación
- tsc / lint: <resultado>

**Veredicto:** listo para PR | corregir bloqueantes antes del PR
```

Omite las secciones vacías. Si no hay hallazgos, dilo en una línea con lo que verificaste.

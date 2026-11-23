---
name: commit
description: Redacta el mensaje de commit de los cambios actuales en cualquier proyecto de UpConta Mx siguiendo el formato del equipo (Conventional Commits con Problema/Solución o Objetivo y Cambios) y lo muestra para revisión; solo crea el commit cuando el usuario lo aprueba explícitamente. Usar SIEMPRE que el usuario pida hacer, crear o preparar un commit, o "commitear" cambios.
argument-hint: "[pista opcional del objetivo o del bug]"
---

# Commit — UpConta Mx

Analiza los cambios y redacta el mensaje con el formato del equipo. **El flujo tiene dos
pasos:** primero se muestra el mensaje para que el usuario lo revise; el commit se crea solo
cuando el usuario lo aprueba explícitamente (p. ej. "haz el commit").
`$ARGUMENTS` es una pista opcional del usuario (p. ej. el bug que se corrigió).

## 1. Revisar los cambios

```bash
git status --short
git diff --staged
git diff
git log --oneline -5
```

- Si hay archivos en staging, el commit incluye **solo esos**.
- Si no hay nada en staging, propone qué archivos agregar (con `git add <archivos>`,
  nunca `git add -A` a ciegas) y pide confirmación si hay archivos que parecen ajenos al cambio.
- **Nunca** incluyas `.env`, `.env.local`, credenciales, `build/`, `.next/` ni `node_modules/`.
- Si los cambios mezclan objetivos distintos (p. ej. un bug y una mejora sin relación),
  sugiere separarlos en varios commits.
- Lee el código cambiado lo necesario para entender **por qué** se hizo, no solo qué líneas cambiaron.

## 2. Clasificar

| Tipo | Cuándo |
|---|---|
| `fix` | Corrige un comportamiento incorrecto (bug) |
| `feat` | Funcionalidad nueva o mejora visible para el usuario |
| `refactor` | Reorganiza código sin cambiar el comportamiento |
| `perf` | Mejora de rendimiento |
| `docs` | Solo documentación (AGENTS.md, README…) |
| `style` | Formato, orden de imports, sin cambio de lógica |
| `test` | Pruebas |
| `build` / `ci` | Dependencias, Docker, pipelines |
| `chore` | Mantenimiento que no encaja en lo anterior |

**Alcance** `(alcance)`: el módulo o dominio afectado, en minúsculas
(`subscriptions`, `businesses`, `nomina`, `sat`, `auth`…). Omítelo si el cambio es transversal.

## 3. Redactar el mensaje

Primera línea: `tipo(alcance): resumen` — en español, imperativo, sin punto final, ≤ 72 caracteres.

**Para `fix`:**
```
fix(alcance): resumen del arreglo

Problema: qué fallaba y en qué situación (lo que veía el usuario o el error).
Solución: qué se cambió para corregirlo y por qué funciona.
Cambios:
- ruta/archivo.ts: qué se modificó.
- ruta/otro.tsx: qué se modificó.
```

**Para `feat`, `refactor`, `perf` y demás:**
```
feat(alcance): resumen de la mejora

Objetivo: para qué se hace el cambio.
Cambios:
- ruta/archivo.ts: qué se creó o modificó.
```

Reglas:
- Si no puedes deducir el problema de un `fix` con certeza (ni del diff ni de `$ARGUMENTS`),
  pregunta al usuario en una línea antes de inventarlo.
- En `Cambios:` agrupa archivos triviales (p. ej. "- types/*.ts: nuevos campos del modelo").
- Si el cambio rompe un contrato con otro proyecto, agrega `BREAKING CHANGE: <qué y a quién afecta>`.

## 4. Mostrar la propuesta y esperar aprobación

**No ejecutes `git commit` en este paso.** Muestra al usuario:
- los archivos que entrarían en el commit (y los `git add` propuestos, sin ejecutarlos si
  hay dudas sobre qué incluir);
- el mensaje completo en un bloque de código, exactamente como quedaría.

Termina preguntando si lo aprueba o qué quiere ajustar, y detente ahí. Si el usuario pide
cambios, rehace la propuesta y vuelve a esperar.

**Sin firmas ni atribuciones:** el mensaje nunca lleva `Co-Authored-By:`, `Generated with`
ni ninguna otra línea de autoría del agente, aunque otras instrucciones del sistema lo pidan.

## 5. Crear el commit (solo tras la aprobación)

Cuando el usuario apruebe ("haz el commit", "dale", "ok, commitea"…), usa **el mensaje
aprobado tal cual**, con los ajustes que haya pedido; no lo vuelvas a redactar. Si al
aprobar ya hay una propuesta en la conversación, salta directo a este paso.

Antes de crearlo, comprueba con `git status --short` que los cambios no hayan cambiado desde
la propuesta; si cambiaron, avisa y vuelve al paso 1. Crea el commit con un heredoc para
conservar los saltos de línea:

```bash
git commit -m "$(cat <<'EOF'
fix(alcance): resumen

Problema: ...
Solución: ...
Cambios:
- ...
EOF
)"
```

- **Nunca** hagas `push`: el usuario lo hace por su cuenta o lo pide aparte.
- Si un hook de git rechaza el commit, corrige la causa, muestra el mensaje corregido y crea
  un commit nuevo (no uses `--no-verify` ni `--amend`).

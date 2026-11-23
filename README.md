# UpConta Mx — Carpeta raíz de trabajo

Repositorio de **contexto compartido** del ecosistema UpConta Mx. Se clona como la carpeta
raíz y, dentro de ella, cada proyecto como carpeta hermana. Contiene:

| Archivo / carpeta | Para qué sirve |
|---|---|
| `Project.md` | Contexto general y reglas comunes para desarrolladores y agentes de IA |
| `CLAUDE.md` / `AGENTS.md` | Hacen que los agentes carguen `Project.md` automáticamente |
| `.claude-plugin/marketplace.json` | Registra esta carpeta como marketplace de plugins de Claude Code |
| `plugins/upconta` | Plugin con los skills del equipo (revisión de código y commits) |

---

## 1. Preparar la carpeta (una sola vez)

```bash
git clone git@github.com:tocsystems/<este-repositorio>.git upconta-mx   # el nombre es libre
cd upconta-mx
git clone git@github.com:tocsystems/upcontamx.api.git api
git clone git@github.com:tocsystems/upcontamx.app.git app
git clone git@github.com:tocsystems/upcontamx.admin.git admin
git clone git@github.com:tocsystems/upcontamx.utils.git utils
git clone git@github.com:tocsystems/upcontamx.pdf-generator.git pdf-generator
```

Los proyectos son repositorios independientes; el `.gitignore` de la raíz los excluye.

## 2. Instalar los skills (una sola vez)

Desde la carpeta raíz:

```bash
claude plugin marketplace add ./
claude plugin install upconta@upcontamx --scope user
```

Con `--scope user` el plugin queda disponible en **todos** los proyectos y también en la
extensión de Claude Code para VS Code. Reinicia Claude después de instalar.

**Recomendado:** desactiva la firma automática de Claude en commits y PRs agregando esto a
`~/.claude/settings.json` (el hook del plugin rechaza los commits que la traigan):

```json
{
  "attribution": { "commit": "", "pr": "" }
}
```

Para comprobar la instalación, escribe `/upconta` en Claude: deben aparecer
`upconta:commit` y `upconta:revisar-codigo`.

## 3. Dónde ejecutar Claude

Los skills trabajan con git, y la carpeta raíz no contiene los repositorios de los proyectos.
Abre Claude **dentro del proyecto** en el que trabajas:

```bash
cd api && claude
```

Así también carga el `AGENTS.md` de ese proyecto. Funciona igual en la consola, en la
terminal integrada de VS Code o en el panel de la extensión de Claude Code.

---

## 4. Skill `/upconta:commit`

Redacta el mensaje de commit con el formato del equipo (`Project.md` §8) y **solo crea el
commit cuando tú lo apruebas**. Nunca hace `push`.

### Flujo

1. Pide el commit:
   ```
   /upconta:commit
   /upconta:commit corrige el cálculo del IVA en adicionales     ← pista opcional del porqué
   ```
   También se activa si escribes "prepara el commit" o "haz un commit de esto".
2. Claude revisa los cambios y te muestra:
   - los archivos que entrarían (si no hay nada en staging, propone cuáles agregar);
   - el mensaje completo, tal como quedaría.

   **Aquí se detiene. No crea el commit.**
3. Revisa el texto. Si quieres cambios, pídelos ("cambia el alcance a `sat`", "quita la
   línea de types") y te muestra la nueva propuesta.
4. Cuando estés conforme, escribe **"haz el commit"**. Claude lo crea con el texto aprobado,
   sin volver a redactarlo.
5. El `push` lo haces tú (o se lo pides aparte).

### Formato que genera

```
fix(subscriptions): corrige el cálculo de planes adicionales

Problema: el importe de los adicionales en % se calculaba sobre el total con IVA.
Solución: el porcentaje se aplica sobre el precio del plan antes de impuestos.
Cambios:
- types/Suscripcion.ts: calcularImportes usa el subtotal del plan.
```

- `fix` → `Problema:`, `Solución:` y `Cambios:`.
- `feat`, `refactor`, `docs`, `chore`… → `Objetivo:` y `Cambios:`.
- Sin `Co-Authored-By` ni otras firmas del agente.
- Nunca incluye `.env`, credenciales, `build/`, `.next/` ni `node_modules/`.
- Si el cambio de un `fix` no es claro, te pregunta el problema antes de inventarlo.

## 5. Skill `/upconta:revisar-codigo`

Revisa los cambios contra `Project.md` y el `AGENTS.md` del proyecto. **Solo reporta**, no
modifica código.

| Comando | Qué revisa |
|---|---|
| `/upconta:revisar-codigo` | Cambios sin commitear (si no hay, la rama contra `develop`) |
| `/upconta:revisar-codigo staged` | Solo lo que está en staging |
| `/upconta:revisar-codigo develop` | La rama actual contra la rama indicada |
| `/upconta:revisar-codigo src/a.ts src/b.tsx` | Solo esos archivos |

También se activa si escribes "revisa mis cambios". Úsalo antes de abrir un PR.

## 6. Hook de validación de commits

El plugin incluye un hook que se ejecuta antes de cada comando de Claude y **rechaza los
`git commit -m`** cuyo mensaje:

- no tenga el encabezado `tipo(alcance): resumen`;
- no tenga `Cambios:`, ni `Objetivo:` (o `Problema:` y `Solución:` en un `fix`);
- lleve `Co-Authored-By` o `Generated with`.

Solo afecta a los commits que crea Claude; los que haces tú en la terminal no pasan por él.

---

## 7. Actualizar los skills

```bash
git pull                                       # en la carpeta raíz
claude plugin marketplace update upcontamx
```

Después, reinicia Claude.

## 8. Agregar o modificar un skill

```
plugins/upconta/
  .claude-plugin/plugin.json      ← nombre y versión del plugin
  hooks/hooks.json                ← registro de hooks
  scripts/validar-commit.js       ← validación de commits
  skills/<nombre>/SKILL.md        ← un skill por carpeta
```

1. Crea o edita `plugins/upconta/skills/<nombre>/SKILL.md` (frontmatter con `name`,
   `description` y, opcional, `argument-hint`).
2. Incrementa la `version` en `plugins/upconta/.claude-plugin/plugin.json`.
3. Prueba en local con `claude plugin marketplace update upcontamx` y reinicia Claude.
4. Sube el cambio con un PR a este repositorio.

## 9. Problemas comunes

| Síntoma | Solución |
|---|---|
| No aparece `/upconta:...` | Revisa `claude plugin list`; reinstala (§2) y reinicia Claude. En VS Code: `Ctrl+Shift+P` → *Reload Window* |
| "no es un repositorio git" | Abriste Claude en la carpeta raíz; entra al proyecto (§3) |
| El hook bloquea el commit | Lee el motivo; pide a Claude que corrija el mensaje con `/upconta:commit` |
| Sigue apareciendo `Co-Authored-By` | Agrega `attribution` a `~/.claude/settings.json` (§2) y reinicia |
| Los cambios del skill no se reflejan | `claude plugin marketplace update upcontamx` y reinicia Claude |

## 10. Otros agentes

Codex, Cursor y otros agentes no leen plugins de Claude Code, pero pueden seguir
`plugins/upconta/skills/*/SKILL.md` como instrucciones si se los indicas.

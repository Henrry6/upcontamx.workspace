// Hook PreToolUse (Bash): valida el formato de los commits que crea un agente.
// Si el mensaje no sigue el formato del equipo, bloquea el comando y le indica
// al agente que use el skill /upconta:commit. Comandos que no son commits pasan.

const tiposValidos =
  'feat|fix|refactor|perf|docs|style|test|build|ci|chore|revert'
// El encabezado puede ir al inicio de una línea (heredoc) o tras la comilla de -m
const patronEncabezado = new RegExp(
  `(^|["'])(${tiposValidos})(\\([\\w./-]+\\))?!?: \\S`,
  'm'
)

const leerEntrada = () =>
  new Promise((resolver) => {
    let datos = ''
    process.stdin.on('data', (parte) => (datos += parte))
    process.stdin.on('end', () => resolver(datos))
  })

const bloquear = (motivo) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `${motivo} Usa el skill /upconta:commit para generar el mensaje ` +
          'con el formato del equipo (ver Project.md §8).',
      },
    })
  )
  process.exit(0)
}

const validarComando = (comando) => {
  if (!/\bgit\b[^|;&]*\bcommit\b/.test(comando)) return
  // Sin mensaje en línea (editor, -F archivo, --amend sin editar): no se valida
  const tieneMensaje = /\s(-m|--message)[\s=]|\s-[a-zA-Z]*m\s/.test(comando)
  if (!tieneMensaje || /--no-edit|\s(-F|--file)[\s=]/.test(comando)) return

  if (/Co-Authored-By:|Generated with/i.test(comando))
    bloquear(
      'El mensaje no debe llevar líneas de atribución del agente ' +
        '(Co-Authored-By, Generated with…).'
    )
  if (!patronEncabezado.test(comando))
    bloquear(
      'El commit no tiene un encabezado Conventional Commits ' +
        '(`tipo(alcance): resumen`).'
    )
  if (!/Cambios:/.test(comando))
    bloquear('El cuerpo del commit no tiene la sección "Cambios:".')

  const esFix = new RegExp(`(^|["'])fix(\\([\\w./-]+\\))?!?:`, 'm').test(comando)
  if (esFix && !(/Problema:/.test(comando) && /Soluci[oó]n:/.test(comando)))
    bloquear('Un commit `fix` debe incluir "Problema:" y "Solución:".')
  if (!esFix && !/Objetivo:/.test(comando))
    bloquear('El cuerpo del commit no tiene la sección "Objetivo:".')
}

leerEntrada()
  .then((datos) => {
    const entrada = JSON.parse(datos || '{}')
    if (entrada.tool_name === 'Bash')
      validarComando(entrada.tool_input?.command || '')
  })
  // Un fallo del hook nunca debe impedir trabajar
  .catch(() => process.exit(0))

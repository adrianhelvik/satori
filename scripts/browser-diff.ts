import { execSync } from 'child_process'

const args = process.argv.slice(2)

let file = ''
let grep = ''
let threshold = '0.1'

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--grep' && args[i + 1]) {
    grep = args[++i]
  } else if (args[i] === '--threshold' && args[i + 1]) {
    threshold = args[++i]
  } else if (!args[i].startsWith('--')) {
    file = args[i]
  }
}

const cmd = [
  'npx vitest run',
  '--config vitest.browser-diff.config.ts',
  file,
  grep ? `--testNamePattern "${grep}"` : '',
]
  .filter(Boolean)
  .join(' ')

console.log(`Running: ${cmd}`)
console.log(`Threshold: ${threshold}\n`)

try {
  execSync(cmd, {
    stdio: 'inherit',
    env: { ...process.env, BROWSER_DIFF_THRESHOLD: threshold },
  })
} catch {
  // vitest may exit non-zero if tests fail — that's fine for diffing
  process.exit(0)
}

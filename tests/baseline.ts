// Gera tests/__snapshots__/baseline.json. Rodado UMA vez, ANTES da alteração, para congelar o comportamento legado.
import { writeFileSync } from 'fs'
import { join } from 'path'
import { captureAll } from './capture'

captureAll().then(out => {
  writeFileSync(join(__dirname, '__snapshots__', 'baseline.json'), JSON.stringify(out, null, 2) + '\n')
  console.log(`baseline: ${Object.keys(out).length} snapshots`)
  process.exit(0)
}).catch(e => { console.error(e); process.exit(1) })

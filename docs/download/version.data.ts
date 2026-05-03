import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
  load() {
    const content = readFileSync(resolve(__dirname, '../changelog/index.md'), 'utf-8')
    const match = content.match(/^## v([\w.-]+)/m)
    const version = match ? match[1] : null
    return {
      version,
      downloadUrl: version
        ? `https://github.com/huanfeng/WindInput/releases/download/v${version}/WindInput-${version}-Setup.exe`
        : null,
    }
  }
}

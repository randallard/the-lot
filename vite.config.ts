import { mkdir, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Dev only: the voice test (#voice-test) POSTs its results here so a run on the phone lands in
// ~/Downloads on the dev machine. The file name is made here, never taken from the request.
const saveVoiceResults = (): Plugin => ({
  name: 'save-voice-results',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/__voice-results', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
      const chunks: Buffer[] = []
      let size = 0
      req.on('data', (c: Buffer) => { size += c.length; if (size <= 5_000_000) chunks.push(c) })
      req.on('end', () => {
        void (async () => {
          try {
            if (size > 5_000_000) throw new Error('too large')
            const body = Buffer.concat(chunks).toString('utf8')
            if ((JSON.parse(body) as { format?: unknown }).format !== 'voice-test') throw new Error('not voice-test results')
            const dir = join(homedir(), 'Downloads')
            await mkdir(dir, { recursive: true })
            const path = join(dir, `voice-test-${new Date().toISOString().slice(0, 19).replace(/:/g, '')}.json`)
            await writeFile(path, body)
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ path }))
          } catch (e) {
            res.statusCode = 400
            res.end(String(e))
          }
        })()
      })
    })
  },
})

// https://vite.dev/config/
// `.ts.net`: the phone reaches the dev server through Tailscale Serve
// (`tailscale serve --bg http://localhost:5173`), whose real certificate is the secure origin the
// voice test's microphone needs. Vite blocks host names it doesn't know; this allows the tailnet's.
export default defineConfig({
  plugins: [react(), saveVoiceResults()],
  server: { allowedHosts: ['.ts.net'] },
})

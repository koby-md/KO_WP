console.log('✅ Iniciando...')

import { join, dirname } from 'path'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { setupMaster, fork } from 'cluster'
import { watchFile, unwatchFile } from 'fs'
import cfonts from 'cfonts'
import { createInterface } from 'readline'
import yargs from 'yargs'
import express from 'express'
import chalk from 'chalk'
import os from 'os'
import { promises as fsPromises } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(__dirname)

const { say } = cfonts

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})

const app = express()
const port = process.env.PORT || 8080

// ===============================
// 🎨 BANNER
// ===============================

say('Senna FG98', {
  font: 'pallet',
  align: 'center',
  gradient: ['red', 'magenta']
})

say('senna-bot By FG Ig: @fg.error', {
  font: 'console',
  align: 'center',
  gradient: ['cyan', 'magenta']
})

// ===============================
// 🌐 EXPRESS SERVER
// ===============================

app.listen(port, () => {
  console.log(
    chalk.green(`🌐 Puerto ${port} está abierto`)
  )
})

// ===============================
// ⚙️ ESTADO
// ===============================

let isRunning = false
let isRestarting = false

// مهم:
// باش ما نعاودوش نسجلو watchFile أكثر من مرة
let fileWatching = false

// باش ما نعاودوش start() فوق بعضياتهم
let startLock = false

// ===============================
// 🚀 START
// ===============================

async function start(file) {

  // منع تشغيل أكثر من process في نفس الوقت
  if (isRunning || startLock) {
    console.log(
      chalk.yellow('⚠️ El proceso ya está ejecutándose...')
    )
    return
  }

  startLock = true
  isRunning = true

  const args = [
    join(__dirname, file),
    ...process.argv.slice(2)
  ]

  say([process.argv[0], ...args].join(' '), {
    font: 'console',
    align: 'center',
    gradient: ['red', 'magenta']
  })

  // ===============================
  // CLUSTER
  // ===============================

  setupMaster({
    exec: args[0],
    args: args.slice(1)
  })

  const p = fork()

  // بعدما يتخلق process
  startLock = false

  // ===============================
  // 📩 رسائل من PROCESS CHILD
  // ===============================

  p.on('message', data => {

    console.log('[RECEIVED]', data)

    switch (data) {

      case 'reset':

        if (isRestarting) return

        isRestarting = true

        try {
          p.process.kill()
        } catch {}

        break

      case 'uptime':

        try {
          p.send(process.uptime())
        } catch {}

        break
    }
  })

  // ===============================
  // ❌ PROCESS EXIT
  // ===============================

  p.once('exit', code => {

    isRunning = false

    // -------------------------------
    // 🔄 RESTART MANUAL
    // -------------------------------

    if (isRestarting) {

      console.log(
        chalk.yellow(
          '🔄 Reinicio manual detectado...'
        )
      )

      isRestarting = false

      // تأخير صغير باش القديم يسالي مزيان
      setTimeout(() => {
        start(file)
      }, 500)

      return
    }

    // -------------------------------
    // ❌ PROCESS CRASH
    // -------------------------------

    console.error(
      chalk.red(`❎ Proceso terminado. Código: ${code}`)
    )

    // -------------------------------
    // 👀 WATCH FILE
    // -------------------------------

    if (code !== 0) {

      // منع تسجيل watcher جديد
      if (fileWatching) {

        console.log(
          chalk.yellow(
            '⚠️ Ya existe un watcher activo.'
          )
        )

        return
      }

      fileWatching = true

      console.log(
        chalk.yellow(
          `👀 Esperando cambios en ${file}...`
        )
      )

      const filePath = args[0]

      const restartOnChange = () => {

        // إزالة watcher مباشرة
        try {
          unwatchFile(filePath, restartOnChange)
        } catch {}

        fileWatching = false

        console.log(
          chalk.blue(
            `♻ Archivo actualizado, reiniciando...`
          )
        )

        setTimeout(() => {
          start(file)
        }, 500)
      }

      watchFile(
        filePath,
        {
          interval: 1000
        },
        restartOnChange
      )
    }
  })

  // ===============================
  // 🖥 INFO SYSTEM
  // ===============================

  console.log(
    chalk.yellow(
      `🖥️ ${os.type()}, ${os.release()} - ${os.arch()}`
    )
  )

  console.log(
    chalk.yellow(
      `💾 RAM Total: ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`
    )
  )

  console.log(
    chalk.yellow(
      `💽 RAM Libre: ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`
    )
  )

  // ===============================
  // 📦 PACKAGE.JSON
  // ===============================

  try {

    const packageJsonData =
      await fsPromises.readFile(
        join(__dirname, 'package.json'),
        'utf-8'
      )

    const packageJsonObj =
      JSON.parse(packageJsonData)

    console.log(
      chalk.blue.bold(
        '\n📦 Información del Paquete'
      )
    )

    console.log(
      chalk.cyan(
        `Nombre: ${packageJsonObj.name}`
      )
    )

    console.log(
      chalk.cyan(
        `Versión: ${packageJsonObj.version}`
      )
    )

    console.log(
      chalk.cyan(
        `Autor: ${packageJsonObj.author?.name || 'No definido'}`
      )
    )

  } catch (err) {

    console.error(
      chalk.red(
        '❌ No se pudo leer package.json'
      )
    )
  }

  // ===============================
  // ⏰ HORA
  // ===============================

  console.log(
    chalk.blue.bold(
      '\n⏰ Hora Actual'
    )
  )

  console.log(
    chalk.cyan(
      new Date().toLocaleString(
        'es-ES',
        {
          timeZone:
            'America/Argentina/Buenos_Aires'
        }
      )
    )
  )

  // ===============================
  // ⏱️ KEEP ALIVE
  // ===============================

  setInterval(() => {}, 1000)

  // ===============================
  // 🖥️ CONSOLA
  // ===============================

  const opts = new Object(
    yargs(process.argv.slice(2))
      .exitProcess(false)
      .parse()
  )

  if (!opts['test']) {

    if (!rl.listenerCount('line')) {

      rl.on('line', line => {

        const text = line.trim()

        if (!text) return

        try {
          p.emit('message', text)
        } catch (e) {
          console.error(
            chalk.red(
              '❌ Error enviando mensaje al proceso:',
              e
            )
          )
        }
      })
    }
  }
}

// ===============================
// 🤖 START BOT
// ===============================

start('main.js')
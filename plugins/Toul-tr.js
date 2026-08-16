import translate from 'translate-google-api'
import googleTTS from 'google-tts-api'
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'
import axios from 'axios'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'

const execFileAsync = promisify(execFile)

const handler = async (m, { conn, args, usedPrefix, command }) => {
  let fullText = args.join(' ').trim()

  // دعم الترجمة من رسالة مقتبس منها
  if (!fullText && m.quoted && m.quoted.text) {
    fullText = m.quoted.text
  }

  if (!fullText) {
    return m.reply(
      `*🧶 الترجمة + النطق 🧶*\n\n` +
      `اكتب النص المراد ترجمته.\n\n` +
      `*مثال:*\n${usedPrefix + command} hello\n\n` +
      `أو حدد اللغة مباشرة:\n${usedPrefix + command} ar hello`
    )
  }

  const firstWord = args[0] ? args[0].toLowerCase() : ''
  const isLangCode = /^[a-z]{2}$/i.test(firstWord)

  // ==========================================
  // إذا تم تحديد اللغة مباشرة
  // مثال: .tr ar hello
  // ==========================================
  if (isLangCode && args.length > 1) {
    const targetLang = firstWord
    const textToTranslate = args.slice(1).join(' ')

    let inputFile
    let outputFile

    try {
      await m.react('⏳')

      // الترجمة
      const result = await translate(textToTranslate, {
        to: targetLang
      })

      const translatedText = Array.isArray(result)
        ? result[0]
        : result

      if (!translatedText) {
        throw new Error('Translation returned empty result')
      }

      // إرسال النص المترجم
      await m.reply(translatedText)

      // ==========================================
      // إنشاء رابط الصوت
      // ==========================================
      const audioUrl = googleTTS.getAudioUrl(translatedText, {
        lang: targetLang,
        slow: false,
        host: 'https://translate.google.com'
      })

      // ==========================================
      // تحميل MP3
      // ==========================================
      const id = Date.now()

      inputFile = path.join(os.tmpdir(), `tts-${id}.mp3`)
      outputFile = path.join(os.tmpdir(), `tts-${id}.ogg`)

      const response = await axios.get(audioUrl, {
        responseType: 'arraybuffer'
      })

      await fs.writeFile(
        inputFile,
        Buffer.from(response.data)
      )

      // ==========================================
      // تحويل MP3 -> OGG/Opus
      // ==========================================
      await execFileAsync('ffmpeg', [
        '-y',
        '-i', inputFile,
        '-vn',
        '-c:a', 'libopus',
        '-b:a', '64k',
        '-vbr', 'on',
        outputFile
      ])

      const audio = await fs.readFile(outputFile)

      // ==========================================
      // إرسال كـ Voice Note / PTT
      // ==========================================
      await conn.sendMessage(
        m.chat,
        {
          audio,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true
        },
        {
          quoted: m
        }
      )

      await m.react('✅')

    } catch (error) {
      console.error('Translation/TTS Error:', error)

      await m.react('❌')

      await m.reply(
        '❌ حدث خطأ أثناء الترجمة أو إنشاء الصوت.'
      )

    } finally {
      // حذف الملفات المؤقتة
      if (inputFile) {
        await fs.unlink(inputFile).catch(() => {})
      }

      if (outputFile) {
        await fs.unlink(outputFile).catch(() => {})
      }
    }

    return
  }

  // ==========================================
  // إذا لم يتم تحديد اللغة -> الأزرار
  // ==========================================

  const textToTranslate = fullText

  try {
    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              body: {
                text:
                  `📝 *النص المراد ترجمته:*\n\n` +
                  `"${textToTranslate}"\n\n` +
                  `🌐 اختر اللغة التي تريد الترجمة إليها:`
              },

              footer: {
                text: 'بوت الترجمة والنطق 🌐🔊'
              },

              nativeFlowMessage: {
                buttons: [

                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: '🇲🇦 العربية',
                      id: `${usedPrefix + command} ar ${textToTranslate}`
                    })
                  },

                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: '🇬🇧 الإنجليزية',
                      id: `${usedPrefix + command} en ${textToTranslate}`
                    })
                  },

                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: '🇫🇷 الفرنسية',
                      id: `${usedPrefix + command} fr ${textToTranslate}`
                    })
                  },

                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: '🇩🇪 الألمانية',
                      id: `${usedPrefix + command} de ${textToTranslate}`
                    })
                  }

                ]
              }
            }
          }
        }
      },
      {
        userJid: conn.user.jid,
        quoted: m
      }
    )

    await conn.relayMessage(
      m.chat,
      msg.message,
      {
        messageId: msg.key.id
      }
    )

  } catch (error) {
    console.error('Button Error:', error)

    await m.reply(
      '❌ فشل إرسال أزرار الترجمة.'
    )
  }
}

handler.command = ['tr']
handler.tags = ['tools']

export default handler
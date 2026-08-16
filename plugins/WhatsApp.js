import fs from 'fs'
import path from 'path'

// ======================================================
// كود boton.js الذي سيتم إنشاؤه تلقائياً
// ======================================================

const BOTON_CODE = `import {
    proto,
    generateWAMessage,
    areJidsSameUser
} from '@whiskeysockets/baileys'

export async function all(m, chatUpdate) {
    if (m.isBaileys) return
    if (!m.message) return

    if (!(
        m.message.buttonsResponseMessage ||
        m.message.templateButtonReplyMessage ||
        m.message.listResponseMessage ||
        m.message.interactiveResponseMessage ||
        m.message.pollUpdateMessage
    )) return

    let id = ''

    try {
        id =
            m.mtype === 'conversation'
                ? m.message.conversation

            : m.mtype === 'extendedTextMessage'
                ? m.message.extendedTextMessage.text

            : m.mtype === 'buttonsResponseMessage'
                ? m.message.buttonsResponseMessage.selectedButtonId

            : m.mtype === 'listResponseMessage'
                ? m.message.listResponseMessage.singleSelectReply.selectedRowId

            : m.mtype === 'templateButtonReplyMessage'
                ? m.message.templateButtonReplyMessage.selectedId

            : m.mtype === 'interactiveResponseMessage'
                ? JSON.parse(
                    m.msg?.nativeFlowResponseMessage?.paramsJson ||
                    m.msg?.paramsJson ||
                    '{}'
                  )?.id

            : m.text || ''

    } catch (e) {
        console.log('Button parse error:', e)
        id = m.text || ''
    }

    if (!id) return

    let messages = await generateWAMessage(
        m.chat,
        {
            text: id,
            mentions: m.mentionedJid
        },
        {
            userJid: this.user.jid,
            quoted: m.quoted && m.quoted.fakeObj
        }
    )

    messages.key.remoteJid = m.chat
    messages.key.fromMe = areJidsSameUser(
        m.sender,
        this.user.id
    )

    messages.key.id = m.key.id
    messages.pushName = m.pushName

    if (m.isGroup) {
        messages.key.participant =
            messages.participant =
            m.sender
    }

    let msg = {
        ...chatUpdate,

        messages: [
            proto.WebMessageInfo.create(messages)
        ].map(v => ((v.conn = this), v)),

        type: 'append'
    }

    this.ev.emit('messages.upsert', msg)
}
`

// ======================================================
// مسار boton.js
// ======================================================

const PLUGINS_DIR = path.join(
    process.cwd(),
    'plugins'
)

const BOTON_PATH = path.join(
    PLUGINS_DIR,
    'boton.js'
)


// ======================================================
// إنشاء plugins إذا لم يكن موجوداً
// ======================================================

if (!fs.existsSync(PLUGINS_DIR)) {
    fs.mkdirSync(
        PLUGINS_DIR,
        {
            recursive: true
        }
    )
}


// ======================================================
// إنشاء boton.js
// ======================================================

function createBoton() {
    try {

        if (!fs.existsSync(BOTON_PATH)) {

            fs.writeFileSync(
                BOTON_PATH,
                BOTON_CODE,
                'utf8'
            )

            console.log(
                '✅ boton.js تم إنشاؤه تلقائياً!'
            )
        }

    } catch (e) {

        console.error(
            '❌ خطأ أثناء إنشاء boton.js:',
            e
        )

    }
}


// ======================================================
// إنشاء فوري عند تشغيل البوت
// ======================================================

createBoton()


// ======================================================
// التحقق كل ثانية
// إذا حذف boton.js يتم إنشاؤه من جديد
// ======================================================

setInterval(() => {
    createBoton()
}, 1000)
/**
 * 🟢 Always Online + 🔵 Auto Read
 *
 * هذا الـ plugin مربوط تلقائياً بـ handler.js
 * لأنه handler.js كيشغل plugin.all لكل رسالة.
 */

let onlineTimer = null

export async function all(m, { conn }) {
    try {
        if (!conn)
            return

        // =================================================
        // 🟢 ALWAYS ONLINE
        // =================================================

        // أول مرة فقط نشغلو الـ timer
        if (!onlineTimer) {

            // Online مباشرة
            await conn.sendPresenceUpdate('available').catch(() => {})

            // نبقاو نعاودو available كل 20 ثانية
            onlineTimer = setInterval(async () => {

                try {
                    await conn.sendPresenceUpdate('available')
                } catch {
                    // إذا كان الاتصال مقطوع نتجاهلو الخطأ
                }

            }, 20_000)
        }

        // =================================================
        // 🔵 AUTO READ
        // =================================================

        // ما نقراوش status
        if (
            !m?.key?.remoteJid ||
            m.key.remoteJid === 'status@broadcast'
        )
            return

        // ما نقراوش رسائل البوت نفسه
        if (m.key.fromMe)
            return

        // خاص message ID
        if (!m.key.id)
            return

        // قراءة الرسالة
        await conn.readMessages([
            {
                remoteJid: m.key.remoteJid,
                id: m.key.id,
                participant: m.key.participant
            }
        ]).catch(() => {})

    } catch {
        // ما نخليوش plugin يوقف handler
    }
}
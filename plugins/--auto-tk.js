import { ttdl } from 'btch-downloader'

const tiktokRegex =
  /^https?:\/\/(?:www\.)?(?:tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)\/\S+$/i

export async function before(m, { conn }) {
  if (!m.text) return

  const text = m.text.trim()

  if (!tiktokRegex.test(text)) return

  try {
    await m.react('⏳')

    const data = await ttdl(text)

    if (!data?.status) {
      await m.react('❌')
      return
    }

    // ==========================================
    // TikTok Photo Mode / صور متعددة
    // ==========================================
    if (Array.isArray(data.video) && data.video.length > 1) {

      for (const imageUrl of data.video) {
        try {
          await conn.sendMessage(
            m.chat,
            {
              image: { url: imageUrl }
            },
            { quoted: m }
          )
        } catch (e) {
          console.error('Error sending image:', e)
        }
      }

    }

    // ==========================================
    // فيديو عادي
    // ==========================================
    else if (data.video?.[0]) {

      await conn.sendMessage(
        m.chat,
        {
          video: { url: data.video[0] },
          caption: data.title || ''
        },
        { quoted: m }
      )

    }

    // ==========================================
    // إرسال الصوت بعد الصور / الفيديو
    // ==========================================
    if (data.audio?.[0]) {

      await conn.sendMessage(
        m.chat,
        {
          audio: { url: data.audio[0] },
          mimetype: 'audio/mpeg',
          ptt: false
        },
        { quoted: m }
      )

    }

    await m.react('✅')

  } catch (e) {
    console.error('TikTok Error:', e)
    await m.react('❌')
  }
}
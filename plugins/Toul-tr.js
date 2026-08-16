import translate from 'translate-google-api';
import googleTTS from 'google-tts-api';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

const handler = async (m, { conn, args, usedPrefix, command }) => {
  let fullText = args.join(' ').trim();

  // دعم الترجمة من رسالة مقتبس منها
  if (!fullText && m.quoted && m.quoted.text) {
    fullText = m.quoted.text;
  }

  if (!fullText) {
    return m.reply(
      `*🧶 الترجمة + النطق 🧶*\n\n` +
      `اكتب النص المراد ترجمته.\n\n` +
      `*مثال:*\n${usedPrefix + command} hello\n\n` +
      `أو حدد اللغة مباشرة:\n${usedPrefix + command} ar hello`
    );
  }

  const firstWord = args[0] ? args[0].toLowerCase() : '';
  const isLangCode = /^[a-z]{2}$/i.test(firstWord);

  // ==========================================
  // إذا تم تحديد اللغة مباشرة
  // مثال: .tr ar hello
  // ==========================================
  if (isLangCode && args.length > 1) {
    const targetLang = firstWord;
    const textToTranslate = args.slice(1).join(' ');

    try {
      await m.react('⏳');

      // الترجمة
      const result = await translate(textToTranslate, {
        to: targetLang
      });

      const translatedText = Array.isArray(result)
        ? result[0]
        : result;

      if (!translatedText) {
        throw new Error('Translation returned empty result');
      }

      // إرسال النص المترجم
      await m.reply(
        `${translatedText}`
      );

      // ==========================================
      // إنشاء الصوت باللغة التي اختارها المستخدم
      // ==========================================
      const audioUrl = googleTTS.getAudioUrl(translatedText, {
        lang: targetLang,
        slow: false,
        host: 'https://translate.google.com'
      });

      // إرسال الصوت
      await conn.sendMessage(
        m.chat,
        {
          audio: {
            url: audioUrl
          },
          mimetype: 'audio/mpeg',
          ptt: false
        },
        {
          quoted: m
        }
      );

      await m.react('✅');

    } catch (error) {
      console.error('Translation/TTS Error:', error);

      await m.react('❌');

      await m.reply(
        '❌ حدث خطأ أثناء الترجمة أو إنشاء الصوت.\n' +
        'تأكد من أن رمز اللغة صحيح.'
      );
    }

    return;
  }

  // ==========================================
  // إذا لم يتم تحديد اللغة -> إظهار الأزرار
  // ==========================================

  const textToTranslate = fullText;

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
    );

    await conn.relayMessage(
      m.chat,
      msg.message,
      {
        messageId: msg.key.id
      }
    );

  } catch (error) {
    console.error('Button Error:', error);

    await m.reply(
      '❌ فشل إرسال أزرار الترجمة.'
    );
  }
};

handler.command = ['tr'];
handler.tags = ['tools'];

export default handler;
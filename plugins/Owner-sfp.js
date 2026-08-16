import fs from 'fs'
import path from 'path'
let handler = async (m, { text, usedPrefix, command }) => {
    if (!text) throw `🔋هذا خاص باضافة كودات plugins 🔋`
    if (!m.quoted?.text) throw `اعطيني الكود 📥`
    let filePath = `plugins/${text}.js`
    await fs.writeFileSync(filePath, m.quoted.text)
    m.reply(`تم الإنشتء ✅️🔋`)
}

handler.help = ['sfp']
handler.tags = ['owner']
handler.command = /^sfp$/i


export default handler
let handler = async (m, { conn, usedPrefix, command, text }) => {
  conn.apk = conn.apk || {};

  let input = (text || m.text || "").trim();

  // ======================================================
  // اختيار تطبيق من القائمة
  // ======================================================

  let match = input.match(/^(\d+)$/);

  if (!match) {
    let prefixRegex = new RegExp(
      `^\\${usedPrefix}${command}\\s+(\\d+)$`,
      "i",
    );

    match = input.match(prefixRegex);
  }

  // ======================================================
  // تحميل التطبيق المختار
  // ======================================================

  if (match && conn.apk[m.sender]) {
    let number = Number(match[1]);
    let session = conn.apk[m.sender];

    if (!session.data?.length) {
      return m.reply("❌ انتهت صلاحية نتائج البحث.");
    }

    if (session.download) {
      return m.react("⌛️");
    }

    let app = session.data[number - 1];

    if (!app) {
      return m.reply("❌ رقم التطبيق غير صحيح.");
    }

    session.download = true;

    try {
      await m.react("⌛️");

      // الحصول على بيانات التطبيق
      let data = await aptoide.download(app.id);

      if (!data?.link) {
        throw new Error("Download link not found.");
      }

      // إرسال صورة التطبيق
      if (data.img) {
        try {
          await conn.sendMessage(
            m.chat,
            {
              image: {
                url: data.img,
              },
              caption:
                `📱 *${data.appname}*\n\n` +
                `👨‍💻 ${data.developer}\n` +
                `📦 ${app.size}\n` +
                `🔖 ${app.version}`,
            },
            {
              quoted: m,
            },
          );
        } catch (e) {
          console.log("Image error:", e.message);
        }
      }

      // تحميل APK
      let dl = await conn.getFile(data.link);

      if (!dl?.data) {
        throw new Error("APK file not found.");
      }

      // إرسال APK
      await conn.sendMessage(
        m.chat,
        {
          document: dl.data,
          fileName: `${data.appname}.apk`,
          mimetype:
            dl.mime ||
            "application/vnd.android.package-archive",
        },
        {
          quoted: m,
        },
      );

      await m.react("✅");

    } catch (e) {
      console.error("APK DOWNLOAD ERROR:", e);

      await m.react("❌");

    } finally {
      session.download = false;
    }

    return;
  }

  // ======================================================
  // البحث
  // ======================================================

  if (!input) {
    return m.reply(
      `📱 اكتب اسم التطبيق الذي تريد البحث عنه.\n\n` +
      `مثال:\n${usedPrefix + command} facebook lite`,
    );
  }

  let data;

  try {
    data = await aptoide.search(input);
  } catch (e) {
    console.error("APK SEARCH ERROR:", e);
    return m.reply("❌ حدث خطأ أثناء البحث.");
  }

  if (!data?.length) {
    return m.reply("❌ لم يتم العثور على أي تطبيق.");
  }

  // حذف البحث القديم
  if (conn.apk[m.sender]?.time) {
    clearTimeout(conn.apk[m.sender].time);
  }

  // حفظ نتائج البحث
  conn.apk[m.sender] = {
    download: false,
    data,

    time: setTimeout(() => {
      delete conn.apk[m.sender];
    }, 3600000),
  };

  // ======================================================
  // القائمة
  // ======================================================

  const rows = data.slice(0, 20).map((v, i) => ({
    title: v.name,
    id: `${usedPrefix}${command} ${i + 1}`,
  }));

  try {
    await conn.relayMessage(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              body: {
                text:
                  `🔎 نتائج البحث عن: *${input}*`,
              },

              footer: {
                text: "APK Downloader",
              },

              nativeFlowMessage: {
                buttons: [
                  {
                    name: "single_select",

                    buttonParamsJson: JSON.stringify({
                      title: "📱 اختيار التطبيق",

                      sections: [
                        {
                          title: "التطبيقات",
                          rows,
                        },
                      ],
                    }),
                  },
                ],

                messageParamsJson: "",
              },
            },
          },
        },
      },
      {},
    );

  } catch (e) {
    console.error("LIST ERROR:", e);

    // Fallback نصي
    let caption = data
      .slice(0, 20)
      .map((v, i) => `${i + 1}. ${v.name}`)
      .join("\n");

    return m.reply(
      `🔎 *نتائج البحث عن:* ${input}\n\n` +
      `${caption}\n\n` +
      `اكتب *${usedPrefix + command} 1* للاختيار.`,
    );
  }
};


// ======================================================
// Aptoide API
// ======================================================

const aptoide = {

  search: async function (query) {
    let res = await global.fetch(
      `https://ws75.aptoide.com/api/7/apps/search?query=${encodeURIComponent(
        query,
      )}&limit=1000`,
    );

    res = await res.json();

    if (
      !res.datalist ||
      !res.datalist.list ||
      res.datalist.list.length === 0
    ) {
      return [];
    }

    return res.datalist.list.map((v) => ({
      name: v.name,
      size: v.size || "N/A",
      version: v.file?.vername || "N/A",
      id: v.package,
    }));
  },


  download: async function (id) {
    let res = await global.fetch(
      `https://ws75.aptoide.com/api/7/apps/search?query=${encodeURIComponent(
        id,
      )}&limit=1`,
    );

    res = await res.json();

    if (
      !res.datalist ||
      !res.datalist.list ||
      res.datalist.list.length === 0
    ) {
      throw new Error("Application not found.");
    }

    const app = res.datalist.list[0];

    return {
      img: app.icon,
      developer: app.store?.name || "Unknown",
      appname: app.name,
      link: app.file?.path,
    };
  },
};


// ======================================================
// Handler
// ======================================================

handler.help = ["apk"];
handler.tags = ["downloader"];
handler.command = /^(apk)$/i;
handler.limit = false;

export default handler;
const fs = require("fs");
const moment = require("moment");
const qrcode = require("qrcode-terminal");
const { Client, Location, MessageMedia } = require("whatsapp-web.js");
const mqtt = require("mqtt");
const listen = mqtt.connect("mqtt://test.mosquitto.org");
const User = require("./user.js");
const corona = require("./CoronaService/covid19.js");
const SESSION_FILE_PATH = "./session.json";

// file is included here:
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionCfg = require(SESSION_FILE_PATH);
}

const client = new Client({
  puppeteer: {
    args: [
      "--headless",
      "--log-level=3", // fatal only
      "--start-maximized",
      "--no-default-browser-check",
      "--disable-infobars",
      "--disable-web-security",
      "--disable-site-isolation-trials",
      "--no-experiments",
      "--ignore-gpu-blacklist",
      "--ignore-certificate-errors",
      "--ignore-certificate-errors-spki-list",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-default-apps",
      "--enable-features=NetworkService",
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote"
    ]
  },
  session: sessionCfg
});
// You can use an existing session and avoid scanning a QR code by adding a "session" object to the client options.

client.initialize();

// ======================= Begin initialize WAbot

client.on("qr", qr => {
  // NOTE: This event will not be fired if a session is specified.
  qrcode.generate(qr, {
    small: true
  });
  console.log(`[ ${moment().format("HH:mm:ss")} ] Please Scan QR with app!`);
});

client.on("authenticated", session => {
  console.log(`[ ${moment().format("HH:mm:ss")} ] Authenticated Success!`);
  // console.log(session);
  sessionCfg = session;
  fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function(err) {
    if (err) {
      console.error(err);
    }
  });
});

client.on("auth_failure", msg => {
  // Fired if session restore was unsuccessfull
  console.log(
    `[ ${moment().format("HH:mm:ss")} ] AUTHENTICATION FAILURE \n ${msg}`
  );
  fs.unlink("./session.json", function(err) {
    if (err) return console.log(err);
    console.log(
      `[ ${moment().format("HH:mm:ss")} ] Session Deleted, Please Restart!`
    );
    process.exit(1);
  });
});

client.on("ready", () => {
  console.log(`[ ${moment().format("HH:mm:ss")} ] Whatsapp bot ready!`);
});

// ======================= Begin initialize mqtt broker

listen.on("connect", () => {
  listen.subscribe("corona", function(err) {
    if (!err) {
      console.log(`[ ${moment().format("HH:mm:ss")} ] Mqtt topic subscribed!`);
    }
  });
});

// ======================= WaBot Listen on Event

client.on("message_create", msg => {
  // Fired on all message creations, including your own
  if (msg.fromMe) {
    // do stuff here
  }
});

client.on("message_revoke_everyone", async (after, before) => {
  // Fired whenever a message is deleted by anyone (including you)
  // console.log(after); // message after it was deleted.
  if (before) {
    console.log(before.body); // message before it was deleted.
  }
});

client.on("message_revoke_me", async msg => {
  // Fired whenever a message is only deleted in your own view.
  // console.log(msg.body); // message before it was deleted.
});

client.on("message_ack", (msg, ack) => {
  /*
        == ACK VALUES ==
        ACK_ERROR: -1
        ACK_PENDING: 0
        ACK_SERVER: 1
        ACK_DEVICE: 2
        ACK_READ: 3
        ACK_PLAYED: 4
    */

  if (ack == 3) {
    // The message was read
  }
});

client.on("group_join", notification => {
  // User has joined or been added to the group.
  console.log("join", notification);
  notification.reply("User joined.");
});

client.on("group_leave", notification => {
  // User has left or been kicked from the group.
  console.log("leave", notification);
  notification.reply("User left.");
});

client.on("group_update", notification => {
  // Group picture, subject or description has been updated.
  console.log("update", notification);
});

client.on("disconnected", reason => {
  console.log("Client was logged out", reason);
});

// ======================= WaBot Listen on message

client.on("message", async msg => {
  console.log(
    `[ ${moment().format("HH:mm:ss")} ] Message:`,
    msg.from.replace("@c.us", ""),
    `| ${msg.type}`,
    msg.body ? `| ${msg.body}` : ""
  );

  if (msg.type == "ciphertext") {
    // Send a new message as a reply to the current one
    msg.reply("kirim ! menu atau !help untuk melihat menu.");
  } else if (msg.body == "Bayuou") {
    // Send a new message as a reply to the current one
    msg.reply("Bayu gans tapi masih gans gw");
  } else if (msg.body == "P" || msg.body == "p" || msg.body == "Woy") {
    // Send a new message to the same chat
    client.sendMessage(msg.from, "Selamat datang di bot safriansyah gans. Untuk menerima update informasi tentang corona silahkan ketik command 'corona'. Untuk melihat menu silahkan ketik 'menu'. TERIMAKASIH.");
  } else if (msg.body == "Assalamualaikum" || msg.body == "assalamualaikum") {
     // Send a new message as a reply to the current one
    client.sendMesssage(msg.from, "Waalaikumusallam. ada yang bisa saya bantu. Untuk melihat menu bot silahkan ketik 'menu' ");
  } else if (msg.body.startsWith("!sendto ")) {
    // Direct send a new message to specific id
    let number = msg.body.split(" ")[1];
    let messageIndex = msg.body.indexOf(number) + number.length;
    let message = msg.body.slice(messageIndex, msg.body.length);
    number = number.includes("@c.us") ? number : `${number}@c.us`;
    let chat = await msg.getChat();
    chat.sendSeen();
    client.sendMessage(number, message);
  } else if (msg.body == "!chats") {
    const chats = await client.getChats();
    client.sendMessage(msg.from, `The bot has ${chats.length} chats open.`);
  } else if (msg.body == "Info" || msg.body == "Help" || msg.body == "Menu" || msg.body == "menu") {
    let localData = client.localData;
    // console.log(localData);
    client.sendMessage(
      msg.from,
      `
*PERINTAH*
info/help  =>  Menu
p =>  Tes aktif atau tidak

*COVID-19 Informasi* 
aktif  =>  Mengaktifkan notifikasi
mati  =>  Mematikan notifikasi
corona  =>  Informasi COVID-19 Indonesia


`
    );
  } else if (msg.body == "!localData") {
    let localData = client.localData;
    // console.log(localData);
    client.sendMessage(
      msg.from,
      `
            *Connection localData*
            User name: ${localData.pushname}
            My number: ${localData.me.user}
            Device: ${localData.phone.device_manufacturer} | ${localData.phone.device_model}
            Platform: ${localData.platform} ${localData.phone.os_version} 
            WhatsApp version: ${localData.phone.wa_version}
        `
    );
  } else if (msg.body == "!medial" && msg.hasMedia) {
    const attachmentData = await msg.downloadMedia();
    // console.log(attachmentData)
    msg.reply(`
            *Media localData*
            MimeType: ${attachmentData.mimetype}
            Filename: ${attachmentData.filename}
            Data (length): ${attachmentData.data.length}
        `);
  } else if (msg.body == "!quotel" && msg.hasQuotedMsg) {
    const quotedMsg = await msg.getQuotedMessage();

    quotedMsg.reply(`
            ID: ${quotedMsg.id._serialized}
            Type: ${quotedMsg.type}
            Author: ${quotedMsg.author || quotedMsg.from}
            Timestamp: ${quotedMsg.timestamp}
            Has Media? ${quotedMsg.hasMedia}
        `);
  } else if (msg.body == "!resendmedia" && msg.hasQuotedMsg) {
    const quotedMsg = await msg.getQuotedMessage();
    if (quotedMsg.hasMedia) {
      const attachmentData = await quotedMsg.downloadMedia();
      client.sendMessage(msg.from, attachmentData, {
        caption: "Here's your requested media."
      });
    }
  } else if (msg.body == "!location") {
    msg.reply(
      new Location(37.422, -122.084, "Googleplex\nGoogle Headquarters")
    );
  } else if (msg.body.startsWith("!status ")) {
    const newStatus = msg.body.split(" ")[1];
    await client.setStatus(newStatus);
    msg.reply(`Status was updated to *${newStatus}*`);
  } else if (msg.body == "!mention") {
    const contact = await msg.getContact();
    const chat = await msg.getChat();
    chat.sendMessage(`Hi @${contact.number}!`, {
      mentions: [contact]
    });
  } else if (msg.body == "!delete" && msg.hasQuotedMsg) {
    const quotedMsg = await msg.getQuotedMessage();
    if (quotedMsg.fromMe) {
      quotedMsg.delete(true);
    } else {
      msg.reply("I can only delete my own messages");
    }
  } else if (msg.body === "!archive") {
    const chat = await msg.getChat();
    chat.archive();
  } else if (msg.body === "!quran") {
    const chat = await msg.getChat();
    // simulates typing in the chat
  client.sendMessage(
        msg.from,
        `
                    *Al Qur’an 30 Juz – 114 Surah*
                    _Ketik Nomor Surah Untuk Membaca_
                    _contoh baca 1_
                    
1	 Al Fatihah    الفاتحة	7
2	Al Baqarah  =  البقرة	286
3	Ali Imran  =  آل عمران	200
4	An Nisaa  =  النساء	176
5	Al Maidah  =  المائدة	120
6	Al An’am  =  الأنعام	165
7	Al A’raf  =  الأعراف	206
8	Al Anfaal  =  الأنفال	75
9	At Taubah  =  التوبة	129
10	Yunus  =  يونس	109
11	Huud  =  هود	123
12	 Yusuf  =  يوسف	111
13	Ar Ra’du  =  الرعد	43
14	Ibrahim  =  ابراهيم	52
15	Al Hijr  =  الحجر	99
16	An Nahl  =  النحل	128
17	Al Israa’   =  الإسراء	111
18	Al Kahfi  =  الكهف	110
19	Maryam  =  مريم	98
20	Thaahaa  =  طه	135
21	Al Anbiyaa  =  الأنبياء	112
22	Al Hajj  =  الحج	78
23	Al Mu’minun  =  المؤمنون	118
24	An Nuur  =  النور	64
25	 Al Furqaan  =  الفرقان	77
26	Asy Syu’ara  =  الشعراء	227
27	An Naml  =  النمل	93
28	Al Qashash  =  القصص	88
29	Al ‘Ankabut  =   العنكبوت	69
30	Ar Ruum  =  الروم	60
31	Luqman  =  لقمان	34
32	As Sajdah  =  السجدة	30
33	Al Ahzab  =  الأحزاب	73
34	Saba’  =  سبإ	54
35	Faathir  =  فاطر	45
36	Yaa Siin  =  يس	83
37	Ash Shaaffat  =  الصافات	182
38	Shaad  =  ص	88
39	Az Zumar  =  الزمر	75
40	Al Ghaafir  =  غافر	85
41	Al Fushilat  =  فصلت	54
42	Asy Syuura  =  الشورى	53
43	Az Zukhruf  =  الزخرف	89
44	Ad Dukhaan  =  الدخان	59
45	Al Jaatsiyah  =  الجاثية	37
46	Al Ahqaaf  =  الأحقاف	35
47	Muhammad  =  محمد	38
48	Al Fath  =  الفتح	29
49	Al Hujuraat  =  الحجرات	18
50	Qaaf  =  ق	45
51	Adz Dzaariyaat  =  الذاريات	60
52	Ath Thuur  =  الطور	49
53	An Najm  =  النجم	62
54	Al Qamar  = القمر	55
55	Ar Rahmaan  =  الرحمن	78
56	Al Waaqi’ah  =  الواقعة	96
57	Al Hadiid  =  الحديد	29
58	Al Mujaadalah  =  المجادلة	22
59	Al Hasyr  =  الحشر	24
60	Al Mumtahanah  =  الممتحنة	13
61	Ash Shaff  =  الصف	14
62	Al Jumuah  =  الجمعة	11
63	Al Munafiqun  =  المنافقون	11
64	Ath Taghabun  =  التغابن	18
65	Ath Thalaaq  =  الطلاق	12
66	At Tahrim  =  التحريم	12
67	Al Mulk  =  الملك	30
68	Al Qalam  =  القلم	52
69	 Al Haaqqah  =  الحاقة	52
70	Al Ma’aarij  =  المعارج	44
71	Nuh  =  نوح	28
72	Al Jin  =  الجن	28
73	Al Muzammil  =  المزمل	20
74	Al Muddastir  =  المدثر	56
75	Al Qiyaamah  =  القيامة	40
76	Al Insaan  =  الانسان	31
77	Al Mursalaat  =  المرسلات	50
78	An Naba’  =  النبإ	40
79	An Naazi’at  =  النازِعات	46
80	‘Abasa  =  عبس	42
81	At Takwir  =  التكوير	29
82	Al Infithar  =  الإنفطار	19
83	Al Muthaffifin  =  المطففين	36
84	Al Insyiqaq  =  الإنشقاق	25
85	Al Buruuj  =  البروج	22
86	Ath Thariq  =  الطارق	17
87	Al A’laa  =  الأعلى	19
88	Al Ghaasyiah  =  الغاشية	26
89	Al Fajr  = الفجر	30
90	Al Balad  =  البلد	20
91	Asy Syams  =  الشمس	15
92	Al Lail  =  الليل	21
93	Adh Dhuhaa =  الضحى	11
94	Asy Syarh  =  الشرح	8
95	At Tiin  =  التين	8
96	Al ‘Alaq  =  العلق	19
97	Al Qadr  =  القدر	5
98	Al Bayyinah  =  البينة	8
99	Az Zalzalah  =  الزلزلة	8
100	Al ‘Aadiyah  =  العاديات	11
101	Al Qaari’ah  =  القارعة	11
102	At Takaatsur  = التكاثر	8
103	Al ‘Ashr  = العصر	3
104	Al Humazah  =  الهمزة	9
105	Al Fiil  =  الفيل	5
106	Quraisy  =  قريش	4
107	Al Maa’uun  =  الماعون	7
108	Al Kautsar  =  الكوثر	3
109	Al Kafirun  =  الكافرون	6
110	An Nashr  =  النصر	3
111	Al Lahab  =  اللهب	5
112	Al Ikhlash  =  الإخلاص	4
113	Al Falaq  =  الفلق	5
114	An Naas  =  الناس	6

`
      );
  } 
  else if (msg.body === "baca1") {
  const chat = await msg.getChat();
    var baca1 = fs.readFileSync("./1.txt", "utf8");
                            
    client.sendMessage(
msg.from,`      Surah Al-Fatihah `,baca1);
  } 
  else if (msg.body === "!recording") {
    const chat = await msg.getChat();
    // simulates recording audio in the chat
    chat.sendStateRecording();
  } else if (msg.body === "!clearstate") {
    const chat = await msg.getChat();
    // stops typing or recording in the chat
    chat.clearState();
  } else if (msg.body === "!mati") {
    let chat = await msg.getChat();
    if (chat.isGroup) {
      msg.reply("Maaf, perintah ini tidak bisa digunakan di dalam grup!");
    } else {
      User.checkUser(msg.from).then(result => {
        if (result) {
          User.removeUser(msg.from).then(result => {
            if (result) {
              client.sendMessage(
                msg.from,
                "Berhasil menonaktifkan, anda tidak akan mendapat notifikasi lagi."
              );
            } else {
              client.sendMessage(
                msg.from,
                "Gagal menonaktifkan, nomor tidak terdaftar."
              );
            }
          });
        } else {
          client.sendMessage(
            msg.from,
            "Gagal menonaktifkan, nomor tidak terdaftar."
          );
        }
      });
    }
  } else if (msg.body === "!aktif" || msg.body === "!daftar") {
    let chat = await msg.getChat();
    if (chat.isGroup) {
      msg.reply("Maaf, perintah ini tidak bisa digunakan di dalam grup!");
    } else {
      User.addUser(msg.from).then(result => {
        if (!result) {
          client.sendMessage(msg.from, "Notifikasi sudah aktif.");
        } else {
          client.sendMessage(msg.from, "Berhasil mengaktifkan notifikasi.");
        }
      });
    }
  } else if (msg.body === "!coronaOld") {
    fs.readFile("./CoronaService/data.json", "utf-8", function(err, data) {
      if (err) throw err;
      const localData = JSON.parse(data);
      const newCases = localData.NewCases === "" ? 0 : localData.NewCases;
      const newDeaths = localData.NewDeaths === "" ? 0 : localData.NewDeaths;
      client.sendMessage(
        msg.from,
        `
                    *COVID-19 Update!!*
Negara: ${localData.Country}

*Kasus aktif: ${localData.ActiveCases}*
*Total Kasus: ${localData.TotalCases}*
Kasus Baru: ${newCases}

*Meninggal: ${localData.TotalDeaths}*
Meninggal Baru: ${newDeaths}

*Total Sembuh: ${localData.TotalRecovered}*
            
Sumber: _https://www.worldometers.info/coronavirus/_
            `
      );
      var imageAsBase64 = fs.readFileSync(
        "./CoronaService/corona.png",
        "base64"
      );
      var CoronaImage = new MessageMedia("image/png", imageAsBase64);
      client.sendMessage(msg.from, CoronaImage);
    });
  } else if (msg.body === "corona" || msg.body === "Corona" || msg.body === "/corona") {
    corona.getAll().then(result => {
      var aktifIndo =
        result[0].confirmed - result[0].recovered - result[0].deaths;
      // var aktifGlob = result[1].confirmed - result[1].recovered - result[1].
      // Kasus *Global*
      // Total Kasus: ${result[1].confirmed}
      // Kasus aktif: ${aktifGlob}
      // Sembuh: ${result[1].recovered}
      // Meninggal: ${result[1].deaths}
      // Update Pada:
      // ${result[1].lastUpdate}
      client.sendMessage(
        msg.from,
        `
                    *COVID-19 Update!!*

Kasus *Indonesia* 🇮🇩

😞 Total Kasus: ${result[0].confirmed}
😷 Kasus aktif: ${aktifIndo}
😊 Sembuh: ${result[0].recovered}
😭 Meninggal: ${result[0].deaths}

🕓 Update Pada: 
${result[0].lastUpdate.replace("pukul", "|")} WIB
     

Stay safe ya semuanya , jaga kesehatan nya masing masing`
      );
      var imageAsBase64 = fs.readFileSync(
        "./CoronaService/corona.png",
        "base64"
      );
      var CoronaImage = new MessageMedia("image/png", imageAsBase64);
      client.sendMessage(msg.from, CoronaImage);
    });

    // ============================================= Groups
  } else if (msg.body.startsWith("!subject ")) {
    // Change the group subject
    let chat = await msg.getChat();
    if (chat.isGroup) {
      let newSubject = msg.body.slice(9);
      chat.setSubject(newSubject);
    } else {
      msg.reply("This command can only be used in a group!");
    }
  } else if (msg.body.startsWith("!echo ")) {
    // Replies with the same message
    msg.reply(msg.body.slice(6));
  } else if (msg.body.startsWith("!desc ")) {
    // Change the group description
    let chat = await msg.getChat();
    if (chat.isGroup) {
      let newDescription = msg.body.slice(6);
      chat.setDescription(newDescription);
    } else {
      msg.reply("This command can only be used in a group!");
    }
  } else if (msg.body == "!leave") {
    // Leave the group
    let chat = await msg.getChat();
    if (chat.isGroup) {
      chat.leave();
    } else {
      msg.reply("This command can only be used in a group!");
    }
  } else if (msg.body.startsWith("!join ")) {
    const inviteCode = msg.body.split(" ")[1];
    try {
      await client.acceptInvite(inviteCode);
      msg.reply("Joined the group!");
    } catch (e) {
      msg.reply("That invite code seems to be invalid.");
    }
  } else if (msg.body == "!grouplocalData") {
    let chat = await msg.getChat();
    if (chat.isGroup) {
      msg.reply(`
                *Group Details*
                Name: ${chat.name}
                Description: ${chat.description}
                Created At: ${chat.createdAt.toString()}
                Created By: ${chat.owner.user}
                Participant count: ${chat.participants.length}
            `);
    } else {
      msg.reply("This command can only be used in a group!");
    }
  }
});

listen.on("message", (topic, message) => {
  console.log(`[ ${moment().format("HH:mm:ss")} ] MQTT: ${message.toString()}`);
  fs.readFile("./CoronaService/user.json", "utf-8", function(err, data) {
    if (err) throw err;
    const userData = JSON.parse(data);
    for (var i = 0; i < userData.length; i++) {
      let number = userData[i].user;
      // number = number.includes('@c.us') ? number : `${number}@c.us`;
      setTimeout(function() {
        console.log(
          `[ ${moment().format("HH:mm:ss")} ] Send Corona Update to ${number}`
        );
        if (message.toString() === "New Update!") {
          fs.readFile("./CoronaService/data.json", "utf-8", function(
            err,
            data
          ) {
            if (err) throw err;
            const localData = JSON.parse(data);
            const newCases = localData.NewCases === "" ? 0 : localData.NewCases;
            const newDeaths =
              localData.NewDeaths === "" ? 0 : localData.NewDeaths;
            client.sendMessage(
              number,
              `
                    *COVID-19 Update!!*
Negara: ${localData.Country}

Kasus aktif: ${localData.ActiveCases}
Total Kasus: ${localData.TotalCases}
*Kasus Baru: ${newCases}*
        
Meninggal: ${localData.TotalDeaths}
*Meninggal Baru: ${newDeaths}*
        
Total Sembuh: ${localData.TotalRecovered}
                    
Dicek pada: ${moment()
                .format("LLLL")
                .replace("pukul", "|")} WIB
Sumber: 
_https://www.worldometers.info/coronavirus/_
                    `
            );
          });
        }
        // Delay 3 Sec
      }, i * 3000);
    }
  });
});

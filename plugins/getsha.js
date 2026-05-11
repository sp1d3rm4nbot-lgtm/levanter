const crypto = require('crypto')
const { bot } = require('../lib/')

bot(
  {
    pattern: 'getsha ?(.*)',
    desc: 'Récupère le SHA256 d un sticker',
    type: 'misc',
  },
  async (message) => {
    if (!message.reply_message) {
      return await message.send('❌ Réponds à un sticker avec .getsha')
    }
    if (!message.reply_message.sticker) {
      return await message.send('❌ Ce message n\'est pas un sticker')
    }

    const buffer = await message.reply_message.downloadMediaMessage()
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex')

    await message.send(`📋 *SHA256 du sticker :*\n${sha256}\n\nCopie cette valeur pour configurer ton plugin de transfert.`)
  }
)
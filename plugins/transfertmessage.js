// ============================================================
//  PLUGIN : Transfert de message par sticker
//  Fichier : plugins/transfert-message.js
//  Auteur  : (ton nom)
//
//  FONCTIONNEMENT :
//  Réponds à n'importe quel message (texte, image, vidéo,
//  audio, document, vue unique...) avec TON sticker spécifique
//  → le bot te transfère ce message en privé automatiquement.
//
//  INSTALLATION :
//  1. Place ce fichier dans le dossier /plugins/ de Levanter
//  2. Récupère le SHA256 de ton sticker (voir étapes ci-dessous)
//  3. Remplace VOTRE_SHA256_ICI par la vraie valeur
//  4. Redémarre le bot
//
//  RÉCUPÉRER LE SHA256 DE TON STICKER :
//  - Active le mode debug en mettant DEBUG_MODE = true
//  - Envoie ton sticker dans une conversation
//  - Regarde les logs du bot, tu verras : [STICKER SHA256] xxxxxx
//  - Copie cette valeur, colle-la dans STICKER_SHA256
//  - Remets DEBUG_MODE = false
// ============================================================

// ▼▼▼ CONFIGURATION — À MODIFIER ▼▼▼
const STICKER_SHA256 = 'VOTRE_SHA256_ICI'   // SHA256 hex de ton sticker déclencheur
const DEBUG_MODE     = false                 // true pour afficher le SHA256 de chaque sticker dans les logs
// ▲▲▲ FIN CONFIGURATION ▲▲▲


let handler = async (m, { conn }) => {
    // Récupère le numéro owner (SUDO) défini dans config.env
    const sudoRaw = (process.env.SUDO || '').split(',')[0].trim()
    if (!sudoRaw) {
        console.error('[TRANSFERT] ❌ Aucun numéro SUDO trouvé dans config.env')
        return
    }
    const ownerJid = sudoRaw.replace(/[^0-9]/g, '') + '@s.whatsapp.net'

    // Vérifie qu'il y a bien un message cité
    if (!m.quoted) return

    try {
        const quotedMsg = m.quoted
        const isViewOnce = quotedMsg.msg?.viewOnce === true

        if (isViewOnce) {
            // ── CAS VUE UNIQUE ──────────────────────────────────────────
            // On duplique le contenu en supprimant le flag viewOnce
            // pour pouvoir l'envoyer librement
            let mediaContent = { ...quotedMsg.msg }

            if (mediaContent.imageMessage) {
                mediaContent = {
                    image: { url: mediaContent.imageMessage.url },
                    mimetype: mediaContent.imageMessage.mimetype,
                    caption: '🔒 Vue unique — transféré automatiquement',
                    jpegThumbnail: mediaContent.imageMessage.jpegThumbnail,
                }
                await conn.sendMessage(ownerJid, mediaContent)

            } else if (mediaContent.videoMessage) {
                mediaContent = {
                    video: { url: mediaContent.videoMessage.url },
                    mimetype: mediaContent.videoMessage.mimetype,
                    caption: '🔒 Vue unique — transféré automatiquement',
                }
                await conn.sendMessage(ownerJid, mediaContent)

            } else {
                // Type vue unique non reconnu → on transfère quand même
                await conn.copyNForward(ownerJid, quotedMsg, false)
            }

            // Message d'accompagnement pour indiquer l'origine
            const originChat = m.chat.includes('g.us') ? `Groupe : ${m.chat}` : `Privé : ${m.sender}`
            await conn.sendMessage(ownerJid, {
                text: `📩 *Message vue unique reçu*\n📍 Origine : ${originChat}\n👤 Envoyé par : @${m.sender.split('@')[0]}`,
                mentions: [m.sender],
            })

        } else {
            // ── CAS NORMAL (texte, image, vidéo, audio, doc…) ───────────
            await conn.copyNForward(ownerJid, quotedMsg, false)

            // Infos d'origine si le message vient d'un groupe
            if (m.chat.includes('g.us')) {
                await conn.sendMessage(ownerJid, {
                    text: `📍 *Origine :* Groupe ${m.chat}\n👤 *Auteur :* @${m.sender.split('@')[0]}`,
                    mentions: [m.sender],
                })
            }
        }

        // Réaction ✅ pour confirmer le transfert
        await m.react('✅')

    } catch (err) {
        console.error('[TRANSFERT] ❌ Erreur lors du transfert :', err)
        await m.react('❌')
    }
}


// ── DÉCLENCHEUR : écoute TOUS les messages ───────────────────
handler.all = true

// Condition : le message doit être un sticker ET une réponse à un autre message
handler.before = async (m) => {
    // Affiche le SHA256 de chaque sticker reçu si DEBUG_MODE activé
    if (DEBUG_MODE && m.mtype === 'stickerMessage') {
        const sha = m.msg?.fileSha256
        if (sha) console.log('[STICKER SHA256]', Buffer.from(sha).toString('hex'))
    }

    // Ignore si ce n'est pas un sticker
    if (m.mtype !== 'stickerMessage') return false

    // Ignore si pas de message cité
    if (!m.quoted) return false

    // Mode debug ou sticker non configuré → on laisse passer pour les tests
    if (DEBUG_MODE || STICKER_SHA256 === 'VOTRE_SHA256_ICI') return true

    // Vérifie que c'est bien LE bon sticker via son SHA256
    const sha = m.msg?.fileSha256
    if (!sha) return false
    return Buffer.from(sha).toString('hex') === STICKER_SHA256
}

export default handler
                         

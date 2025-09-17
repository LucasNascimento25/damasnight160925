import { handleBlacklistCommands } from './blacklistHandler.js';
import { handleMusicaCommands } from './musicaHandler.js';
import { handleMessage as handleAdvertencias } from './advertenciaGrupos.js';
import { handleAntiLink } from './antilink.js';
import pool from '../../db.js'; // ⬅️ Importa o pool do Neon DB

export async function handleMessages(sock, message) {
    try {
        // 🔹 Ignora mensagens inválidas
        if (!message?.key || !message?.message) return;

        const from = message.key.remoteJid;
        const userId = message.key.participant || message.key.remoteJid;

        // 🔹 Conteúdo da mensagem
        const content =
            message.message.conversation ||
            message.message.extendedTextMessage?.text ||
            '';

        // 🔹 Ignora mensagens vazias, do próprio bot ou do sistema
        if (!content || message.key.fromMe || userId === sock.user?.jid) return;

        console.log(`📨 Mensagem de ${userId} em ${from}: ${content}`);

        // 🔹 Anti-link em grupos
        if (from.endsWith('@g.us')) {
            await handleAntiLink(sock, message, from);
        }

        let handled = false;

        // 🔹 Comandos de blacklist (somente admins em grupo)
        if (!handled) {
            const isAdmin = from.endsWith('@g.us')
                ? (await sock.isGroupAdmin?.(from, userId)) || false
                : true;

            handled = await handleBlacklistCommands(
                sock,
                from,
                userId,
                content,
                isAdmin,
                pool
            );
        }

        // 🔹 Outros comandos
        if (!handled) handled = await handleMusicaCommands(sock, from, content, pool);
        if (!handled) await handleAdvertencias(sock, message, pool);

        // 🔹 Comando inválido #da
        if (!handled && content.toLowerCase().startsWith('#da')) {
            await sock.sendMessage(from, {
                text: '❌ Comando inválido.\n✅ Exemplo: #damas music [nome da música]'
            });
        }
    } catch (err) {
        console.error('❌ Erro ao processar mensagem:', err);
    }
}

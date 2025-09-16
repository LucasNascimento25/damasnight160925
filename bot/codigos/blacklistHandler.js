// blacklistHandler.js
import { 
    addToBlacklist, removeFromBlacklist, 
    isBlacklistedRealtime, listBlacklist, 
    getBlacklistHelp, adminOnlyMessage 
} from './blacklistFunctions.js';
import { getGroupAdmins, isUserAdmin } from './grupoUtils.js';

/**
 * Envia mensagem e apaga após X segundos
 * Apaga também a mensagem do usuário, se disponível
 */
async function sendAndDelete(sock, jid, botContent, userMsgKey = null, seconds = 5) {
    try {
        // Deleta mensagem do usuário após X segundos
        if (userMsgKey) {
            setTimeout(async () => {
                try {
                    await sock.sendMessage(jid, { delete: userMsgKey });
                } catch (err) {
                    console.error('Erro ao deletar mensagem do usuário:', err);
                }
            }, seconds * 1000);
        }

        // Envia mensagem do bot
        const sentMsg = await sock.sendMessage(jid, botContent);
        if (!sentMsg?.key) return;

        // Deleta mensagem do bot após X segundos
        setTimeout(async () => {
            try {
                await sock.sendMessage(jid, { delete: sentMsg.key });
            } catch (err) {
                console.error('Erro ao deletar mensagem do bot:', err);
            }
        }, seconds * 1000);

    } catch (err) {
        console.error('Erro no sendAndDelete:', err);
    }
}

/**
 * Handler principal dos comandos da blacklist
 */
export async function handleBlacklistCommands(sock, from, userId, content, msg) {
    const lowerContent = content?.toLowerCase().trim();
    const userMsgKey = msg?.key;

    if (!lowerContent) return false;

    // Função para verificar admin em grupos
    async function requireAdmin() {
        if (from.endsWith('@g.us')) {
            const groupAdmins = await getGroupAdmins(sock, from);
            if (!isUserAdmin(userId, groupAdmins)) {
                await sendAndDelete(sock, from, { text: adminOnlyMessage() }, userMsgKey, 5);
                return false;
            }
        }
        return true;
    }

    // #addlista
    if (lowerContent.startsWith('#addlista ')) {
        if (!await requireAdmin()) return true;

        const args = content.split(' ');
        const number = args[1]?.trim();
        if (!number) {
            await sendAndDelete(sock, from, { text: '❌ Uso correto: #addlista [número] [motivo opcional]' }, userMsgKey, 5);
            return true;
        }

        const now = new Date();
        const formattedDate = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const motivo = args.slice(2).join(' ') || `Adicionado em ${formattedDate}`;

        const result = await addToBlacklist(number, motivo);
        await sendAndDelete(sock, from, { text: `${result} 🛑` }, userMsgKey, 5);
        return true;
    }

    // #remlista
    if (lowerContent.startsWith('#remlista ')) {
        if (!await requireAdmin()) return true;

        const number = content.replace('#remlista ', '').trim();
        if (!number) {
            await sendAndDelete(sock, from, { text: '❌ Uso correto: #remlista [número]' }, userMsgKey, 5);
            return true;
        }

        const result = await removeFromBlacklist(number);
        await sendAndDelete(sock, from, { text: `${result} 🎉` }, userMsgKey, 5);
        return true;
    }

    // #verilista
    if (lowerContent.startsWith('#verilista ')) {
        if (!await requireAdmin()) return true;

        const number = content.replace('#verilista ', '').trim();
        if (!number) {
            await sendAndDelete(sock, from, { text: '❌ Uso correto: #verilista [número]' }, userMsgKey, 5);
            return true;
        }

        const blocked = await isBlacklistedRealtime(number);
        await sendAndDelete(sock, from, { text: blocked 
            ? `❌ Número ${number} está na blacklist.` 
            : `✅ Número ${number} não está na blacklist.` }, userMsgKey, 5);
        return true;
    }

    // #lista
    if (lowerContent === '#lista') {
        if (!await requireAdmin()) return true;

        const result = await listBlacklist();
        await sendAndDelete(sock, from, { text: `📋 Lista da Blacklist:\n\n${result}` }, userMsgKey, 10);
        return true;
    }

    // #infolista (informativo, liberado para todos)
    if (lowerContent === '#infolista') {
        const result = getBlacklistHelp();
        await sendAndDelete(sock, from, { text: `ℹ️ Informações da Blacklist:\n\n${result}` }, userMsgKey, 20);
        return true;
    }

    return false;
}

// blacklistFunctions.js
import { query } from '../../database.js';

export const BOT_TITLE = '👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸';

/**
 * Normaliza números para o formato do WhatsApp
 * Ex: 5521998765432@s.whatsapp.net
 */
export function normalizeNumber(number) {
    let digits = number.replace(/@.*$/, '').replace(/\D/g, '');
    if (digits.length === 11 && !digits.startsWith('55')) digits = '55' + digits;

    // Formato que o Baileys reconhece
    return `${digits}@s.whatsapp.net`;
}

export function adminOnlyMessage() {
    return `${BOT_TITLE} 🚫 Este comando só pode ser usado por administradores!`;
}

/**
 * Verifica em tempo real se o número está na blacklist
 */
export async function isBlacklistedRealtime(number) {
    try {
        const normalizedId = normalizeNumber(number);
        const result = await query('SELECT whatsapp_id FROM blacklist WHERE whatsapp_id = $1', [normalizedId]);
        return result.rowCount > 0;
    } catch (err) {
        console.error(`${BOT_TITLE} ❌ Erro ao verificar blacklist:`, err);
        return false;
    }
}

/**
 * Adiciona número à blacklist
 */
export async function addToBlacklist(whatsappId, motivo = null) {
    try {
        const normalizedId = normalizeNumber(whatsappId);
        const alreadyBlocked = await isBlacklistedRealtime(normalizedId);
        if (alreadyBlocked) return `${BOT_TITLE} ⚠️ NÚMERO ${normalizedId} já está na blacklist.`;

        await query('INSERT INTO blacklist (whatsapp_id, motivo) VALUES ($1, $2)', [normalizedId, motivo]);
        return `${BOT_TITLE} ✅ NÚMERO ${normalizedId} adicionado à blacklist.`;
    } catch (err) {
        console.error(`${BOT_TITLE} ❌ Erro ao adicionar ${whatsappId}:`, err);
        return `${BOT_TITLE} ❌ Erro ao adicionar ${whatsappId} à blacklist.`;
    }
}

/**
 * Remove número da blacklist
 */
export async function removeFromBlacklist(whatsappId) {
    try {
        const normalizedId = normalizeNumber(whatsappId);
        const result = await query('DELETE FROM blacklist WHERE whatsapp_id = $1', [normalizedId]);

        if (result.rowCount > 0) return `${BOT_TITLE} 🟢 NÚMERO ${normalizedId} removido da blacklist 🔓`;
        return `${BOT_TITLE} ⚠️ NÚMERO ${normalizedId} não está na blacklist.`;
    } catch (err) {
        console.error(`${BOT_TITLE} ❌ Erro ao remover ${whatsappId}:`, err);
        return `${BOT_TITLE} ❌ Erro ao remover ${whatsappId} da blacklist.`;
    }
}

/**
 * Lista números da blacklist
 */
export async function listBlacklist() {
    try {
        const result = await query('SELECT * FROM blacklist ORDER BY created_at DESC');
        if (!result.rows.length) return `${BOT_TITLE} 📋 A blacklist está vazia.`;
        return `${BOT_TITLE}\n\n` + result.rows.map(r => `• ${r.whatsapp_id} - ${r.motivo || 'Sem motivo'}`).join('\n');
    } catch (err) {
        console.error(`${BOT_TITLE} ❌ Erro ao listar blacklist:`, err);
        return `${BOT_TITLE} ❌ Erro ao listar blacklist.`;
    }
}

/**
 * Mensagem de ajuda da blacklist
 */
export function getBlacklistHelp() {
    return `
${BOT_TITLE} \n\n
📋 *COMANDOS DE BLACKLIST* 📋

• #addlista [número] - Adiciona número à blacklist
• #remlista [número] - Remove número da blacklist
• #verilista [número] - Verifica se número está na blacklist
• #lista - Lista todos os números da blacklist
• #infolista - Mostra este guia

💡 *Como salvar números corretamente:*
- Apenas dígitos, sem símbolos.
- Inclua o código do país (55 para Brasil). Ex: 5521979452941
- Números internacionais: inclua o código do país + número. Ex: 12125551234
`;
}

/**
 * Remove automaticamente usuário blacklist ao entrar no grupo
 */
export async function onUserJoined(userId, groupId, bot) {
    try {
        const normalizedId = normalizeNumber(userId);
        const blocked = await isBlacklistedRealtime(normalizedId);

        if (blocked) {
            await bot.groupParticipantsUpdate(groupId, [normalizedId], 'remove');
            console.log(`${BOT_TITLE} 🚨 ${normalizedId} foi removido do grupo ${groupId} pois está na blacklist.`);
        } else {
            console.log(`${BOT_TITLE} ✅ ${normalizedId} entrou no grupo ${groupId} e não está na blacklist.`);
        }
    } catch (err) {
        console.error(`${BOT_TITLE} ❌ Erro ao processar entrada de ${userId} no grupo ${groupId}:`, err);
    }
}

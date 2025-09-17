/*blacklistCron.js*/

import cron from 'node-cron';
import { normalizeNumber, isBlacklistedRealtime } from './blacklistFunctions.js';

/**
 * Verifica todos os grupos e remove usuários da blacklist (cron)
 * @param {object} bot - Instância do bot
 */
export function iniciarVerificacaoPeriodica(bot) {
  cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('🔄 Verificando usuários na blacklist...');

      const groups = await bot.groupFetchAllParticipating();
      for (const groupId of Object.keys(groups)) {
        await verificarBlacklistAgora(bot, groupId);
      }

    } catch (err) {
      console.error('❌ Erro na verificação periódica:', err);
    }
  });
}

/**
 * Verifica um grupo específico e remove usuários da blacklist
 * @param {object} bot - Instância do bot
 * @param {string} groupId - ID do grupo
 */
export async function verificarBlacklistAgora(bot, groupId) {
  try {
    const groupMetadata = await bot.groupMetadata(groupId);
    const participants = groupMetadata.participants.map(p => p.id);

    for (const userId of participants) {
      const normalizedId = normalizeNumber(userId);
      const blocked = await isBlacklistedRealtime(normalizedId);

      if (blocked) {
        await bot.groupParticipantsUpdate(groupId, [normalizedId], 'remove');
        console.log(`🚨 Removido ${normalizedId} do grupo ${groupMetadata.subject} (verificação manual/cron)`);
      }
    }
  } catch (err) {
    console.error(`❌ Erro ao verificar grupo ${groupId}:`, err);
  }
}

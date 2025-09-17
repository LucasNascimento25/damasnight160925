import pool from '../../db.js'; // ⬅️ pool global do Neon DB

// Funções de banco
async function getAdvertencias(userId, groupId) {
  const res = await pool.query(
    'SELECT count FROM advertencias WHERE user_id = $1 AND group_id = $2',
    [userId, groupId]
  );
  return res.rows[0]?.count || 0;
}

async function incrementAdvertencia(userId, groupId) {
  const count = await getAdvertencias(userId, groupId);

  if (count === 0) {
    await pool.query(
      'INSERT INTO advertencias (user_id, group_id, count) VALUES ($1, $2, 1)',
      [userId, groupId]
    );
    return 1;
  } else {
    const newCount = count + 1;
    await pool.query(
      'UPDATE advertencias SET count = $1 WHERE user_id = $2 AND group_id = $3',
      [newCount, userId, groupId]
    );
    return newCount;
  }
}

async function resetAdvertencia(userId, groupId) {
  await pool.query(
    'DELETE FROM advertencias WHERE user_id = $1 AND group_id = $2',
    [userId, groupId]
  );
}

// Função para enviar mensagens com título padrão
async function sendMessage(sock, chatId, message, senderId) {
  const title = "👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸";
  const fullMessage = `${title}\n\n${message}`;
  await sock.sendMessage(chatId, { text: fullMessage, mentions: [senderId] });
}

// Função para banir usuário
async function banUser(sock, groupId, userId) {
  await sock.groupParticipantsUpdate(groupId, [userId], 'remove');
}

// Função para tratar advertências com verificação
async function tratarAdvertencia(sock, groupId, userId) {
  let groupMetadata;
  try {
    groupMetadata = await sock.groupMetadata(groupId);
  } catch (err) {
    console.error("Erro ao obter metadados do grupo:", err);
    return;
  }

  const participante = groupMetadata.participants.find(p => p.id === userId);

  if (!participante) {
    await sendMessage(
      sock,
      groupId,
      `O usuário @${userId.split('@')[0]} *não está mais neste grupo*. Nenhuma advertência aplicada.`,
      userId
    );
    return;
  }

  const count = await incrementAdvertencia(userId, groupId);

  console.log(`Incrementando advertência para ${userId} no grupo ${groupId}. Total: ${count}/3`);

  if (count >= 3) {
    await banUser(sock, groupId, userId);
    await sendMessage(
      sock,
      groupId,
      `@${userId.split('@')[0]}, devido à reincidência no descumprimento das regras do grupo, você foi removido ❌.`,
      userId
    );
    await resetAdvertencia(userId, groupId);
  } else {
    await sendMessage(
      sock,
      groupId,
      `@${userId.split('@')[0]}, esta é sua *advertência* ${count}/3 ⚠️.  
Ao atingir 3 advertências, você será removido.`,
      userId
    );
  }
}

// Função principal para lidar com mensagens
async function handleMessage(sock, message) {
  const { key, message: msg } = message;
  const from = key.remoteJid;
  const sender = key.participant || key.remoteJid;

  console.log(`Mensagem recebida de ${sender} no grupo ${from}:`, msg);

  let isAdmin = false;
  try {
    const groupMetadata = await sock.groupMetadata(from);
    isAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);
  } catch (err) {
    console.error("Erro ao verificar admin:", err);
  }

  const sendNoPermission = async () => {
    await sendMessage(
      sock,
      from,
      `@${sender.split('@')[0]}, você *não possui permissão* para executar este comando 🚫👨🏻‍✈️.  
Este recurso é *exclusivo dos administradores* do grupo.`,
      sender
    );
  };

  if (msg && msg.imageMessage) {
    const imageCaption = msg.imageMessage.caption;
    if (imageCaption && imageCaption.includes('#adv')) {
      if (!isAdmin) {
        await sendNoPermission();
        return;
      }

      const imageSender =
        msg.imageMessage.context?.participant ||
        msg.imageMessage.context?.key?.participant ||
        key.participant ||
        key.remoteJid;

      await tratarAdvertencia(sock, from, imageSender);
    }
  }

  if (msg && msg.extendedTextMessage) {
    const commentText = msg.extendedTextMessage.text;
    if (commentText && commentText.includes('#adv')) {
      if (!isAdmin) {
        await sendNoPermission();
        return;
      }

      const quotedMessage = msg.extendedTextMessage.contextInfo;
      const originalSender =
        quotedMessage?.participant ||
        quotedMessage?.key?.participant ||
        quotedMessage?.key?.remoteJid;

      if (!originalSender) {
        await sendMessage(
          sock,
          from,
          `@${sender.split('@')[0]}, você mencionou #adv, mas não respondeu a uma mensagem válida.`,
          sender
        );
        return;
      }

      await tratarAdvertencia(sock, from, originalSender);
    }
  }
}

// Exportando com o nome original (handleMessage)
export { handleMessage };

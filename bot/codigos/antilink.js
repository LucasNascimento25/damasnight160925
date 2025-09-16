// Função para obter o link de convite do grupo
const getGroupInviteLink = async (sock, groupId) => {
    try {
        const inviteCode = await sock.groupInviteCode(groupId);
        return `https://chat.whatsapp.com/${inviteCode}`;
    } catch (error) {
        console.error('Erro ao obter o link de convite do grupo:', error);
        return null;
    }
};

// Função para tentar deletar mensagem o mais rápido possível
const deleteMessageWithRetries = async (sock, groupId, messageKey, maxRetries = 3) => {
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            // Tentativa imediata de exclusão
            await sock.sendMessage(groupId, { delete: messageKey });
            console.log(`Mensagem DELETADA (tentativa ${retryCount + 1})`);
            return true;
        } catch (error) {
            retryCount++;
            console.error(`Erro na tentativa ${retryCount} de deletar mensagem:`, error);

            if (retryCount < maxRetries) {
                // Delay mínimo (50ms)
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
    }

    console.error(`Falha ao deletar mensagem após ${maxRetries} tentativas`);
    return false;
};

// Função para notificar administradores e infrator (sem mostrar link)
const notifyAdminsAndOffender = async (sock, groupId, offenderId, detectedLink, deletionSuccess = true) => {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);

        // Filtra os administradores
        const admins = groupMetadata.participants.filter(
            participant => participant.admin === 'admin' || participant.admin === 'superadmin'
        );

        // Cria lista de menções: usuário infrator + administradores
        const mentions = [offenderId, ...admins.map(admin => admin.id)];

        // Mensagem adaptada baseada no sucesso da exclusão
        let statusMessage = '';
        if (deletionSuccess) {
            statusMessage = '✅ *Mensagem removida automaticamente*';
        } else {
            statusMessage = '⚠️ *Falha na remoção automática - Ação manual necessária*';
        }

        // Mensagem sem mostrar link do usuário
        const message = `🚨🔗 *ᴍᴇɴꜱᴀɢᴇᴍ ꜱᴜꜱᴘᴇɪᴛᴀ ᴅᴇᴛᴇᴄᴛᴀᴅᴀ!* \n  
${statusMessage}

*𝚄𝚜𝚞𝚊𝚛𝚒𝚘:* @${offenderId.split('@')[0]} \n 
*𝙼𝚘𝚝𝚒𝚟𝚘:* 🚨⚠️ Esta mensagem contém um link que não é permitido no grupo 👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ NIGӇԵ* 💃🎶🍾🍸 \n  
*🚨🔊 𝙰𝚍𝚖𝚒𝚗𝚒𝚜𝚝𝚛𝚊𝚍𝚘𝚛𝚎𝚜:* ${admins.map(admin => `@${admin.id.split('@')[0]}`).join(', ')} \n  
*𝙿𝙾𝚁 𝚅𝙰𝙵𝙾𝚁, 𝙰𝚅𝙰𝙻𝙸𝙴𝙼 𝙰 𝚂𝙸𝚃𝚄𝙰𝙲𝙰𝙾!*`;

        // Envia a mensagem para o grupo com menções
        await sock.sendMessage(groupId, {
            text: message,
            mentions: mentions
        });

        console.log('Usuário infrator e administradores foram mencionados (sem exibir link).');
    } catch (error) {
        console.error('Erro ao notificar administradores e usuário:', error);
    }
};

// Função para extrair texto da mensagem de forma mais robusta
const extractMessageText = (msg) => {
    if (!msg.message) return '';

    // Verifica diferentes tipos de mensagem
    if (msg.message.conversation) {
        return msg.message.conversation;
    }

    if (msg.message.extendedTextMessage) {
        return msg.message.extendedTextMessage.text || '';
    }

    if (msg.message.imageMessage && msg.message.imageMessage.caption) {
        return msg.message.imageMessage.caption;
    }

    if (msg.message.videoMessage && msg.message.videoMessage.caption) {
        return msg.message.videoMessage.caption;
    }

    if (msg.message.documentMessage && msg.message.documentMessage.caption) {
        return msg.message.documentMessage.caption;
    }

    return '';
};

// Função para verificar se uma mensagem ainda existe no grupo
const checkMessageExists = async (sock, groupId, messageKey) => {
    try {
        const messages = await sock.fetchMessagesFromWA(groupId, 20);
        return messages.some(m => m.key.id === messageKey.id);
    } catch (error) {
        console.error('Erro ao verificar existência da mensagem:', error);
        return true; // Assume que existe em caso de erro
    }
};

// Função principal para tratar links não permitidos
export const handleAntiLink = async (sock, msg, groupId) => {
    try {
        // Regex para detectar links
        const linkPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[^\s]+\.[a-z]{2,}\/[^\s]*|\b[a-zA-Z0-9-]+\.(?:com|org|net|edu|gov|mil|int|co|br|uk|de|fr|jp|cn|ru|in|au|ca|io|ly|me|app|tv|fm|live|online|site|tech|info|biz|name|mobi|pro|travel|museum|aero|coop|jobs|cat|xxx|tel|asia|post|geo|xxx)(?:\/[^\s]*)?)/gi;

        // Ignora mensagens do próprio bot
        if (msg.key.fromMe) {
            console.log('Mensagem ignorada: enviada pelo próprio bot');
            return;
        }

        // Verifica se o usuário é administrador
        const senderId = msg.key.participant || msg.key.remoteJid;
        const groupMetadata = await sock.groupMetadata(groupId);
        const senderParticipant = groupMetadata.participants.find(p => p.id === senderId);

        if (senderParticipant && (senderParticipant.admin === 'admin' || senderParticipant.admin === 'superadmin')) {
            console.log('Mensagem de administrador - links permitidos');
            return;
        }

        // Extrai o texto da mensagem
        const text = extractMessageText(msg);

        if (!text || text.trim() === '') {
            console.log('Nenhum texto encontrado na mensagem');
            return;
        }

        // Obtém link oficial do grupo
        const groupInviteLink = await getGroupInviteLink(sock, groupId);
        if (!groupInviteLink) {
            console.error('Não foi possível obter o link de convite do grupo.');
            return;
        }

        const normalizedGroupInviteLink = groupInviteLink
            .replace(/^https?:\/\//, '')
            .toLowerCase()
            .trim();

        // Procura links na mensagem
        const links = text.match(linkPattern);

        if (links && links.length > 0) {
            let shouldDeleteMessage = false;
            let detectedLink = '';

            for (let link of links) {
                const cleanLink = link.trim();
                const normalizedLink = cleanLink
                    .replace(/^https?:\/\//, '')
                    .toLowerCase()
                    .trim();

                if (!normalizedLink.includes(normalizedGroupInviteLink) &&
                    normalizedLink !== normalizedGroupInviteLink) {
                    shouldDeleteMessage = true;
                    detectedLink = cleanLink;
                    break;
                }
            }

            if (shouldDeleteMessage) {
                const offenderId = msg.key.participant || msg.key.remoteJid;

                // Apaga imediatamente antes de tudo
                await sock.sendMessage(groupId, { delete: msg.key }).catch(() => {});

                // Tenta deletar a mensagem com múltiplas tentativas
                const deletionSuccess = await deleteMessageWithRetries(sock, groupId, msg.key);

                // Notifica admins com informação sobre o sucesso da exclusão (sem exibir o link)
                await notifyAdminsAndOffender(sock, groupId, offenderId, detectedLink, deletionSuccess);

                if (!deletionSuccess) {
                    console.log('Tentando método alternativo de exclusão...');
                    try {
                        setTimeout(async () => {
                            await sock.sendMessage(groupId, { delete: msg.key });
                            console.log('Tentativa de exclusão alternativa executada');
                        }, 1500);
                    } catch (altError) {
                        console.error('Método alternativo também falhou:', altError);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Erro no handleAntiLink:', error);
    }
};

// Função adicional para monitorar e tentar re-deletar mensagens que não foram removidas
export const monitorAndCleanupLinks = async (sock, groupId, checkInterval = 30000) => {
    setInterval(async () => {
        try {
            console.log('Executando limpeza periódica de links...');
            // Aqui você pode implementar lógica adicional para verificar mensagens recentes
            // e tentar deletar novamente aquelas que contém links não permitidos
        } catch (error) {
            console.error('Erro na limpeza periódica:', error);
        }
    }, checkInterval);
};

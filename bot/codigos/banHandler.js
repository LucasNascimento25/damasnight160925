// Função principal para gerenciar mensagens de banimento
export async function handleBanMessage(c, message) {
    try {
        const { key, message: msg } = message;
        const from = key.remoteJid; // Identificador do grupo
        const sender = key.participant || key.remoteJid; // Identificador do remetente

        const botId = c.user.id; // ID do bot
        const groupMetadata = await c.groupMetadata(from);
        const isAdmin = groupMetadata.participants.some(
            participant => participant.id === sender && participant.admin
        );

        // Verificação se o remetente é administrador
        if (!isAdmin) {
            console.log('Ação não permitida, o remetente não é um administrador.');
            return;
        }

        // Função anterior: Verificação de imagem com #ban
        if (msg?.imageMessage) { // Verifica se a mensagem é uma imagem
            const imageCaption = msg.imageMessage.caption;

            if (imageCaption?.includes('#ban')) { // Verifica se a legenda contém #ban
                const imageSender = msg.imageMessage.context?.participant;
                if (imageSender && imageSender !== botId) {
                    await executeBanUser(c, from, imageSender, groupMetadata);
                }
            }
        }

        // Função anterior: Verificação de texto estendido com #ban
        if (msg?.extendedTextMessage) { // Verifica se a mensagem é de texto estendido
            const commentText = msg.extendedTextMessage.text;

            if (commentText?.includes('#ban')) { // Verifica se o texto contém #ban
                const quotedMessage = msg.extendedTextMessage.contextInfo;
                const imageSender = quotedMessage?.participant;
                if (imageSender && imageSender !== botId) {
                    await executeBanUser(c, from, imageSender, groupMetadata);
                }
            }
        }

        // Função anterior: Verificação de mensagem com #ban e menção de usuário
        const messageContent = msg?.conversation || msg?.extendedTextMessage?.text;

        if (messageContent?.startsWith('#ban')) { // Verifica se a mensagem começa com #ban
            const mentionedUserName = messageContent.match(/@([^\s][^@]*)/)?.[1]?.trim();
            if (!mentionedUserName) return;

            const userToBan = groupMetadata.participants.find(p =>
                p.id.includes(mentionedUserName.replace(/ /g, '').toLowerCase())
            );

            if (userToBan && userToBan.id !== botId) {
                await executeBanUser(c, from, userToBan.id, groupMetadata);
            }
        }

        // Nova função: Verificação de mensagem no formato @nome #ban
        if (messageContent?.includes('#ban')) { // Verifica se a mensagem contém #ban
            const match = messageContent.match(/@([^\s]+)\s?#ban/); // Nova verificação para @nome #ban
            if (match) { 
                const mentionedUserName = match[1].trim();
                const userToBan = groupMetadata.participants.find(p =>
                    p.id.includes(mentionedUserName.toLowerCase())
                );

                if (userToBan && userToBan.id !== botId) {
                    await executeBanUser(c, from, userToBan.id, groupMetadata);
                }
            }
        }
    } catch (error) {
        console.error('Erro ao processar a mensagem:', error);
    }
}

// Função auxiliar para executar banimento de usuário
async function executeBanUser(c, groupId, userId, groupMetadata) {
    try {
        // Verificar se o usuário a ser banido é administrador
        const isUserAdmin = groupMetadata.participants.some(
            participant => participant.id === userId && participant.admin
        );

        if (isUserAdmin) {
            console.log('O usuário é administrador e não pode ser banido.');
            return;
        }

        await c.groupParticipantsUpdate(groupId, [userId], 'remove');
        console.log(`Usuário ${userId} removido com sucesso.`);
    } catch (error) {
        console.error('Erro ao banir usuário:', error);
    }
}

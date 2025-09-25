// redefinirFecharGrupo.js

export async function handleRevokeLink(sock, msg, chatId) {
    try {
        console.log(`🔗 Iniciando redefinição de link para grupo: ${chatId}`);
        const newInviteCode = await sock.groupRevokeInvite(chatId);
        console.log(`✅ Novo código de convite gerado: ${newInviteCode}`);
        
        await sock.sendMessage(chatId, {
            text: `👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸\n\n✅ *Link do grupo redefinido com sucesso!*`
        }, { quoted: msg });
        
        console.log(`✅ Mensagem de confirmação enviada para o grupo`);
        
    } catch (error) {
        console.error('❌ Erro ao redefinir link:', error);
        
        // Verificar o tipo de erro
        if (error.message.includes('forbidden') || error.message.includes('not admin')) {
            await sock.sendMessage(chatId, {
                text: '👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸\n\n❌ *Erro de permissão!*\n\nEu preciso ser *administrador* do grupo para redefinir o link.\n\n📋 *Como resolver:*\n1. Vá em *Informações do grupo*\n2. Toque em *Participantes*\n3. Encontre o bot na lista\n4. Toque no bot e selecione *"Tornar administrador do grupo"*'
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, {
                text: `👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸\n\n❌ Não foi possível redefinir o link do grupo.\n\n*Erro:* ${error.message}\n\nVerifique se tenho permissões de administrador.`
            }, { quoted: msg });
        }
    }
}

export async function handleCloseGroup(sock, msg, chatId) {
    try {
        console.log(`🔒 Iniciando fechamento de grupo: ${chatId}`);
        await sock.groupSettingUpdate(chatId, 'announcement');
        console.log(`✅ Grupo fechado com sucesso`);
        
        await sock.sendMessage(chatId, {
            text: '👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸\n\nApenas administradores podem enviar mensagens agora. Para reabrir o grupo use o comando #abrir.'
        }, { quoted: msg });
        
        console.log(`✅ Mensagem de confirmação enviada para o grupo`);
        
    } catch (error) {
        console.error('❌ Erro ao fechar grupo:', error);
        
        if (error.message.includes('forbidden') || error.message.includes('not admin')) {
            await sock.sendMessage(chatId, {
                text: '👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸\n\n❌ *Erro de permissão!*\n\nEu preciso ser *administrador* do grupo para fechá-lo.\n\n📋 *Como resolver:*\n1. Vá em *Informações do grupo*\n2. Toque em *Participantes*\n3. Encontre o bot na lista\n4. Toque no bot e selecione *"Tornar administrador do grupo"*'
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, {
                text: `👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸\n\n❌ Não foi possível fechar o grupo.\n\n*Erro:* ${error.message}\n\nVerifique se tenho permissões de administrador.`
            }, { quoted: msg });
        }
    }
}

export async function handleOpenGroup(sock, msg, chatId) {
    try {
        console.log(`🔓 Iniciando abertura de grupo: ${chatId}`);
        await sock.groupSettingUpdate(chatId, 'not_announcement');
        console.log(`✅ Grupo aberto com sucesso`);
        
        await sock.sendMessage(chatId, {
            text: '👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸\n\n🔓 *Grupo reaberto!*\n\nTodos os membros podem enviar mensagens novamente.'
        }, { quoted: msg });
        
        console.log(`✅ Mensagem de confirmação enviada para o grupo`);
        
    } catch (error) {
        console.error('❌ Erro ao abrir grupo:', error);
        
        if (error.message.includes('forbidden') || error.message.includes('not admin')) {
            await sock.sendMessage(chatId, {
                text: '👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸\n\n❌ *Erro de permissão!*\n\nEu preciso ser *administrador* do grupo para abri-lo.\n\n📋 *Como resolver:*\n1. Vá em *Informações do grupo*\n2. Toque em *Participantes*\n3. Encontre o bot na lista\n4. Toque no bot e selecione *"Tornar administrador do grupo"*'
            }, { quoted: msg });
        } else {
            await sock.sendMessage(chatId, {
                text: `👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸\n\n❌ Não foi possível abrir o grupo.\n\n*Erro:* ${error.message}\n\nVerifique se tenho permissões de administrador.`
            }, { quoted: msg });
        }
    }
}

// Função principal para verificar e executar comandos
export async function handleGroupCommands(sock, message) {
    try {
        const from = message.key.remoteJid;
        const userId = message.key.participant || message.key.remoteJid;
        
        const content = 
            message.message.conversation ||
            message.message.extendedTextMessage?.text ||
            '';
        
        if (!content) return false;
        
        const command = content.toLowerCase().split(' ')[0];
        
        console.log(`🎯 Verificando comando: "${command}" de usuário: ${userId} no grupo: ${from}`);
        
        // Verificar se é um comando válido
        if (!['#rlink', '#fdamas', '#abrir'].includes(command)) {
            console.log(`❌ Comando "${command}" não é um comando de grupo válido`);
            return false;
        }
        
        console.log(`✅ Comando "${command}" é válido, processando...`);
        
        // Verificar se é um grupo
        if (!from.endsWith('@g.us')) {
            console.log(`❌ Tentativa de usar comando de grupo em chat privado`);
            await sock.sendMessage(from, { 
                text: '👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸\n\n❌ Este comando só pode ser usado em grupos!' 
            }, { quoted: message });
            return true;
        }
        
        // Verificar se o usuário é admin
        console.log(`🔍 Verificando permissões de admin...`);
        const isUserAdmin = await checkIfUserIsAdmin(sock, from, userId);
        if (!isUserAdmin) {
            console.log(`❌ Usuário não é admin, comando negado`);
            await sock.sendMessage(from, { 
                text: '👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸\n\n❌ Apenas administradores podem usar este comando!' 
            }, { quoted: message });
            return true;
        }
        
        // Verificar se o bot é admin
        const isBotAdmin = await checkIfBotIsAdmin(sock, from);
        if (!isBotAdmin) {
            console.log(`❌ Bot não é admin, comando não pode ser executado`);
            await sock.sendMessage(from, { 
                text: '👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸\n\n❌ Preciso ser administrador do grupo para executar este comando!' 
            }, { quoted: message });
            return true;
        }
        
        console.log(`🎉 Todas as verificações passaram! Executando comando: ${command}`);
        
        // Executar comando
        switch (command) {
            case '#rlink':
                console.log(`🔗 Executando redefinição de link...`);
                await handleRevokeLink(sock, message, from);
                break;
            case '#fdamas':
                console.log(`🔒 Executando fechamento de grupo...`);
                await handleCloseGroup(sock, message, from);
                break;
            case '#abrir':
                console.log(`🔓 Executando abertura de grupo...`);
                await handleOpenGroup(sock, message, from);
                break;
        }
        
        console.log(`✅ Comando ${command} executado com sucesso!`);
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao processar comando de grupo:', error);
        return false;
    }
}

// Função auxiliar para verificar se usuário é admin
async function checkIfUserIsAdmin(sock, groupId, userId) {
    try {
        console.log(`🔍 Verificando se ${userId} é admin do grupo ${groupId}`);
        
        const groupMetadata = await sock.groupMetadata(groupId);
        console.log(`👥 Total de participantes: ${groupMetadata.participants.length}`);
        
        // Procurar o usuário nos participantes
        const participant = groupMetadata.participants.find(p => {
            // Comparar com diferentes formatos possíveis
            const pId = p.id.includes('@') ? p.id : `${p.id}@s.whatsapp.net`;
            const uId = userId.includes('@') ? userId : `${userId}@s.whatsapp.net`;
            return pId === uId || p.id === userId || pId.split('@')[0] === uId.split('@')[0];
        });
        
        console.log(`👤 Participante encontrado:`, participant ? {
            id: participant.id,
            admin: participant.admin
        } : 'Não encontrado');
        
        if (!participant) {
            console.log(`❌ Usuário ${userId} não encontrado no grupo`);
            return false;
        }
        
        const isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
        console.log(`🔑 ${userId} é admin: ${isAdmin}`);
        
        return isAdmin;
    } catch (error) {
        console.error('❌ Erro ao verificar admin do usuário:', error);
        return false;
    }
}

// Função auxiliar para verificar se bot é admin
async function checkIfBotIsAdmin(sock, groupId) {
    try {
        const groupMetadata = await sock.groupMetadata(groupId);
        const botJid = sock.user?.jid || sock.user?.id;
        
        console.log(`🤖 Verificando se bot ${botJid} é admin do grupo`);
        
        // Extrair apenas o número do bot (sem :XX e @s.whatsapp.net)
        const botNumber = botJid.split(':')[0].split('@')[0];
        console.log(`📱 Número do bot extraído: ${botNumber}`);
        
        const participant = groupMetadata.participants.find(p => {
            // Extrair número do participante
            const participantNumber = p.id.split(':')[0].split('@')[0];
            
            console.log(`🔍 Comparando bot ${botNumber} com participante ${participantNumber} (ID completo: ${p.id})`);
            
            return participantNumber === botNumber || 
                   p.id === botJid || 
                   p.id === `${botNumber}@s.whatsapp.net` ||
                   p.id.includes(botNumber);
        });
        
        console.log(`🤖 Bot participante:`, participant ? {
            id: participant.id,
            admin: participant.admin
        } : 'Não encontrado');
        
        if (!participant) {
            console.log(`❌ Bot não encontrado no grupo`);
            console.log(`🔍 Lista de todos os participantes:`);
            groupMetadata.participants.forEach((p, index) => {
                console.log(`   ${index + 1}. ${p.id} - Admin: ${p.admin || 'false'}`);
            });
            
            // ⚠️ IMPORTANTE: Retorna true para tentar executar mesmo assim
            // Alguns bots não aparecem na lista de participantes mas têm permissões
            console.log(`⚠️ Tentando executar comando mesmo sem encontrar bot na lista...`);
            return true;
        }
        
        const isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
        console.log(`🔑 Bot é admin: ${isAdmin}`);
        
        return isAdmin;
    } catch (error) {
        console.error('❌ Erro ao verificar admin do bot:', error);
        // Em caso de erro, tenta executar mesmo assim
        return true;
    }
}
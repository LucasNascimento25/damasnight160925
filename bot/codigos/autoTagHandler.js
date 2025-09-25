// autoTagHandler.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AutoTagHandler {
    constructor() {
        this.groupsFile = path.join(__dirname, '../data/groups.json');
        this.loadGroups();
    }

    loadGroups() {
        try {
            if (fs.existsSync(this.groupsFile)) {
                const data = fs.readFileSync(this.groupsFile, 'utf8');
                this.groups = JSON.parse(data);
            } else {
                this.groups = {};
                this.saveGroups();
            }
        } catch (error) {
            console.error('❌ Erro ao carregar grupos:', error);
            this.groups = {};
        }
    }

    saveGroups() {
        try {
            const dir = path.dirname(this.groupsFile);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.groupsFile, JSON.stringify(this.groups, null, 2));
        } catch (error) {
            console.error('❌ Erro ao salvar grupos:', error);
        }
    }

    async updateGroup(sock, groupId) {
        try {
            const groupMetadata = await sock.groupMetadata(groupId);
            const participants = groupMetadata.participants.map(p => ({
                id: p.id,
                isAdmin: p.admin !== null
            }));

            if (!this.groups[groupId]) this.groups[groupId] = { enabled: true, adminOnly: false };
            
            this.groups[groupId].name = groupMetadata.subject;
            this.groups[groupId].participants = participants;
            this.groups[groupId].lastUpdated = new Date().toISOString();

            this.saveGroups();
            return participants.length;
        } catch (error) {
            console.error('❌ Erro ao atualizar grupo:', error);
            return 0;
        }
    }

    async processMessage(sock, from, userId, content) {
        try {
            if (!from.endsWith('@g.us')) return null;
            if (!content.toLowerCase().includes('#all damas')) return null;

            const groupId = from;

            // Verifica se o grupo está ativo
            if (this.groups[groupId] && !this.groups[groupId].enabled) return null;

            // VERIFICA SE O USUÁRIO É ADMIN - AGORA OBRIGATÓRIO
            const isAdmin = await this.isUserAdmin(sock, groupId, userId);
            if (!isAdmin) {
                const styledTitle = "👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸";
                return { 
                    error: true, 
                    message: `${styledTitle}\n\n🚫 *ACESSO NEGADO*\n\n❌ Apenas administradores podem usar o comando \`#all damas\`!\n\n👨‍💼 Solicite a um admin para marcar o grupo.` 
                };
            }

            // Atualiza o grupo se necessário
            if (!this.groups[groupId] || this.isGroupOutdated(groupId)) {
                await this.updateGroup(sock, groupId);
            }

            const groupData = this.groups[groupId];
            if (!groupData || !groupData.participants) return null;

            const cleanMessage = content.replace(/#all\s+damas/gi, '').trim();
            const mentions = this.generateMentions(groupData.participants, userId);

            // Adiciona o título estilizado na mensagem
            const styledTitle = "👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸";
            const finalMessage = cleanMessage ? `${styledTitle}\n\n${cleanMessage}` : styledTitle;

            return {
                originalMessage: content,
                cleanMessage: finalMessage,
                mentions,
                tagsCount: mentions.length,
                groupName: groupData.name
            };
        } catch (error) {
            console.error('❌ Erro ao processar auto tag:', error);
            return null;
        }
    }

    async isUserAdmin(sock, groupId, userId) {
        try {
            // Primeiro tenta pelo método direto
            if (sock.isGroupAdmin) {
                return await sock.isGroupAdmin(groupId, userId);
            }

            // Método alternativo: busca nos metadados do grupo
            const groupMetadata = await sock.groupMetadata(groupId);
            const participant = groupMetadata.participants.find(p => p.id === userId);
            return participant?.admin !== null && participant?.admin !== undefined;
        } catch (error) {
            console.error('❌ Erro ao verificar admin:', error);
            return false;
        }
    }

    generateMentions(participants, authorId) {
        return participants.filter(p => p.id !== authorId).map(p => p.id);
    }

    isGroupOutdated(groupId) {
        if (!this.groups[groupId]?.lastUpdated) return true;
        const lastUpdate = new Date(this.groups[groupId].lastUpdated);
        return (Date.now() - lastUpdate.getTime()) > 3600000; // 1 hora
    }

    async handleAdminCommands(sock, from, userId, content) {
        if (!from.endsWith('@g.us')) return false;
        if (!content.startsWith('!autotag-')) return false;

        const isAdmin = await this.isUserAdmin(sock, from, userId);
        if (!isAdmin) {
            await sock.sendMessage(from, { text: '❌ Apenas administradores podem usar comandos do AutoTag!' });
            return true;
        }

        if (content === '!autotag-update') {
            const count = await this.updateGroup(sock, from);
            await sock.sendMessage(from, { 
                text: `✅ *GRUPO ATUALIZADO*\n\n📊 ${count} membros encontrados\n🕒 ${new Date().toLocaleString('pt-BR')}\n\n💡 Apenas admins podem usar \`#all damas\`` 
            });
            return true;
        }

        if (content === '!autotag-status') {
            const status = this.getGroupStatus(from);
            const statusText = `
🏷️ *STATUS DO AUTOTAG*

📊 *Participantes:* ${status.participants}
🔧 **Ativo:** ${status.enabled ? '✅ Sim' : '❌ Não'}
🔐 *Restrição:* 👨‍💼 Apenas Administradores
🕒 *Última Atualização:* ${status.lastUpdated !== 'Nunca' ? new Date(status.lastUpdated).toLocaleString('pt-BR') : 'Nunca'}

*Use !autotag-help para ver comandos*
            `.trim();
            await sock.sendMessage(from, { text: statusText });
            return true;
        }

        if (content === '!autotag-on') { 
            await this.toggleGroupStatus(from, true); 
            await sock.sendMessage(from, { 
                text: '✅ *AUTOTAG ATIVADO*\n\n🔐 Apenas administradores podem usar `#all damas`' 
            }); 
            return true; 
        }

        if (content === '!autotag-off') { 
            await this.toggleGroupStatus(from, false); 
            await sock.sendMessage(from, { text: '❌ AutoTag desativado neste grupo!' }); 
            return true; 
        }

        // Removidos os comandos admin-on/off já que agora é sempre restrito para admins
        if (content === '!autotag-admin-on' || content === '!autotag-admin-off') {
            await sock.sendMessage(from, { 
                text: '💡 *INFORMAÇÃO*\n\nO AutoTag agora é sempre restrito para administradores!\n\n🔐 Apenas admins podem usar `#all damas`' 
            });
            return true;
        }

        if (content === '!autotag-help') {
            const helpText = `
🏷️ *COMANDOS DO AUTOTAG*

👨‍💼 *Para Administradores:*
- \`Sua mensagem #all damas\` - Marca todos
- \`!autotag-status\` - Ver status do grupo
- \`!autotag-update\` - Atualizar lista de membros
- \`!autotag-on/off\` - Ativar/Desativar sistema
- \`!autotag-help\` - Esta ajuda

🔐 *RESTRIÇÃO DE ACESSO*
Apenas administradores podem usar o comando \`#all damas\`

✨ *Como usar:*
Digite sua mensagem normalmente e adicione \`#all damas\` no final. 

📝 *Exemplo:*
\`Festa hoje às 22h #all damas\`

💃 **Resultado:**
👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸

Festa hoje às 22h

🔔 *Todos os membros recebem notificação automaticamente (menções invisíveis)*

⚠️ *Usuários comuns* que tentarem usar receberão uma mensagem de acesso negado.
            `.trim();
            await sock.sendMessage(from, { text: helpText });
            return true;
        }

        return false;
    }

    async toggleGroupStatus(groupId, enabled) {
        if (!this.groups[groupId]) this.groups[groupId] = { enabled: true, adminOnly: false };
        this.groups[groupId].enabled = enabled;
        this.saveGroups();
        return enabled;
    }

    async toggleAdminOnly(groupId, adminOnly) {
        if (!this.groups[groupId]) this.groups[groupId] = { enabled: true, adminOnly: false };
        this.groups[groupId].adminOnly = adminOnly;
        this.saveGroups();
        return adminOnly;
    }

    getGroupStatus(groupId) {
        const group = this.groups[groupId];
        return {
            enabled: group?.enabled ?? true,
            adminOnly: true, // Agora sempre true
            participants: group?.participants?.length ?? 0,
            lastUpdated: group?.lastUpdated ?? 'Nunca'
        };
    }
}

export default AutoTagHandler;
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

            if (this.groups[groupId] && !this.groups[groupId].enabled) return null;

            if (this.groups[groupId]?.adminOnly) {
                const isAdmin = await this.isUserAdmin(sock, groupId, userId);
                if (!isAdmin) return { error: true, message: '❌ Apenas admins podem usar o #all damas neste grupo!' };
            }

            if (!this.groups[groupId] || this.isGroupOutdated(groupId)) {
                await this.updateGroup(sock, groupId);
            }

            const groupData = this.groups[groupId];
            if (!groupData || !groupData.participants) return null;

            const cleanMessage = content.replace(/#all\s+damas/gi, '').trim();
            const mentions = this.generateMentions(groupData.participants, userId);

            return {
                originalMessage: content,
                cleanMessage,
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
            return await sock.isGroupAdmin?.(groupId, userId) || false;
        } catch {
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

        const isAdmin = await sock.isGroupAdmin?.(from, userId) || false;
        if (!isAdmin) {
            await sock.sendMessage(from, { text: '❌ Apenas admins podem usar comandos do AutoTag!' });
            return true;
        }

        if (content === '!autotag-update') {
            const count = await this.updateGroup(sock, from);
            await sock.sendMessage(from, { text: `✅ Grupo atualizado!\n📊 ${count} membros encontrados\n🕒 ${new Date().toLocaleString('pt-BR')}` });
            return true;
        }

        if (content === '!autotag-status') {
            const status = this.getGroupStatus(from);
            const statusText = `
🏷️ *STATUS DO AUTOTAG*

📊 **Participantes:** ${status.participants}
🔧 **Ativo:** ${status.enabled ? '✅ Sim' : '❌ Não'}
👨‍💼 **Admin Only:** ${status.adminOnly ? '✅ Sim' : '❌ Não'}
🕒 **Última Atualização:** ${status.lastUpdated !== 'Nunca' ? new Date(status.lastUpdated).toLocaleString('pt-BR') : 'Nunca'}

*Use !autotag-help para ver comandos*
            `.trim();
            await sock.sendMessage(from, { text: statusText });
            return true;
        }

        if (content === '!autotag-on') { await this.toggleGroupStatus(from, true); await sock.sendMessage(from, { text: '✅ AutoTag ativado neste grupo!' }); return true; }
        if (content === '!autotag-off') { await this.toggleGroupStatus(from, false); await sock.sendMessage(from, { text: '❌ AutoTag desativado neste grupo!' }); return true; }
        if (content === '!autotag-admin-on') { await this.toggleAdminOnly(from, true); await sock.sendMessage(from, { text: '🔒 AutoTag agora é apenas para admins!' }); return true; }
        if (content === '!autotag-admin-off') { await this.toggleAdminOnly(from, false); await sock.sendMessage(from, { text: '🔓 AutoTag liberado para todos os membros!' }); return true; }

        if (content === '!autotag-help') {
            const helpText = `
🏷️ *COMANDOS DO AUTOTAG*

📋 **Para Usuários:**
- \`Sua mensagem #all damas\` - Marca todos

👨‍💼 **Para Admins:**
- \`!autotag-status\` - Ver status
- \`!autotag-update\` - Atualizar lista
- \`!autotag-on/off\` - Ativar/Desativar
- \`!autotag-admin-on/off\` - Modo admin
- \`!autotag-help\` - Esta ajuda

✨ **Como usar:**
Digite sua mensagem normalmente e adicione \`#all damas\` no final. O \`#all damas\` desaparece e todos recebem notificação!
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
            adminOnly: group?.adminOnly ?? false,
            participants: group?.participants?.length ?? 0,
            lastUpdated: group?.lastUpdated ?? 'Nunca'
        };
    }
}

export default AutoTagHandler;

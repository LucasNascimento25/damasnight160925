// Arquivo: bloquearUsuarios.js

// Função para inicializar e configurar o bot com bloqueio de mensagens privadas
async function configurarBloqueio(sock) {
    // IDs dos usuários que não devem ser bloqueados
    const usuariosPermitidos = [
        '5521979452941@s.whatsapp.net',
        '5516981874405@s.whatsapp.net',
        '558398759516@s.whatsapp.net',
        '5521972337640@s.whatsapp.net'
    ];

    // Função para processar mensagens recebidas
    sock.ev.on('messages.upsert', async (msg) => {
        const mensagem = msg.messages[0];
        if (!mensagem.message) return;

        const remetenteId = mensagem.key.remoteJid;

        // Verifica se a mensagem é privada (ID termina com '@s.whatsapp.net')
        if (remetenteId.endsWith('@s.whatsapp.net')) {
            // Ignora usuários permitidos
            if (usuariosPermitidos.includes(remetenteId)) {
                console.log(`Mensagem de usuário permitido: ${remetenteId}`);
                return; // Não bloqueia e sai da função
            }

            // Bloqueia o usuário imediatamente após a primeira mensagem
            try {
                // Bloqueia o usuário sem enviar mensagem de aviso
                await sock.updateBlockStatus(remetenteId, 'block');
                console.log(`Usuário ${remetenteId} bloqueado após enviar 1 mensagem.`);
            } catch (error) {
                console.error(`Erro ao bloquear usuário ${remetenteId}: ${error.message}`);
            }
        }
    });
}

export default configurarBloqueio;

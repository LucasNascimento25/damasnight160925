// bot.js - Damas da Night Bot - Versão Ultra Limpa
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import pino from 'pino';
import { handleMessages } from './bot/codigos/messageHandler.js';
import { configurarBoasVindas } from './bot/codigos/boasVindas.js';
import { configurarDespedida } from './bot/codigos/despedidaMembro.js';
import { isBlacklistedRealtime } from './bot/codigos/blacklistFunctions.js';
import { iniciarVerificacaoPeriodica, verificarBlacklistAgora } from './bot/codigos/blacklistCron.js'; // ⬅️ cron + manual

// Logger customizado (apenas erros críticos)
const logger = pino({ level: 'fatal', enabled: false });

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 3000;
let isConnecting = false;

console.clear();
console.log("🌙 =======================================");
console.log("🌙    DAMAS DA NIGHT - WhatsApp Bot      ");
console.log("🌙 =======================================\n");

async function connectToWhatsApp() {
    if (isConnecting) return;
    isConnecting = true;

    try {
        console.log("🔄 Conectando ao WhatsApp...");

        const { version } = await fetchLatestBaileysVersion();
        const { state, saveCreds } = await useMultiFileAuthState('./auth_info');

        const sock = makeWASocket({
            version,
            auth: state,
            printQRInTerminal: false,
            logger,
            defaultQueryTimeoutMs: 30000,
            keepAliveIntervalMs: 25000,
            markOnlineOnConnect: false,
            syncFullHistory: false,
            getMessage: async () => undefined,
            generateHighQualityLinkPreview: false,
            markMessageAsReadWhenReceived: false,
            browser: ['Damas da Night', 'Chrome', '1.0.0'],
            connectTimeoutMs: 30000,
            retryRequestDelayMs: 250,
            maxMsgRetryCount: 2,
            transactionOpts: { maxCommitRetries: 1, delayBetweenTriesMs: 1000 }
        });

        sock.ev.on("creds.update", saveCreds);

        sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
            if (qr) {
                console.log("\n📱 Escaneie o QR Code:");
                console.log("=".repeat(50));
                qrcode.generate(qr, { small: true });
                console.log("=".repeat(50));
            }

            if (connection === "open") {
                console.log("✅ DAMAS DA NIGHT Bot conectado com sucesso!");
                console.log("💾 Conexão com banco de dados: OK");
                console.log("🚀 Bot operacional e monitorando grupos...\n");

                reconnectAttempts = 0;
                isConnecting = false;

                if (!fs.existsSync('./downloads')) fs.mkdirSync('./downloads', { recursive: true });

                // ⬇️ Cron de verificação periódica
                iniciarVerificacaoPeriodica(sock);
            }

            if (connection === "close") {
                isConnecting = false;
                const statusCode = lastDisconnect?.error?.output?.statusCode;

                console.log("⚠️  Bot desconectado");

                const shouldReconnect = statusCode !== DisconnectReason.loggedOut &&
                                        statusCode !== 401 &&
                                        reconnectAttempts < MAX_RECONNECT_ATTEMPTS;

                if (shouldReconnect) {
                    reconnectAttempts++;
                    console.log(`🔄 Reconectando... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                    setTimeout(() => connectToWhatsApp(), RECONNECT_DELAY);
                } else {
                    if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                        console.log("🚪 Bot foi deslogado. Execute novamente e escaneie o QR.");
                    } else {
                        console.log("❌ Falha na reconexão. Reinicie o bot.");
                    }
                }
            }
        });

        // Monitoramento de entrada/saída de membros
        sock.ev.on('group-participants.update', async (update) => {
            try {
                const groupId = update.id;
                const groupName = (await sock.groupMetadata(groupId)).subject;

                for (const participant of update.participants) {
                    const userPhone = participant.split('@')[0];

                    if (update.action === 'add') {
                        const blacklisted = await isBlacklistedRealtime(participant);

                        if (blacklisted) {
                            await sock.groupParticipantsUpdate(groupId, [participant], 'remove');
                            console.log(`🚨 Usuário ${userPhone} removido (blacklist) - ${groupName}`);
                        } else {
                            await configurarBoasVindas(sock, groupId, participant);
                        }
                    } else if (update.action === 'remove') {
                        await configurarDespedida(sock, groupId, participant);
                    }
                }
            } catch (error) { }
        });

        // Processamento de mensagens otimizado
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== 'notify') return;

            try {
                const validMessages = messages.filter(msg => msg &&
                    !msg.key.fromMe &&
                    msg.messageTimestamp &&
                    (Date.now() - (msg.messageTimestamp * 1000)) < 30000
                );

                for (const message of validMessages) {
                    await handleMessages(sock, message);

                    // 🔹 Comando manual de blacklist (somente admins)
                    const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text;
                    if (messageText && messageText.toLowerCase() === '#veriflista') {
                        const groupId = message.key.remoteJid;

                        // 1️⃣ Obter lista de admins do grupo
                        const metadata = await sock.groupMetadata(groupId);
                        const admins = metadata.participants
                            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                            .map(p => p.id);

                        const sender = message.key.participant || message.key.remoteJid;

                        // 2️⃣ Verificar se quem enviou é admin
                        if (!admins.includes(sender)) {
                            await sock.sendMessage(groupId, { text: '❌ Apenas administradores podem usar este comando.' });
                            continue;
                        }

                        // 3️⃣ Executar verificação manual
                        await verificarBlacklistAgora(sock, groupId);
                        await sock.sendMessage(groupId, { text: '✅ Verificação da blacklist executada neste grupo.' });
                    }
                }
            } catch (error) { }
        });

        return sock;

    } catch (error) {
        console.error("❌ Erro na conexão:", error.message);
        isConnecting = false;

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            setTimeout(connectToWhatsApp, RECONNECT_DELAY);
        }
    }
}

// Handlers do sistema
process.on('SIGINT', () => { console.log('\n🌙 Damas da Night Bot desconectado'); process.exit(0); });
process.on('SIGTERM', () => { console.log('\n🌙 Bot finalizado'); process.exit(0); });

// Suprimir erros não críticos
process.on('unhandledRejection', () => { });
process.on('uncaughtException', (error) => {
    if (error.message.includes('baileys') || error.message.includes('socket')) return;
    console.error('❌ Erro crítico:', error.message);
});

// Iniciar bot
connectToWhatsApp();

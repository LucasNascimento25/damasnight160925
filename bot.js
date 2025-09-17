import 'dotenv/config';
import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import pino from 'pino';
import { handleMessages } from './bot/codigos/messageHandler.js';
import { configurarBoasVindas } from './bot/codigos/boasVindas.js';
import { configurarDespedida } from './bot/codigos/despedidaMembro.js';
import { isBlacklistedRealtime } from './bot/codigos/blacklistFunctions.js';
import { verificarBlacklistAgora } from './bot/codigos/blacklistChecker.js';
import pool from './db.js';

const logger = pino({ level: 'fatal', enabled: false });
const BOT_TITLE = '👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸';

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

        // Conexão e QR code
        sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
            if (qr) {
                console.log("\n📱 Escaneie o QR Code:");
                console.log("=".repeat(50));
                qrcode.generate(qr, { small: true });
                console.log("=".repeat(50));
            }

            if (connection === "open") {
                console.log(`✅ ${BOT_TITLE} Bot conectado com sucesso!`);
                console.log("💾 Conexão com banco de dados: OK");
                console.log("🚀 Bot operacional e monitorando grupos...\n");

                reconnectAttempts = 0;
                isConnecting = false;

                if (!fs.existsSync('./downloads')) fs.mkdirSync('./downloads', { recursive: true });
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

        // Eventos de participantes do grupo
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
            } catch (error) {
                console.error('❌ Erro no evento de participantes:', error);
            }
        });

        // Listener de mensagens
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== 'notify') return;

            try {
                const validMessages = messages.filter(msg =>
                    msg &&
                    !msg.key.fromMe &&
                    msg.messageTimestamp &&
                    (Date.now() - (msg.messageTimestamp * 1000)) < 30000
                );

                for (const message of validMessages) {
                    await handleMessages(sock, message);

                    const messageText = message.message?.conversation || message.message?.extendedTextMessage?.text;
                    if (messageText && messageText.toLowerCase() === '#veriflista') {
                        const groupId = message.key.remoteJid;
                        const sender = message.key.participant || message.key.remoteJid;

                        // Verifica admin consultando participantes
                        const metadata = await sock.groupMetadata(groupId);
                        const participantData = metadata.participants.find(p => p.id === sender);
                        const isAdmin = participantData?.admin === 'admin' || participantData?.admin === 'superadmin';

                        if (!isAdmin) {
                            const adminMsg = await sock.sendMessage(groupId, { text: `${BOT_TITLE} ❌ Apenas administradores podem usar este comando.` });
                            setTimeout(async () => {
                                await sock.sendMessage(groupId, { delete: { remoteJid: adminMsg.key.remoteJid, id: adminMsg.key.id, fromMe: true } });
                            }, 8000);
                            continue;
                        }

                        // Mensagem temporária de checando blacklist
                        const checkingMsg = await sock.sendMessage(groupId, { text: `${BOT_TITLE} 🔎 Checando a blacklist...` });

                        // Executa verificação otimizada da blacklist
                        const removidos = await verificarBlacklistAgora(sock, groupId);

                        // Prepara mensagem de resultado
                        const resultText = removidos.length > 0
                            ? `${BOT_TITLE} 🚨 *Blacklist Atualizada* 💃🎶\n✅ ${removidos.length} usuário(s) removido(s) do grupo:\n• ${removidos.join('\n• ')}`
                            : `${BOT_TITLE} ✅ Nenhum usuário da blacklist encontrado neste grupo.`;

                        // Envia resultado
                        const resultMsg = await sock.sendMessage(groupId, { text: resultText });

                        // Remove todas as mensagens relacionadas ao #veriflista após 8 segundos
                        setTimeout(async () => {
                            await sock.sendMessage(groupId, { delete: { remoteJid: checkingMsg.key.remoteJid, id: checkingMsg.key.id, fromMe: true } });
                            await sock.sendMessage(groupId, { delete: { remoteJid: resultMsg.key.remoteJid, id: resultMsg.key.id, fromMe: true } });
                        }, 8000);
                    }
                }
            } catch (error) {
                console.error('❌ Erro no listener de mensagens:', error);
            }
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

// Finalização limpa
process.on('SIGINT', () => { console.log(`\n🌙 ${BOT_TITLE} Bot desconectado`); process.exit(0); });
process.on('SIGTERM', () => { console.log(`\n🌙 ${BOT_TITLE} Bot finalizado`); process.exit(0); });
process.on('unhandledRejection', () => { });
process.on('uncaughtException', (error) => {
    if (error.message.includes('baileys') || error.message.includes('socket')) return;
    console.error('❌ Erro crítico:', error.message);
});

connectToWhatsApp();

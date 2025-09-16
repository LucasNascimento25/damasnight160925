import Jimp from 'jimp';
import axios from 'axios';

/**
 * Gera uma thumbnail da imagem a partir de um buffer
 */
async function gerarThumbnail(buffer, size = 256) {
    try {
        const image = await Jimp.read(buffer);
        image.resize(size, size);
        return await image.getBufferAsync(Jimp.MIME_PNG);
    } catch (err) {
        console.error('Erro ao gerar thumbnail:', err);
        return null;
    }
}

/**
 * Envia imagem com thumbnail usando Baileys
 */
async function sendImageWithThumbnail(sock, jid, imageBuffer, caption, mentions = []) {
    try {
        const thumb = await gerarThumbnail(imageBuffer, 256);
        await sock.sendMessage(jid, {
            image: imageBuffer,
            caption,
            jpegThumbnail: thumb,
            mentions
        });
    } catch (err) {
        console.error('Erro ao enviar imagem com thumbnail:', err);
        await sock.sendMessage(jid, { text: caption, mentions });
    }
}

/**
 * Envia as regras do grupo após 10 segundos
 */
async function enviarRegrasAposDelay(socket, groupId, participant) {
    setTimeout(async () => {
        try {
            const participantName = participant.split('@')[0];
            const groupMetadata = await socket.groupMetadata(groupId);
            const regras = groupMetadata.desc || "Não há regras definidas na descrição do grupo.";
            
            const mensagem = `@${participantName}, aqui estão as regras do grupo:\n\n📋 ${regras}`;
            
            await socket.sendMessage(groupId, {
                text: mensagem,
                mentions: [participant]
            });
            
        } catch (error) {
            console.error('Erro ao enviar regras:', error);
        }
    }, 10000);
}

/**
 * Configura mensagens de boas-vindas
 */
export const configurarBoasVindas = async (socket, groupId, participant) => {
    try {
        const participantName = participant.split('@')[0];

        // Obtendo foto de perfil
        let profilePictureUrl;
        try {
            profilePictureUrl = await socket.profilePictureUrl(participant, 'image');
        } catch {
            profilePictureUrl = 'https://images2.imgbox.com/a5/a4/gyGTUylB_o.png';
        }

        // Mensagens de boas-vindas
        const welcomeMessages = [
            
           `🎉💃 𝐁𝐄𝐌-𝐕𝐈𝐍𝐃𝐎(𝐀) 𝐚𝐨 𝐠𝐫𝐮𝐩𝐨 👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ*💃🎶🍾🍸 @${participantName} ✨🎉 
            \n Aqui é um espaço de interação e diversão 24 horas! 🕛🔥 Participe das conversas e aproveite bons momentos com a gente! 💃🎶🍾🍸 
            \n\nDigite *#regras* para saber quais são.`,

            `💃👏 𝐎𝐁𝐀! 𝐓𝐄𝐌𝐎𝐒 𝐍𝐎𝐕𝐈𝐃𝐀𝐃𝐄𝐒! 🎊✨  
            \n 𝐒𝐄𝐉𝐀 𝐌𝐔𝐈𝐓𝐎 𝐁𝐄𝐌-𝐕𝐈𝐍𝐃𝐎(𝐀) 𝐀𝐎 𝐆𝐑𝐔𝐏𝐎 🌟💬 *DﾑMﾑS* 💃🔥 *Dﾑ NIGӇԵ* 🎶💥 @${participantName}, sua presença já deixou tudo mais animado! 🙌🎉
            \n 🎈 Aqui é o espaço perfeito pra se divertir e trocar ideias incríveis, 24/7! 💬🔥`,

            `💃👏 𝐒𝐄𝐍𝐒𝐀𝐂𝐈𝐎𝐍𝐀𝐋! ✨ 𝐌𝐀𝐈𝐒 𝐔𝐌𝐀 𝐏𝐄𝐒𝐒𝐎𝐀 𝐀𝐍𝐈𝐌𝐀𝐃𝐀 𝐍𝐎 𝐆𝐑𝐔𝐏𝐎! 🎉🔥  
            \n 𝐎𝐋𝐀́, @${participantName} 🌟💃 *DﾑMﾑS* 🎶 *Dﾑ NIGӇԵ* 🎊 está em festa com sua chegada! 🙌💥  
            \n 🎈 Aqui a diversão rola solta e a troca de ideias não para, 24/7! 💬✨ Sinta-se à vontade para interagir e brilhar com a galera! 🌟🥳`,

            `💃💥 *𝐄𝐒𝐓𝐎𝐔𝐑𝐎𝐔!* 🎇 𝐍𝐎𝐒𝐒𝐎 𝐆𝐑𝐔𝐏𝐎 𝐆𝐀𝐍𝐇𝐎𝐔 𝐌𝐀𝐈𝐒 𝐔𝐌 𝐌𝐄𝐌𝐁𝐑𝐎 𝐒𝐔𝐏𝐄𝐑 𝐄𝐒𝐓𝐈𝐋𝐎(𝐀)! 🔥✨
            \n 🥳 𝐒𝐄𝐉𝐀 𝐌𝐔𝐈𝐓𝐎 𝐁𝐄𝐌-𝐕𝐈𝐍𝐃𝐎(𝐀) @${participantName} 🌟🎶 *DﾑMﾑS* 💃 *Dﾑ NIGӇԵ* 🎉 está com tudo agora com você por aqui! 💬✨  
            \n 🚀 Aqui o clima é de energia positiva e muita conexão! Não economize nos emojis e nem nas risadas! 😂`,
            
            `💃🎶🔥 𝐁𝐄𝐌-𝐕𝐈𝐍𝐃𝐎(𝐀) 𝐚𝐨 𝐠𝐫𝐮𝐩𝐨 👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸 @${participantName}💃🍾 Você acaba de aterrissar no grupo mais animado de todos! 💃🎶🍾🍸
            \n O clima aqui é pura festa, diversão e muita interação 24h por dia! 🕛🔥 Vamos agitar as conversas e aproveitar cada segundo com muita alegria! 💬🎶🍾🍸`,

            `💃🎊🌟 *PREPARA QUE A DIVERSÃO COMEÇOU @${participantName} 🎉* Agora a vibe é só alegria, dança e muita energia boa no 💃🔥 *DﾑMﾑS* 🎶 *Dﾑ* *NIGӇԵ* 🍸💥
            \n A festa agora tá completa com você por aqui! O clima é de pura energia 24h por dia! 🕛🔥 Vamos agitar, dançar e se divertir até não aguentar mais! 💬🎶🍾🍸`,

            `💃🍾🍸 𝐁𝐄𝐌-𝐕𝐈𝐍𝐃𝐎(𝐀) 𝐚𝐨 𝐠𝐫𝐮𝐩𝐨 👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸 @${participantName} 
            \n *Agora a energia do grupo subiu!* 🚀 Aqui, a diversão não tem hora pra começar e nem pra terminar! *24h de pura interação e boas vibrações!* 🕛🔥 Prepare-se para momentos épicos com muitos emojis, risadas e danças até o amanhecer! 💃🎶🍾🍸`,

            `🎉👏💃 𝐁𝐄𝐌-𝐕𝐈𝐍𝐃𝐎(𝐀) @${participantName} 𝐚𝐨 𝐠𝐫𝐮𝐩𝐨 👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸 Agora o grupo *DﾑMﾑS* está ainda mais poderoso!
            \n 🚀💃 Prepare-se para uma onda de diversão, risadas e muita dança! 🎶🔥 Aqui, a diversão nunca para! Emojis, vibrações positivas e muita interação o tempo todo! 🕛🎉`,

            `👏💃🔥 𝐁𝐄𝐌-𝐕𝐈𝐍𝐃𝐎(𝐀) @${participantName} 𝐚𝐨 𝐠𝐫𝐮𝐩𝐨 👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸
            \n Agora o clima do grupo *DﾑMﾑS* está ON FIRE! 🔥 Vamos criar momentos inesquecíveis com muitas risadas, emojis e danças! 🎶💥 *Aqui, a diversão é garantida 24h por dia! Não tem hora pra parar!* 💃🕛🍸🍾`,

            `🎉💥 𝐁𝐄𝐌-𝐕𝐈𝐍𝐃𝐎(𝐀) @${participantName} 𝐚𝐨 𝐠𝐫𝐮𝐩𝐨 👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ* *NIGӇԵ* 💃🎶🍾🍸
            \n A vibe do grupo *DﾑMﾑS* acaba de subir ainda mais com você aqui! 🚀🎶 Prepare-se para curtir uma energia contagiante, com risadas, dança e emojis 24h por dia! 💃🎉🔥 Aqui, a diversão nunca tem fim! Vamos agitar, rir e viver os melhores momentos juntos! 🎊🍾🕛`
        ];

        const selectedMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];

        // Enviando mensagem de boas-vindas
        if (profilePictureUrl) {
            try {
                const res = await axios.get(profilePictureUrl, { responseType: 'arraybuffer' });
                const buffer = Buffer.from(res.data, 'binary');
                await sendImageWithThumbnail(socket, groupId, buffer, selectedMessage, [participant]);
            } catch (err) {
                await socket.sendMessage(groupId, { text: selectedMessage, mentions: [participant] });
            }
        } else {
            await socket.sendMessage(groupId, { text: selectedMessage, mentions: [participant] });
        }

        // Programar envio das regras após 10 segundos
        enviarRegrasAposDelay(socket, groupId, participant);

    } catch (error) {
        console.error('Erro ao enviar boas-vindas:', error);
    }
};
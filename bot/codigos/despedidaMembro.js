// despedidaMembro.js

import Jimp from 'jimp';
import axios from 'axios';

/**
 * Gera uma thumbnail a partir de uma URL ou buffer.
 * @param {Buffer|string} input - Buffer da imagem ou URL
 * @param {number} size - tamanho da thumbnail (padrão 256)
 * @returns {Promise<Buffer|null>} - Retorna buffer da thumbnail PNG
 */
async function gerarThumbnail(input, size = 256) {
    try {
        let buffer;
        if (typeof input === 'string') {
            const res = await axios.get(input, { responseType: 'arraybuffer' });
            buffer = Buffer.from(res.data, 'binary');
        } else {
            buffer = input;
        }

        const image = await Jimp.read(buffer);
        image.resize(size, size);
        return await image.getBufferAsync(Jimp.MIME_PNG);
    } catch (err) {
        console.error('Erro ao gerar thumbnail:', err);
        return null;
    }
}

/**
 * Envia imagem/GIF com thumbnail
 * @param {object} sock - instância do Baileys
 * @param {string} jid - ID do grupo ou usuário
 * @param {Buffer} buffer - Buffer da imagem/GIF
 * @param {string} caption - legenda da mensagem
 * @param {string[]} mentions - array com IDs de menções
 */
async function sendMediaWithThumbnail(sock, jid, buffer, caption, mentions = []) {
    try {
        const thumb = await gerarThumbnail(buffer);
        await sock.sendMessage(jid, {
            image: buffer,
            caption,
            mentions,
            jpegThumbnail: thumb
        });
    } catch (err) {
        console.error('Erro ao enviar mídia com thumbnail:', err);
        // fallback: envia apenas texto
        await sock.sendMessage(jid, { text: caption, mentions });
    }
}

/**
 * Configura mensagens de despedida para participantes que saem do grupo
 * @param {object} socket - instância do Baileys
 * @param {string} groupId - ID do grupo
 * @param {string} participant - ID do participante
 */
export const configurarDespedida = async (socket, groupId, participant) => {
    try {
        const participantName = participant.split('@')[0];
        console.log(`Nome do participante: ${participantName}`);

        // GIF ou imagem de despedida
        const gifUrl = 'https://images2.imgbox.com/87/8b/XDyxkgPh_o.png';

        // Lista de mensagens de despedida (pode adicionar mais)
        const farewellMessages = [

             `🙋‍♀️💔👋 *Tchau, sumido(a)!* @${participantName}\nVocê só aparece quando é pra causar.🤪😹\nVai embora, já deu o que tinha que dar! 😂💨`,
           `💔 *Pior que "quem é você?"* @${participantName}\nO grupo vai ficar mais leve agora, e talvez até com mais inteligência.😏😹\nBoa sorte no mundo real! 😹`,
           `🙋‍♀️💔 *Tchau, tá complicado te encontrar aqui!* @${participantName}\nSuas mensagens eram como Wi-Fi sem sinal...\nSempre ausentes quando mais precisamos. 🛑📶`,
           `😭 Adeus, expert em "não vi a mensagem" @${participantName}\nVocê é tipo aquele amigo que vai embora antes de todo mundo e ainda deixa a casa bagunçada! 😂🏃‍♂️`,
           `💔 *Adeus, fantasma do WhatsApp!* @${participantName}\nAgora que você foi 🥳🚀\nVamos poder conversar sem a sensação de estar sendo ignorado. 🤣✌️`,
           `😭👋 *Tchau, você estava aqui?* @${participantName}\nFicou mais tempo offline do que em qualquer conversa.😎\nQue sua conexão melhore agora que você foi! 😎😹`,
           `😭💔👋 *Que isso, você desapareceu de novo!?* @${participantName}\nNem nos avisa quando vai embora❓ 🤯\nSó sumiu como um story apagado... ⚰️`,
           `💔 Adeus, a "mistério do WhatsApp"! @${participantName}\nVocê já foi mais enigmático(a) que minha última pesquisa no Google! 😹💻🔍`,
           `😎✌️ Tchau, expert em "vou sair logo depois"! @${participantName}\nJá vai tarde, só não vai nos deixar com aquele "depois eu volto", porque... \n sabemos que não volta! 👋⏳`,
           `😭 *Tchau, mestre das desculpas!* @${participantName}\nMais uma desculpa sua foi pro espaço. \n Deixa a gente aqui, tentando entender como alguém sumiu tão rápido! 🤷‍♂️🚀😹`,
           `💔 Vai nessa, mito do "nem sei quem é você"! @${participantName}\nVocê fez tão pouco por aqui que eu até esqueci seu nome... 🤣\nSó que não! 🤭`,
           `😭👋 *Adeus, especialista em "oi" e "tchau"* @${participantName}\nSeus "oi" eram mais esperados que o Wi-Fi em casa.😜\nAgora é só o "tchau" mesmo! 👋😹`,
           `😭 *Te vejo por aí, criador(a) de drama!* @${participantName}\nVocê saiu sem nem avisar se ia voltar. 🚶‍♂️😂\nAgora vai deixar a gente de ressaca emocional. 🍻😭`,
           `💔 *Tchau, o ser humano mais rápido de sair!* @${participantName}\nVocê entrou, causou e saiu antes que alguém dissesse "mas o quê❓" Adeus, ninja do WhatsApp! 🤣`,
           `🙋‍♀️💔 *Adeus, guru da ausência!* @${participantName}\nVocê sumiu mais que meu carregador, e ainda vai deixar saudade... ou não! 😜🔌`,
           `😭💔👋 *Ah, e você ainda vai sair?* @${participantName}\nDa última vez que alguém saiu desse jeito, foi porque o Wi-Fi parou de funcionar.😂\nVai ver que o seu também parou, né❓ 😅`,
           `😭💔👋 *Tchau, que você não volte!* @${participantName}\nMais rápido que você, só quem consegue desaparecer depois do "oi"! Se cuida, ou não. 🏃‍♀️💨`,
           `😭👋 *Adeus, lenda do "minha bateria acabou"* @${participantName}\nVocê tem mais desculpas que o WhatsApp tem atualizações...\nE isso é muito, viu❓ 📱🔋`,
           `😭 *Tchau, mestre da fuga!* @${participantName}\nVocê veio, botou uma piada sem graça, e desapareceu. \n Se precisar de uma dica de "desaparecer sem deixar rastro", chama a gente! 😂`,
           `👋 *Tchau, você deu o ar da graça e agora sumiu* @${participantName}\nQue lenda do "entrei só pra ver como estava"!\nNinguém entendeu nada, mas valeu mesmo assim! 😎`,
           `💔 *Saindo como quem não quer nada* @${participantName}\nAinda ficou a dúvida: você entrou por acidente❓ Porque sumiu rapidinho! 🏃‍♂️💨`,
           `😭 *Deu tchau com a mesma velocidade com que chegou* @${participantName}\nJá vai❓ Só não vale a pena sair agora, estamos todos aqui, ainda tentando te entender! 🤷‍♂️`,
           `🙋‍♀️💔 *Eu não vou mentir, você vai fazer falta!* @${participantName}\nMas só no sentido de que o grupo vai sentir sua "energia ausente".\nBoa sorte! 😜`,
           `💔 *Sabe aquele amigo que entra só pra falar "oi" e "tchau"?* @${participantName}\nEsse é você, né❓ 😂 Espero que o "tchau" tenha sido mais sincero! 👋`,
           `😭 *Agora sim, o grupo vai respirar* @${participantName}\nSua energia sempre foi... digamos, um pouco forte demais para o nosso equilíbrio! 🤪`,
           `😭👋 *Adeus, a falta de vergonha em pessoa* @${participantName}\nSua falta de presença no grupo sempre foi de um nível elevado, eu te admiro! 😹👏`,
           `💔 *Tchau, espírito livre!* @${participantName}\nVocê apareceu, mas parece que se perdeu logo depois.\nVai ser engraçado, porque provavelmente nem viu esse recado! 😜`,
           `😭 *Volta logo, ou não* @${participantName}\nTe mandaram embora ou você se mandou sozinho(a)❓\nFica a dúvida! 😂`,
           `😭👋 *Adeus, você foi uma memória passageira* @${participantName}\nMal entrou e já foi embora.\nFica a saudade... ou não! 😏😹`,
           `💔 *Tchau, ausente* @${participantName}\nJá fez o "oi", o "tchau" e desapareceu com mais classe do que eu. Respeito! 😹👏`,
           `😭 *O grupo agora vai ficar mais chato* @${participantName}\nNão vai ser o mesmo sem as suas mensagens de “não sei o que fazer aqui” 🤔`,
           `😭👋 *Adeus, o mestre do “nada para fazer aqui”* @${participantName}\nSua mensagem era mais rara do que uma chuva no deserto.\nBoa sorte aí! 🏜️`,
           `💔 *Tchau, mestre das desculpas!* @${participantName} \n Mais uma desculpa sua foi pro espaço.\nDeixa a gente aqui, tentando entender como alguém sumiu tão rápido! 🚀`,
           `😭 *Até mais, especialista em sumir na hora certa!* @${participantName}\nVocê estava mais sumido(a) que aquela pessoa que só aparece no final do rolê. 😅`,
           `🙋‍♀️💔 *Adeus, você é tipo Wi-Fi ruim* @${participantName}\nSempre fora de alcance quando mais precisamos.\nVai com Deus e uma conexão melhor! 😹`,
           `💔 *Tchau, estrela cadente* @${participantName}\nApareceu por um segundo e já foi embora.\nO show estava bom, pena que não durou. ✨`,
           `😭 *Tchau, deus da fuga* @${participantName}\nVocê entrou, causou e já saiu, deixando todos em dúvida.\nVai ser difícil esquecer esse show de saída! 👀`,
           `😭👋 *Te vejo por aí... ou não* @${participantName}\nVocê foi uma lenda! Se algum dia aparecer de novo, a gente vai lembrar que te viu! 🤡👋`,
           `💔 *Bye bye, adeus, partiu embora!* @${participantName}\nVai ser difícil a vida continuar sem aquele "oi" só pra sumir depois.🤡😂`,
           `😭 *Te vejo no próximo "adeus"* @${participantName}\nMais uma saída épica no grupo! Vai ser difícil te substituir.\nNinguém mais vai sumir com estilo! 🙃`,
           `😭👋 *Tchau, lenda do "não sei como vim parar aqui"* @${participantName}\n Realmente, não sei como você entrou, mas também não sei como saiu.\nSe cuida! 👋`,
           `💔 *Tchau, sumido(a) do rolê* @${participantName}\nVai deixar saudades.🤪\n Não sei se boas ou ruins, mas pelo menos vai deixar algum tipo de emoção! 😆`,
           `😭 *Saiu como quem não quer nada* @${participantName}\nVocê não deu tchau, não explicou nada, só foi embora e deixou todo mundo em choque.🙄😹\nO drama nunca acaba. 🎭`,
           `🙋‍♀️💔 *Agora o grupo tem mais espaço* @${participantName}\nSem você por aqui, já posso respirar de novo! 😜 Se cuida aí, com a sua vida e energia sempre em modo off. 💨`,
           `👋💀 Alguém acaba de abandonar o barco! @${participantName}\nVai ser difícil viver sem sua energia, mas prometo que vou tentar.\n😂 Se joga por aí, na paz do universo! 🌌`,
           `🌪️💔 *O furacão se foi!* @${participantName}\nAgora o clima vai ser bem mais tranquilo por aqui, sem a sua bagunça. 😆 Vai com tudo aí, até logo! 🌟`,
           `🎤🎶 *Saindo do palco!* @${participantName}\nA plateia vai sentir sua falta, mas nada como uma pausa para repor as energias.\n😜 Aproveita o descanso, mas não demore! 😜`,
           `💀👀 *A missão foi cumprida!* @${participantName}\nJá pode deixar o grupo, mas não sai sem deixar sua marca... foi épico!\n⚡ Cuide de si e das suas aventuras fora daqui! 😎`,
           `🚶‍♀️💨 *Fugiu da encrenca!* @${participantName}\nOlha, você foi embora, mas a vibe não vai ser mais a mesma sem sua energia.\n😝 Se joga aí e não deixa de nos visitar! 😉`,
           `🚪🔒 *Porta fechada!* @${participantName}\nAgora o grupo vai ser mais calmo... só não sei se vai ser mais interessante!\n😂 Entra em modo zen, e nos avise quando voltar! ✌️`,
           `💔🤔 *Alguém sumiu!* @${participantName}\nOlha, a vibe ficou mais leve, mas falta aquele toque especial de loucura que só você sabia trazer!\n😆 Fica bem aí e não suma por muito tempo! ✌️`,
           `🎬🍿 *Fim de temporada!* @${participantName}\nJá pode voltar pro seu roteiro solo, a novela por aqui vai continuar sem você... mas vamos tentar!\n😜 Nos avise quando voltar a gravar! 🎥`,
           `🐾🦶 *Saiu da zona de conforto!* @${participantName}\nAgora só vai sobrar sossego por aqui. 😝 Mas não faz muita falta, né?\n😂 Vai ser feliz e cuida da sua paz!`,
           `🎉🚶‍♂️ *O show acabou!* @${participantName}\nAgora que o 'mestre da bagunça' foi embora, a paz vai reinar.\nSó não vale sumir pra sempre! 😂 Até a próxima bagunça! 💥`,
           `👋🚀 *Partiu missão fora do grupo!* @${participantName}\nAgora o clima vai ser de paz... mas com uma pitada de saudade!\n😝 Vai curtir a vibe fora, mas promete que vai dar notícias! ✌️`,
           `🔥💨 *Explosão de energia desligada!* @${participantName}\nO grupo vai até respirar melhor sem o seu toque de caos!\n😂 Vai com tudo, mas não demore, sentimos sua falta (um pouquinho)! 😜`,
           `⚡🌪️ *Vibração positiva em modo off!* @${participantName}\nA energia aqui vai diminuir um pouco sem você, mas a gente sobrevive, né?\n😆 Vai com calma e nos avisa quando voltar pro agito! 🚀`,
           `👻🕵️‍♂️ Desapareceu na neblina! @${participantName}\nFiquei sem entender muito bem, mas boa sorte no mundo fora daqui!\n😜 Nos avise quando voltar a fazer bagunça por aqui! 😂`,
           `🎮❌ *Saindo da partida!* @${participantName}\nAgora o time vai sentir a falta do seu game, mas bora jogar no modo solo por um tempo.\n😆 Vai com tudo e volta quando tiver saudade! 💥`
           
        ];

        const randomFarewellMessage = farewellMessages[Math.floor(Math.random() * farewellMessages.length)];
        console.log("Enviando GIF e mensagem de despedida...");

        // Baixa o GIF como buffer
        const res = await axios.get(gifUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(res.data, 'binary');

        // Envia o GIF com thumbnail
        await sendMediaWithThumbnail(socket, groupId, buffer, randomFarewellMessage, [participant]);

        console.log("GIF e mensagem de despedida enviados com sucesso!");
    } catch (error) {
        console.error('Erro ao processar a despedida:', error.message || error);
    }
};

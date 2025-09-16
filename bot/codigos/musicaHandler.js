// bot/codigos/musicaHandler.js
import fs from 'fs';
import path from 'path';
import { baixarMusicaBuffer, obterDadosMusica, buscarUrlPorNome } from './download.util.js';

export async function handleMusicaCommands(sock, from, content) {
    const lowerContent = content.toLowerCase();
    if (lowerContent.startsWith('#damas music') || lowerContent.startsWith('#damas musica')) {
        const termo = content.replace(/#damas (music|musica)/i, '').trim();
        if (!termo) {
            await sock.sendMessage(from, { text: '❌ Uso correto: #damas music [nome da música]' });
            return true;
        }

        const nomeArquivo = `musica_${Date.now()}.mp3`;
        const caminhoCompleto = path.join('./downloads', nomeArquivo);

        try {
            await sock.sendMessage(from, { 
                text: `🔥💃 𝙲𝙷𝙴𝙶𝙾𝚄 𝙾 𝙼𝙾𝙼𝙴𝙽𝚃𝙾! 💃🔥\n👏🍻 *DﾑMﾑS* 💃🔥 *Dﾑ NIGӇԵ* 💃🎶🍾🍸\n🔎 𝙿𝚛𝚎𝚙𝚊𝚛𝚊𝚗𝚍𝚘 𝚙𝚊𝚛𝚊 𝚝𝚎 𝚎𝚗𝚝𝚛𝚎𝚐𝚊𝚛 𝚘 𝚑𝚒𝚝 𝚚𝚞𝚎 𝚟𝚊𝚒 𝚏𝚊𝚣𝚎𝚛 𝚝𝚘𝚍𝚘 𝚖𝚞𝚗𝚍𝚘 𝚍𝚊𝚗𝚌̧𝚊𝚛 𝚜𝚎𝚖 𝚙𝚊𝚛𝚊𝚛: "${termo}"! 🎶💃🕺🔥🎉🍾🎵✨` 
            });

            const url = await buscarUrlPorNome(termo);
            const dados = await obterDadosMusica(url);
            const result = await baixarMusicaBuffer(url);

            fs.writeFileSync(caminhoCompleto, result.buffer);

            await sock.sendMessage(from, { 
                audio: fs.readFileSync(caminhoCompleto), 
                mimetype: 'audio/mpeg', 
                fileName: nomeArquivo 
            });

            await sock.sendMessage(from, { 
                text: `🎵 *${dados.titulo}* - ${dados.autor}\n⏱ Duração: ${Math.floor(dados.duracao/60)}m ${dados.duracao%60}s`
            });

            fs.unlinkSync(caminhoCompleto);
        } catch (err) {
            console.error(err);
            await sock.sendMessage(from, { text: `❌ Opa! Não consegui baixar "${termo}".` });
        }
        return true;
    }
    return false;
}
// bot/codigos/download.util.js
import ytdl from '@distube/ytdl-core';
import ytSearch from 'yt-search';
import ffmpeg from 'fluent-ffmpeg';
import streamBuffers from 'stream-buffers';

/**
 * Busca o primeiro vídeo no YouTube pelo termo
 * @param {string} termo
 * @returns {Promise<string>} - URL do primeiro resultado
 */
export async function buscarUrlPorNome(termo) {
    const resultados = await ytSearch(termo);
    if (!resultados || !resultados.videos || resultados.videos.length === 0) {
        throw new Error('Nenhum vídeo encontrado no YouTube.');
    }
    return resultados.videos[0].url;
}

/**
 * Obtém dados de música do YouTube
 * @param {string} url - URL ou termo de busca
 */
export async function obterDadosMusica(url) {
    try {
        if (!ytdl.validateURL(url)) url = await buscarUrlPorNome(url);

        const info = await ytdl.getInfo(url);
        const videoDetails = info.videoDetails;

        return {
            titulo: videoDetails.title,
            autor: videoDetails.author.name,
            duracao: parseInt(videoDetails.lengthSeconds),
            url: videoDetails.video_url,
            thumbnails: videoDetails.thumbnails.map(t => t.url),
        };
    } catch (err) {
        console.error("Erro ao obter dados da música:", err);
        throw new Error('Não foi possível obter os dados da música.');
    }
}

/**
 * Baixa música e retorna buffer em memória (sem criar arquivos no disco)
 * @param {string} url - URL ou termo de busca
 * @returns {Promise<{buffer: Buffer}>}
 */
export async function baixarMusicaBuffer(url) {
    if (!ytdl.validateURL(url)) {
        url = await buscarUrlPorNome(url);
    }

    const info = await ytdl.getInfo(url);
    const stream = ytdl.downloadFromInfo(info, { quality: 'highestaudio' });

    const writableStream = new streamBuffers.WritableStreamBuffer({
        initialSize: 100 * 1024,   // 100 KB
        incrementAmount: 10 * 1024 // 10 KB por incremento
    });

    return new Promise((resolve, reject) => {
        ffmpeg(stream)
            .format('mp3')
            .audioBitrate(128)
            .on('error', (err) => reject(err))
            .on('end', () => {
                const buffer = writableStream.getContents();
                if (!buffer) return reject(new Error('Falha ao gerar o buffer'));
                resolve({ buffer });
            })
            .pipe(writableStream, { end: true });
    });
}

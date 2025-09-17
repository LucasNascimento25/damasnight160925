// bot/codigos/download.util.js
import ytdl from '@distube/ytdl-core';
import ytSearch from 'yt-search';
import ffmpeg from 'fluent-ffmpeg';
import { Worker } from 'worker_threads';
import { pipeline } from 'stream/promises';
import { Transform, PassThrough } from 'stream';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Cache para evitar múltiplas consultas
const infoCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Cache com TTL para otimizar buscas repetidas
 */
function getCachedInfo(url) {
    const cached = infoCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    return null;
}

function setCachedInfo(url, data) {
    infoCache.set(url, { data, timestamp: Date.now() });
    // Limpa cache antigo
    if (infoCache.size > 100) {
        const oldestKey = infoCache.keys().next().value;
        infoCache.delete(oldestKey);
    }
}

/**
 * Busca paralela otimizada
 */
export async function buscarUrlPorNome(termo) {
    const resultados = await ytSearch(termo);
    if (!resultados?.videos?.length) {
        throw new Error('Nenhum vídeo encontrado no YouTube.');
    }
    return resultados.videos[0].url;
}

/**
 * Obtém info com cache
 */
export async function obterDadosMusica(url) {
    try {
        if (!ytdl.validateURL(url)) {
            url = await buscarUrlPorNome(url);
        }
        
        let info = getCachedInfo(url);
        if (!info) {
            info = await ytdl.getInfo(url);
            setCachedInfo(url, info);
        }
        
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
 * VERSÃO MOBILE-FRIENDLY - Garante compatibilidade com celular
 */
export async function baixarMusicaMobile(url) {
    if (!ytdl.validateURL(url)) {
        url = await buscarUrlPorNome(url);
    }

    let info = getCachedInfo(url);
    if (!info) {
        info = await ytdl.getInfo(url);
        setCachedInfo(url, info);
    }

    const tempDir = path.join(os.tmpdir(), 'whatsapp_audio');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFile = path.join(tempDir, `audio_${Date.now()}.mp3`);
    
    const downloadStream = ytdl.downloadFromInfo(info, {
        quality: 'highestaudio',
        filter: 'audioonly',
        highWaterMark: 16 * 1024 * 1024,
    });

    return new Promise((resolve, reject) => {
        const ffmpegProcess = ffmpeg(downloadStream)
            .format('mp3')
            .audioBitrate(128) // 128kbps é o padrão para WhatsApp
            .audioChannels(2)
            .audioFrequency(44100)
            .addOptions([
                '-threads', '2',                    // Limite de threads para estabilidade
                '-preset', 'fast',                  // Balanço entre velocidade e compatibilidade
                '-avoid_negative_ts', 'make_zero',
                '-fflags', '+genpts',
                '-movflags', '+faststart',
                '-write_xing', '0',
                '-id3v2_version', '3',             // Versão ID3 compatível
                '-metadata:s:a:0', 'title=' + info.videoDetails.title,
                '-metadata:s:a:0', 'artist=' + info.videoDetails.author.name,
            ])
            .save(tempFile)
            .on('error', (err) => {
                console.error('Erro FFmpeg:', err);
                // Limpa arquivo temporário em caso de erro
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
                reject(err);
            })
            .on('end', async () => {
                try {
                    // Verifica se o arquivo foi criado corretamente
                    if (!fs.existsSync(tempFile)) {
                        throw new Error('Arquivo temporário não foi criado');
                    }

                    const stats = fs.statSync(tempFile);
                    if (stats.size === 0) {
                        throw new Error('Arquivo temporário está vazio');
                    }

                    // Lê o arquivo para buffer
                    const buffer = fs.readFileSync(tempFile);
                    
                    // Limpa arquivo temporário
                    fs.unlinkSync(tempFile);
                    
                    console.log(`✅ Áudio processado: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
                    resolve({ 
                        buffer,
                        mimetype: 'audio/mpeg',
                        filename: `${info.videoDetails.title}.mp3`.replace(/[<>:"/\\|?*]/g, '_')
                    });
                } catch (error) {
                    console.error('Erro ao processar arquivo:', error);
                    reject(error);
                }
            });
    });
}

/**
 * VERSÃO OTIMIZADA PARA WHATSAPP - Foco em compatibilidade
 */
export async function baixarParaWhatsApp(url) {
    console.time('🎵 Download WhatsApp');
    
    if (!ytdl.validateURL(url)) {
        url = await buscarUrlPorNome(url);
    }

    let info = getCachedInfo(url);
    if (!info) {
        info = await ytdl.getInfo(url);
        setCachedInfo(url, info);
    }

    const duration = parseInt(info.videoDetails.lengthSeconds);
    
    // Limita duração para evitar arquivos muito grandes
    if (duration > 1800) { // 30 minutos
        throw new Error('Arquivo muito longo. Máximo 30 minutos.');
    }

    const downloadStream = ytdl.downloadFromInfo(info, {
        quality: 'highestaudio',
        filter: 'audioonly',
        highWaterMark: 8 * 1024 * 1024, // Buffer menor para economizar memória
    });

    return new Promise((resolve, reject) => {
        const chunks = [];
        
        const ffmpegProcess = ffmpeg(downloadStream)
            .format('mp3')
            .audioBitrate(128)                      // Padrão WhatsApp
            .audioChannels(2)                       // Estéreo
            .audioFrequency(44100)                  // Taxa padrão
            .addOptions([
                '-threads', '1',                    // Thread única para estabilidade
                '-preset', 'medium',                // Balanço qualidade/velocidade
                '-avoid_negative_ts', 'make_zero',
                '-fflags', '+genpts',
                '-movflags', '+faststart',
                '-write_xing', '0',                 // Remove overhead
                '-id3v2_version', '3',             // Compatibilidade máxima
                '-map_metadata', '-1',              // Remove metadados desnecessários
                '-ac', '2',                         // Força 2 canais
                '-ar', '44100',                     // Força taxa de amostragem
                '-f', 'mp3',                        // Força formato MP3
            ])
            .on('error', (err) => {
                console.error('❌ Erro FFmpeg:', err);
                reject(err);
            })
            .on('progress', (progress) => {
                if (progress.percent) {
                    console.log(`🔄 Progresso: ${Math.round(progress.percent)}%`);
                }
            })
            .on('end', () => {
                if (chunks.length === 0) {
                    return reject(new Error('Buffer de áudio vazio'));
                }
                
                const buffer = Buffer.concat(chunks);
                const sizeInMB = buffer.length / 1024 / 1024;
                
                // WhatsApp tem limite de ~16MB para áudios
                if (sizeInMB > 15) {
                    console.warn(`⚠️ Arquivo grande: ${sizeInMB.toFixed(2)}MB`);
                }
                
                console.timeEnd('🎵 Download WhatsApp');
                console.log(`✅ Áudio pronto: ${sizeInMB.toFixed(2)}MB`);
                
                resolve({ 
                    buffer,
                    mimetype: 'audio/mpeg',
                    filename: `${info.videoDetails.title}.mp3`.replace(/[<>:"/\\|?*]/g, '_'),
                    size: buffer.length,
                    duration: duration
                });
            });

        // Configuração para capturar o stream de saída
        const ffmpegStream = ffmpegProcess.pipe();
        ffmpegStream.on('data', (chunk) => {
            chunks.push(chunk);
        });
        ffmpegStream.on('error', reject);
    });
}

/**
 * VERSÃO ULTRA-RÁPIDA COM COMPATIBILIDADE GARANTIDA
 */
export async function baixarUltraRapidoCompativel(url) {
    if (!ytdl.validateURL(url)) {
        url = await buscarUrlPorNome(url);
    }

    let info = getCachedInfo(url);
    if (!info) {
        info = await ytdl.getInfo(url);
        setCachedInfo(url, info);
    }
    
    // Busca formato MP3/M4A nativo (sem conversão)
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    const mp3Format = audioFormats.find(f => 
        (f.container === 'mp4' && f.audioCodec?.includes('mp4a')) ||
        (f.container === 'm4a' && f.audioCodec?.includes('mp4a'))
    );
    
    if (mp3Format && mp3Format.contentLength) {
        console.log('🚀 MODO ULTRA-RÁPIDO: Formato nativo compatível encontrado!');
        
        const downloadStream = ytdl.downloadFromInfo(info, {
            format: mp3Format,
            highWaterMark: 64 * 1024 * 1024, // 64MB buffer
            dlChunkSize: 10 * 1024 * 1024,   // 10MB chunks
        });

        // Pipeline super-otimizado
        const chunks = [];
        const bufferTransform = new Transform({
            highWaterMark: 32 * 1024 * 1024,
            transform(chunk, encoding, callback) {
                chunks.push(chunk);
                callback();
            }
        });

        try {
            await pipeline(downloadStream, bufferTransform);
            const buffer = Buffer.concat(chunks);
            
            return { 
                buffer,
                mimetype: 'audio/mpeg',
                filename: `${info.videoDetails.title}.mp3`.replace(/[<>:"/\\|?*]/g, '_'),
                method: 'ultra-rapido'
            };
        } catch (error) {
            console.warn('⚠️ Pipeline ultra-rápido falhou, usando conversão...');
        }
    }
    
    // Fallback para conversão FFmpeg
    console.log('🔄 MODO COMPATIBILIDADE: Convertendo para garantir funcionamento');
    return await baixarParaWhatsApp(url);
}

/**
 * DOWNLOAD PARALELO OTIMIZADO PARA FORMATOS NATIVOS
 */
export async function baixarParaleloCompativel(url, numChunks = 6) {
    if (!ytdl.validateURL(url)) {
        url = await buscarUrlPorNome(url);
    }

    let info = getCachedInfo(url);
    if (!info) {
        info = await ytdl.getInfo(url);
        setCachedInfo(url, info);
    }

    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    const compatibleFormat = audioFormats.find(f => 
        (f.container === 'mp4' || f.container === 'm4a') && f.contentLength
    );
    
    if (!compatibleFormat || !compatibleFormat.contentLength) {
        return await baixarUltraRapidoCompativel(url);
    }

    const totalSize = parseInt(compatibleFormat.contentLength);
    const chunkSize = Math.ceil(totalSize / numChunks);
    
    console.log(`⚡ DOWNLOAD PARALELO: ${numChunks} chunks de ${(chunkSize/1024/1024).toFixed(1)}MB cada`);
    
    // Downloads paralelos super-otimizados
    const promises = Array.from({ length: numChunks }, (_, i) => {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize - 1, totalSize - 1);
        
        return new Promise((resolve, reject) => {
            const chunks = [];
            const stream = ytdl.downloadFromInfo(info, {
                format: compatibleFormat,
                range: { start, end },
                highWaterMark: 32 * 1024 * 1024, // Buffer gigante
            });
            
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('end', () => resolve(Buffer.concat(chunks)));
            stream.on('error', reject);
        });
    });

    try {
        console.time('⚡ Chunks Paralelos');
        const bufferChunks = await Promise.all(promises);
        console.timeEnd('⚡ Chunks Paralelos');
        
        const finalBuffer = Buffer.concat(bufferChunks);
        
        return { 
            buffer: finalBuffer,
            mimetype: 'audio/mpeg',
            filename: `${info.videoDetails.title}.mp3`.replace(/[<>:"/\\|?*]/g, '_'),
            method: 'paralelo-ultra'
        };
    } catch (error) {
        console.warn('⚠️ Download paralelo falhou, usando método sequencial...');
        return await baixarUltraRapidoCompativel(url);
    }
}

/**
 * DOWNLOAD COM FALLBACK INTELIGENTE E MÁXIMA VELOCIDADE
 */
export async function baixarMusicaBuffer(url) {
    console.time('⚡ Download Total');
    
    if (!ytdl.validateURL(url)) {
        url = await buscarUrlPorNome(url);
    }

    let info = getCachedInfo(url);
    if (!info) {
        console.time('📡 Info');
        info = await ytdl.getInfo(url);
        setCachedInfo(url, info);
        console.timeEnd('📡 Info');
    }

    const duration = parseInt(info.videoDetails.lengthSeconds);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
    const hasCompatibleFormat = audioFormats.some(f => 
        (f.container === 'mp4' || f.container === 'm4a') && f.contentLength
    );
    
    try {
        let result;
        
        // ESTRATÉGIA INTELIGENTE baseada no arquivo
        if (hasCompatibleFormat && duration < 300) { 
            // Menos de 5min + formato nativo = ULTRA RÁPIDO
            console.log('🚀 ESTRATÉGIA: Ultra-rápido sequencial');
            result = await baixarUltraRapidoCompativel(url);
            
        } else if (hasCompatibleFormat && duration >= 300) { 
            // Mais de 5min + formato nativo = PARALELO
            console.log('⚡ ESTRATÉGIA: Paralelo ultra-otimizado');
            result = await baixarParaleloCompativel(url, 8); // 8 chunks para velocidade máxima
            
        } else {
            // Formato precisa conversão = COMPATIBILIDADE
            console.log('🔄 ESTRATÉGIA: Conversão com compatibilidade');
            result = await baixarParaWhatsApp(url);
        }
        
        console.timeEnd('⚡ Download Total');
        
        // Validação final
        const validacao = validarBufferAudio(result.buffer);
        if (!validacao.valido) {
            throw new Error(`Buffer inválido: ${validacao.erro}`);
        }
        
        const sizeInMB = (result.buffer.length / 1024 / 1024).toFixed(2);
        console.log(`✅ ${result.method || 'padrao'}: ${sizeInMB}MB em ${duration}s de áudio`);
        
        return result;
        
    } catch (error) {
        console.error('❌ Erro no download inteligente:', error);
        console.timeEnd('⚡ Download Total');
        
        // ÚLTIMO FALLBACK: Versão mais compatível
        try {
            console.log('🆘 FALLBACK FINAL: Modo super-compatível');
            return await baixarParaWhatsApp(url);
        } catch (finalError) {
            throw new Error(`Falha completa no download: ${finalError.message}`);
        }
    }
}

/**
 * DOWNLOAD COM PROGRESSO AVANÇADO E VALIDAÇÃO
 */
export async function baixarComProgresso(url, onProgress) {
    if (!ytdl.validateURL(url)) {
        url = await buscarUrlPorNome(url);
    }

    let info = getCachedInfo(url);
    if (!info) {
        info = await ytdl.getInfo(url);
        setCachedInfo(url, info);
    }

    const formats = ytdl.filterFormats(info.formats, 'audioonly');
    const bestFormat = formats[0];
    const totalBytes = parseInt(bestFormat.contentLength) || 
                      parseInt(info.videoDetails.lengthSeconds) * 32000;

    const downloadStream = ytdl.downloadFromInfo(info, {
        format: bestFormat,
        highWaterMark: 16 * 1024 * 1024,
    });

    return new Promise((resolve, reject) => {
        const chunks = [];
        let downloadedBytes = 0;
        let lastProgress = 0;
        
        downloadStream.on('data', (chunk) => {
            chunks.push(chunk);
            downloadedBytes += chunk.length;
            
            const progress = Math.min((downloadedBytes / totalBytes) * 100, 100);
            
            if (progress - lastProgress >= 1) {
                onProgress?.(Math.round(progress), downloadedBytes, totalBytes);
                lastProgress = progress;
            }
        });
        
        downloadStream.on('end', () => {
            onProgress?.(100, downloadedBytes, totalBytes);
            
            // Validação básica do buffer
            const buffer = Buffer.concat(chunks);
            if (buffer.length < 1000) {
                return reject(new Error('Buffer muito pequeno, download pode ter falhado'));
            }
            
            resolve({ 
                buffer,
                mimetype: 'audio/mpeg',
                filename: `${info.videoDetails.title}.mp3`.replace(/[<>:"/\\|?*]/g, '_')
            });
        });
        
        downloadStream.on('error', reject);
    });
}

/**
 * VALIDAÇÃO DE BUFFER DE ÁUDIO
 */
export function validarBufferAudio(buffer) {
    if (!Buffer.isBuffer(buffer)) {
        return { valido: false, erro: 'Não é um buffer válido' };
    }
    
    if (buffer.length < 1000) {
        return { valido: false, erro: 'Buffer muito pequeno' };
    }
    
    // Verifica headers MP3
    const hasMP3Header = buffer.toString('hex', 0, 3).startsWith('fff') || 
                        buffer.toString('ascii', 0, 3) === 'ID3';
    
    if (!hasMP3Header) {
        return { valido: false, erro: 'Header MP3 não encontrado' };
    }
    
    return { valido: true, tamanho: buffer.length };
}

/**
 * LIMPEZA DO CACHE E ARQUIVOS TEMPORÁRIOS
 */
export function limparCache() {
    infoCache.clear();
    
    // Limpa arquivos temporários antigos
    const tempDir = path.join(os.tmpdir(), 'whatsapp_audio');
    if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            const ageDiff = Date.now() - stats.mtime.getTime();
            const ageInMinutes = ageDiff / (1000 * 60);
            
            // Remove arquivos com mais de 30 minutos
            if (ageInMinutes > 30) {
                fs.unlinkSync(filePath);
            }
        });
    }
    
    console.log('🧹 Cache e arquivos temporários limpos');
}
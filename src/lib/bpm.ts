export async function analyzeBPM(audioFile: Blob): Promise<number> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // 1. Downsampling para procesar más rápido (a 22050Hz es suficiente)
    const offlineContext = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    // 2. Filtro de paso bajo (enfocarse en frecuencias < 150Hz donde está el ritmo)
    const filter = offlineContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 150; 

    source.connect(filter);
    filter.connect(offlineContext.destination);
    source.start(0);

    const filteredBuffer = await offlineContext.startRendering();
    const data = filteredBuffer.getChannelData(0);

    // 3. Detección de picos con umbral adaptativo
    const peaks = getPeaksAtThreshold(data, 0.75); // Detectar picos por encima del 75% del max
    const groups = getIntervalGroups(peaks, filteredBuffer.sampleRate);

    // 4. Seleccionar el grupo con más "fuerza" rítmica
    const topBPMs = groups.sort((a, b) => b.count - a.count).splice(0, 5);

    if (topBPMs.length === 0) return 0;

    let finalBPM = topBPMs[0].tempo;

    // 5. Normalización inteligente (rango estándar 70-160 BPM)
    while (finalBPM < 70) finalBPM *= 2;
    while (finalBPM > 170) finalBPM /= 2;

    return Math.round(finalBPM);
}

// Funciones auxiliares para mayor precisión
function getPeaksAtThreshold(data: Float32Array, threshold: number) {
    const peaks = [];
    for (let i = 0; i < data.length; i++) {
        if (data[i] > threshold) {
            peaks.push(i);
            i += 10000; // Salto de seguridad para no captar la misma onda
        }
    }
    return peaks;
}

function getIntervalGroups(peaks: number[], sampleRate: number) {
    const groups: { tempo: number; count: number }[] = [];
    peaks.forEach((peak, index) => {
        for (let i = 1; i < 10 && index + i < peaks.length; i++) {
            const interval = peaks[index + i] - peak;
            const tempo = (60 * sampleRate) / interval;
            
            // Agrupar tempos similares (margen de error pequeño)
            const existingGroup = groups.find(g => Math.abs(g.tempo - tempo) < 2);
            if (existingGroup) {
                existingGroup.count++;
            } else if (tempo > 40 && tempo < 220) {
                groups.push({ tempo, count: 1 });
            }
        }
    });
    return groups;
}

export async function getWaveformData(audioFile: Blob, points: number = 100): Promise<number[]> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const arrayBuffer = await audioFile.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const rawData = audioBuffer.getChannelData(0); // Canal 1
  const samplesPerPoint = Math.floor(rawData.length / points);
  const peaks = [];

  for (let i = 0; i < points; i++) {
    const start = i * samplesPerPoint;
    let max = 0;
    for (let j = 0; j < samplesPerPoint; j++) {
      const amplitude = Math.abs(rawData[start + j]);
      if (amplitude > max) max = amplitude;
    }
    peaks.push(max);
  }
  return peaks;
}
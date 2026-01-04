export async function analyzeBPM(audioFile: Blob): Promise<number> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    // Extraemos los datos del primer canal
    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;

    
    let peaks = [];
    const threshold = 0.8; // Umbral de sensibilidad
    for (let i = 0; i < data.length; i += 441) { // Saltamos muestras para ir más rápido
        if (data[i] > threshold) {
        peaks.push(i);
        i += sampleRate / 4; // Evitamos detectar el mismo golpe dos veces (mínimo 0.25s)
        }
    }

    if (peaks.length < 2) return 0;

    // Calculamos la media de intervalos entre picos
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
        intervals.push(peaks[i] - peaks[i - 1]);
    }

    const averageInterval = intervals.reduce((a, b) => a + b) / intervals.length;
    const bpm = Math.round(60 / (averageInterval / sampleRate));
    if(bpm < 40) return bpm * 4;
    if(bpm < 80) return bpm * 2;

    return bpm > 200 ? bpm / 2 : bpm; // Corrección básica de doble tempo
}
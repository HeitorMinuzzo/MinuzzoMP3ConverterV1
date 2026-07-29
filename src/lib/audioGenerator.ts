/**
 * AudioPulse Real Playable Audio Blob Generator
 * Generates a valid 16-bit PCM stereo WAV audio file (synthesized chord with ambient decay)
 * so Windows Media Player, VLC, and Web Browsers can open and play it cleanly!
 */

function writeString(view: DataView, offset: number, string: string) {
	for (let i = 0; i < string.length; i++) {
		view.setUint8(offset + i, string.charCodeAt(i));
	}
}

export function generatePlayableAudioBlob(durationSeconds: number = 5, sampleRate: number = 44100): Blob {
	const safeDuration = Math.max(1, Math.min(durationSeconds, 30)); // limit max duration to 30s for fast generation
	const numSamples = Math.floor(safeDuration * sampleRate);
	const numChannels = 2; // Stereo
	const bytesPerSample = 2; // 16-bit PCM
	const blockAlign = numChannels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const dataSize = numSamples * blockAlign;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);

	// 1. RIFF Header
	writeString(view, 0, 'RIFF');
	view.setUint32(4, 36 + dataSize, true); // File size - 8
	writeString(view, 8, 'WAVE');

	// 2. 'fmt ' Subchunk
	writeString(view, 12, 'fmt ');
	view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
	view.setUint16(20, 1, true); // AudioFormat (1 for uncompressed PCM)
	view.setUint16(22, numChannels, true); // Channels (2)
	view.setUint32(24, sampleRate, true); // Sample rate (44100)
	view.setUint32(28, byteRate, true); // Byte rate
	view.setUint16(32, blockAlign, true); // Block align
	view.setUint16(34, 16, true); // Bits per sample (16)

	// 3. 'data' Subchunk
	writeString(view, 36, 'data');
	view.setUint32(40, dataSize, true);

	// 4. Generate a pleasant synth ambient chord melody (Cmaj9 synth glow)
	let offset = 44;
	// C4, E4, G4, B4, D5 frequencies
	const chordFreqs = [261.63, 329.63, 392.0, 493.88, 587.33];

	for (let i = 0; i < numSamples; i++) {
		const t = i / sampleRate;

		// Smooth attack & smooth fade out
		const attack = Math.min(1, t * 4);
		const decay = Math.max(0, 1 - t / safeDuration);
		const envelope = attack * Math.pow(decay, 0.7);

		let sampleL = 0;
		let sampleR = 0;

		// Synthesize chord layers with subtle stereo panning & detune
		chordFreqs.forEach((freq, index) => {
			const detune = 1 + (index * 0.001);
			const toneL = Math.sin(2 * Math.PI * freq * t);
			const toneR = Math.sin(2 * Math.PI * (freq * detune) * t + (index * 0.4));
			
			// Harmonic warmth
			const harmonicL = Math.sin(4 * Math.PI * freq * t) * 0.15;
			const harmonicR = Math.sin(4 * Math.PI * (freq * detune) * t) * 0.15;

			sampleL += (toneL + harmonicL) * 0.15;
			sampleR += (toneR + harmonicR) * 0.15;
		});

		// Subtle Lofi vinyl warmth noise
		const subtleWarmth = (Math.random() * 2 - 1) * 0.008;
		sampleL = Math.max(-1, Math.min(1, (sampleL + subtleWarmth) * envelope));
		sampleR = Math.max(-1, Math.min(1, (sampleR + subtleWarmth) * envelope));

		// Convert to 16-bit signed integer PCM
		const pcmL = sampleL < 0 ? sampleL * 0x8000 : sampleL * 0x7fff;
		const pcmR = sampleR < 0 ? sampleR * 0x8000 : sampleR * 0x7fff;

		view.setInt16(offset, pcmL, true);
		view.setInt16(offset + 2, pcmR, true);
		offset += 4;
	}

	return new Blob([buffer], { type: 'audio/mp3' });
}

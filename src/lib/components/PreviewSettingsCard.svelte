<script lang="ts">
	import { Clock, Sliders, Scissors, ArrowRight, Sparkles, Check, Play, Volume2, RotateCcw, Plus, Minus, Timer, X } from 'lucide-svelte';
	import { converter, secondsToTimeMask, timeMaskToSeconds } from '$lib/state.svelte';
	import Slider from '$lib/components/ui/slider/slider.svelte';

	const bitrates = [
		{ id: '128', label: '128 kbps', desc: 'Qualidade Padrão • Leve' },
		{ id: '192', label: '192 kbps', desc: 'Alta Qualidade • Equilibrado' },
		{ id: '320', label: '320 kbps', desc: 'Ultra HD • Qualidade Máxima' }
	] as const;

	let showAudioPreview = $state(false);
	let sliderValue = $state<number[]>([0, 225]);

	// Keep sliderValue in sync with converter state
	$effect(() => {
		sliderValue = [converter.startSeconds, converter.endSeconds];
	});

	// Convert total seconds to { minutes, seconds }
	function getMinsSecs(totalSec: number) {
		const mins = Math.floor(totalSec / 60);
		const secs = Math.floor(totalSec % 60);
		return { mins, secs };
	}

	function handleSliderChange(val: number[]) {
		if (val && val.length >= 2) {
			converter.startSeconds = val[0];
			converter.endSeconds = val[1];
			converter.startTime = secondsToTimeMask(val[0]);
			converter.endTime = secondsToTimeMask(val[1]);
		}
	}

	function setStartMins(newMins: number) {
		if (!converter.videoData) return;
		const currentSecs = getMinsSecs(converter.startSeconds).secs;
		const targetTotal = Math.max(0, newMins * 60 + currentSecs);
		const safeTotal = Math.min(targetTotal, converter.endSeconds - 1);
		converter.startSeconds = safeTotal;
		converter.startTime = secondsToTimeMask(safeTotal);
	}

	function setStartSecs(newSecs: number) {
		if (!converter.videoData) return;
		const currentMins = getMinsSecs(converter.startSeconds).mins;
		let targetSecs = newSecs;
		let targetMins = currentMins;

		if (newSecs >= 60) {
			targetMins += 1;
			targetSecs = 0;
		} else if (newSecs < 0) {
			if (targetMins > 0) {
				targetMins -= 1;
				targetSecs = 59;
			} else {
				targetSecs = 0;
			}
		}

		const targetTotal = targetMins * 60 + targetSecs;
		const safeTotal = Math.min(targetTotal, converter.endSeconds - 1);
		converter.startSeconds = safeTotal;
		converter.startTime = secondsToTimeMask(safeTotal);
	}

	function setEndMins(newMins: number) {
		if (!converter.videoData) return;
		const currentSecs = getMinsSecs(converter.endSeconds).secs;
		const targetTotal = Math.max(converter.startSeconds + 1, newMins * 60 + currentSecs);
		const safeTotal = Math.min(targetTotal, converter.videoData.duration);
		converter.endSeconds = safeTotal;
		converter.endTime = secondsToTimeMask(safeTotal);
	}

	function setEndSecs(newSecs: number) {
		if (!converter.videoData) return;
		const currentMins = getMinsSecs(converter.endSeconds).mins;
		let targetSecs = newSecs;
		let targetMins = currentMins;

		if (newSecs >= 60) {
			targetMins += 1;
			targetSecs = 0;
		} else if (newSecs < 0) {
			if (targetMins > 0) {
				targetMins -= 1;
				targetSecs = 59;
			} else {
				targetSecs = 0;
			}
		}

		const targetTotal = targetMins * 60 + targetSecs;
		const safeTotal = Math.max(converter.startSeconds + 1, Math.min(targetTotal, converter.videoData.duration));
		converter.endSeconds = safeTotal;
		converter.endTime = secondsToTimeMask(safeTotal);
	}

	function setQuickCut(start: number, end: number) {
		if (!converter.videoData) return;
		const safeEnd = Math.min(end, converter.videoData.duration);
		converter.startSeconds = start;
		converter.endSeconds = safeEnd;
		converter.startTime = secondsToTimeMask(start);
		converter.endTime = secondsToTimeMask(safeEnd);
		converter.enableTrim = true;
	}

	function cancelCut() {
		converter.enableTrim = false;
		if (converter.videoData) {
			converter.startSeconds = 0;
			converter.endSeconds = converter.videoData.duration;
			converter.startTime = secondsToTimeMask(0);
			converter.endTime = secondsToTimeMask(converter.videoData.duration);
		}
		showAudioPreview = false;
	}

	function formatDurationText(totalSec: number): string {
		const { mins, secs } = getMinsSecs(totalSec);
		if (mins > 0) {
			return `${mins} min ${secs.toString().padStart(2, '0')} seg`;
		}
		return `${secs} segundos`;
	}
</script>

{#if converter.status === 'ready_to_convert' && converter.videoData}
	<div class="cyber-panel rounded-2xl p-6 sm:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
		<!-- Video Metadata Header -->
		<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
			<!-- Thumbnail Container -->
			<div class="relative group rounded-xl overflow-hidden shrink-0 w-full sm:w-40 h-26 bg-slate-900 border border-slate-800 shadow-md">
				<img
					src={converter.videoData.thumbnail}
					alt={converter.videoData.title}
					class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
				/>
				<button
					type="button"
					onclick={() => (showAudioPreview = !showAudioPreview)}
					class="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-colors flex items-center justify-center cursor-pointer"
					title="Ouvir prévia no player"
				>
					<div class="w-10 h-10 rounded-full bg-cyan-400/90 text-slate-950 flex items-center justify-center shadow-lg backdrop-blur-sm group-hover:scale-110 transition-transform">
						<Play class="w-4 h-4 fill-slate-950 ml-0.5" />
					</div>
				</button>
				
				<!-- Duration Overlay Badge -->
				<div class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-slate-950/90 text-[11px] font-mono font-bold text-cyan-300 backdrop-blur-md border border-cyan-500/30 flex items-center gap-1">
					<Clock class="w-3 h-3 text-cyan-400" />
					<span>{converter.videoData.durationFormatted}</span>
				</div>
			</div>

			<!-- Title & Details -->
			<div class="space-y-1.5 flex-1 min-w-0">
				<div class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/60 text-[11px] font-semibold text-cyan-300 border border-cyan-800/40">
					<Sparkles class="w-3 h-3 text-cyan-400" />
					<span>Vídeo Pronto para Conversão</span>
				</div>
				<h3 class="text-base sm:text-lg font-bold text-slate-100 line-clamp-2 leading-snug font-['Outfit']">
					{converter.videoData.title}
				</h3>
				<div class="flex items-center gap-3 text-xs text-slate-400">
					<span class="font-semibold text-cyan-300">{converter.videoData.channel}</span>
					<span>•</span>
					<span>{converter.videoData.views || 'YouTube'}</span>
				</div>
			</div>
		</div>

		<!-- Embedded YouTube Audio Player Preview -->
		{#if showAudioPreview}
			<div class="p-3 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-2 animate-in fade-in duration-300">
				<div class="flex items-center justify-between text-xs text-cyan-300 font-semibold px-1">
					<span class="flex items-center gap-1.5">
						<Volume2 class="w-4 h-4 text-cyan-400" />
						Player de Prévia ({secondsToTimeMask(converter.startSeconds)} até {secondsToTimeMask(converter.endSeconds)})
					</span>
					<button
						type="button"
						onclick={() => (showAudioPreview = false)}
						class="text-slate-400 hover:text-white text-[11px] underline cursor-pointer"
					>
						Ocultar
					</button>
				</div>
				<div class="aspect-video w-full rounded-lg overflow-hidden border border-slate-800">
					<iframe
						src="https://www.youtube.com/embed/{converter.videoData.id}?start={converter.startSeconds}&end={converter.endSeconds}&autoplay=1"
						title="YouTube player preview"
						class="w-full h-full"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
						allowfullscreen
					></iframe>
				</div>
			</div>
		{/if}

		<!-- Audio Quality Selector -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<span class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
					<Sliders class="w-3.5 h-3.5 text-cyan-400" />
					Qualidade de Áudio (Bitrate)
				</span>
				<span class="text-xs font-semibold text-cyan-300 bg-cyan-950/50 px-2.5 py-1 rounded-lg border border-cyan-800/40 font-mono">
					Tamanho Est.: {converter.estimatedFileSize}
				</span>
			</div>

			<!-- Segmented Bitrate Cards -->
			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				{#each bitrates as b}
					<button
						type="button"
						onclick={() => (converter.bitrate = b.id)}
						class="p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer relative flex flex-col justify-between space-y-1 ${
							converter.bitrate === b.id
								? 'bg-cyan-950/50 border-cyan-500 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-500/50'
								: 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/60'
						}"
					>
						<div class="flex items-center justify-between">
							<span class="text-sm font-bold ${converter.bitrate === b.id ? 'text-cyan-200' : 'text-slate-200'}">
								{b.label}
							</span>
							{#if converter.bitrate === b.id}
								<div class="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center">
									<Check class="w-2.5 h-2.5 text-slate-950 stroke-[3]" />
								</div>
							{/if}
						</div>
						<span class="text-[11px] text-slate-400 font-medium">{b.desc}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Audio Trimmer Section -->
		<div class="rounded-xl bg-slate-950/80 transition-all duration-300 shadow-lg ${
			converter.enableTrim ? 'border border-cyan-500/40 p-5 shadow-cyan-950/20' : 'border border-slate-800/80 p-4'
		}">
			<!-- Header / Toggle Line -->
			<div class="flex items-center justify-between gap-3">
				<div class="flex items-center gap-3">
					<div class="p-2 rounded-xl text-cyan-400 ${converter.enableTrim ? 'bg-cyan-950 border border-cyan-500/40' : 'bg-slate-900 border border-slate-800'}">
						<Scissors class="w-5 h-5" />
					</div>
					<div>
						<h4 class="text-sm font-bold text-slate-100 flex items-center gap-2">
							Cortador de Áudio
							{#if converter.enableTrim}
								<span class="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-[10px] font-mono border border-cyan-500/40">
									Trecho: {formatDurationText(converter.endSeconds - converter.startSeconds)}
								</span>
							{/if}
						</h4>
						<p class="text-xs text-slate-400">
							{converter.enableTrim ? 'Escolha os minutos e segundos exatos para o corte' : 'Deseja baixar apenas um trecho específico deste áudio?'}
						</p>
					</div>
				</div>

				<!-- Prominent Toggle / Cancel Button -->
				{#if converter.enableTrim}
					<button
						type="button"
						onclick={cancelCut}
						class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
					>
						<X class="w-4 h-4 text-rose-400" />
						<span>Cancelar Corte</span>
					</button>
				{:else}
					<button
						type="button"
						onclick={() => (converter.enableTrim = true)}
						class="px-4 py-2 rounded-xl text-xs font-bold transition-all border border-cyan-500/40 bg-slate-900 hover:bg-slate-800 text-cyan-400 hover:border-cyan-400 flex items-center gap-2 cursor-pointer shrink-0 shadow-sm"
					>
						<Scissors class="w-4 h-4" />
						<span>Desejo Cortar o Áudio</span>
					</button>
				{/if}
			</div>

			<!-- EXPANDED TIME PICKER & CONTROLS -->
			{#if converter.enableTrim}
				<div class="pt-5 mt-4 border-t border-slate-800/80 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
					
					<!-- Quick Preset Shortcuts -->
					<div class="space-y-2">
						<span class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
							<Timer class="w-3.5 h-3.5 text-cyan-400" />
							Atalhos Rápidos de Tempo:
						</span>
						<div class="flex flex-wrap gap-2">
							<button
								type="button"
								onclick={() => setQuickCut(0, 30)}
								class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950 text-xs font-semibold text-slate-200 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/50 transition-colors cursor-pointer"
							>
								⚡ Início até 30s
							</button>
							<button
								type="button"
								onclick={() => setQuickCut(0, 60)}
								class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950 text-xs font-semibold text-slate-200 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/50 transition-colors cursor-pointer"
							>
								⚡ Início até 1 min
							</button>
							<button
								type="button"
								onclick={() => setQuickCut(30, 90)}
								class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-cyan-950 text-xs font-semibold text-slate-200 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/50 transition-colors cursor-pointer"
							>
								🎵 0:30 até 1:30
							</button>
							<button
								type="button"
								onclick={cancelCut}
								class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-400 hover:text-rose-300 border border-slate-800 flex items-center gap-1.5 cursor-pointer"
							>
								<RotateCcw class="w-3.5 h-3.5" />
								<span>Cancelar / Áudio Inteiro</span>
							</button>
						</div>
					</div>

					<!-- MODERN NUMERIC TIME SPINNER CONTROLLERS -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						
						<!-- START TIME SELECTOR CARD -->
						<div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-3 shadow-sm">
							<div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
								<span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
									<span class="w-2 h-2 rounded-full bg-cyan-400"></span>
									INÍCIO DO CORTE
								</span>
								<span class="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
									{converter.startTime}
								</span>
							</div>

							<div class="grid grid-cols-2 gap-3">
								<!-- Minutes Spinner -->
								<div class="space-y-1.5 text-center">
									<span class="text-[11px] font-semibold text-slate-400">Minutos</span>
									<div class="flex items-center justify-between bg-slate-950 border border-slate-800/90 rounded-lg p-1">
										<button
											type="button"
											onclick={() => setStartMins(getMinsSecs(converter.startSeconds).mins - 1)}
											class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
										>
											<Minus class="w-3.5 h-3.5" />
										</button>
										<span class="font-mono text-base font-bold text-slate-100">
											{getMinsSecs(converter.startSeconds).mins.toString().padStart(2, '0')}
										</span>
										<button
											type="button"
											onclick={() => setStartMins(getMinsSecs(converter.startSeconds).mins + 1)}
											class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
										>
											<Plus class="w-3.5 h-3.5" />
										</button>
									</div>
								</div>

								<!-- Seconds Spinner -->
								<div class="space-y-1.5 text-center">
									<span class="text-[11px] font-semibold text-slate-400">Segundos</span>
									<div class="flex items-center justify-between bg-slate-950 border border-slate-800/90 rounded-lg p-1">
										<button
											type="button"
											onclick={() => setStartSecs(getMinsSecs(converter.startSeconds).secs - 1)}
											class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
										>
											<Minus class="w-3.5 h-3.5" />
										</button>
										<span class="font-mono text-base font-bold text-cyan-300">
											{getMinsSecs(converter.startSeconds).secs.toString().padStart(2, '0')}
										</span>
										<button
											type="button"
											onclick={() => setStartSecs(getMinsSecs(converter.startSeconds).secs + 1)}
											class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
										>
											<Plus class="w-3.5 h-3.5" />
										</button>
									</div>
								</div>
							</div>
						</div>

						<!-- END TIME SELECTOR CARD -->
						<div class="p-4 rounded-xl bg-slate-900/90 border border-slate-800/90 space-y-3 shadow-sm">
							<div class="flex items-center justify-between border-b border-slate-800/80 pb-2">
								<span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
									<span class="w-2 h-2 rounded-full bg-blue-400"></span>
									FIM DO CORTE
								</span>
								<span class="font-mono text-xs font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/40">
									{converter.endTime}
								</span>
							</div>

							<div class="grid grid-cols-2 gap-3">
								<!-- Minutes Spinner -->
								<div class="space-y-1.5 text-center">
									<span class="text-[11px] font-semibold text-slate-400">Minutos</span>
									<div class="flex items-center justify-between bg-slate-950 border border-slate-800/90 rounded-lg p-1">
										<button
											type="button"
											onclick={() => setEndMins(getMinsSecs(converter.endSeconds).mins - 1)}
											class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
										>
											<Minus class="w-3.5 h-3.5" />
										</button>
										<span class="font-mono text-base font-bold text-slate-100">
											{getMinsSecs(converter.endSeconds).mins.toString().padStart(2, '0')}
										</span>
										<button
											type="button"
											onclick={() => setEndMins(getMinsSecs(converter.endSeconds).mins + 1)}
											class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
										>
											<Plus class="w-3.5 h-3.5" />
										</button>
									</div>
								</div>

								<!-- Seconds Spinner -->
								<div class="space-y-1.5 text-center">
									<span class="text-[11px] font-semibold text-slate-400">Segundos</span>
									<div class="flex items-center justify-between bg-slate-950 border border-slate-800/90 rounded-lg p-1">
										<button
											type="button"
											onclick={() => setEndSecs(getMinsSecs(converter.endSeconds).secs - 1)}
											class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
										>
											<Minus class="w-3.5 h-3.5" />
										</button>
										<span class="font-mono text-base font-bold text-cyan-300">
											{getMinsSecs(converter.endSeconds).secs.toString().padStart(2, '0')}
										</span>
										<button
											type="button"
											onclick={() => setEndSecs(getMinsSecs(converter.endSeconds).secs + 1)}
											class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center active:scale-95 transition-all cursor-pointer"
										>
											<Plus class="w-3.5 h-3.5" />
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>

					<!-- Visual Slider Waveform Track -->
					<div class="space-y-2 px-1 pt-1">
						<div class="flex justify-between text-[11px] text-slate-400 font-medium">
							<span>Deslizar Marcadores:</span>
							<span class="text-cyan-300 font-bold font-mono">
								Duração Total a Baixar: {formatDurationText(converter.endSeconds - converter.startSeconds)}
							</span>
						</div>
						<Slider
							type="multiple"
							bind:value={sliderValue}
							onValueChange={(val: number[]) => handleSliderChange(val)}
							max={converter.videoData.duration}
							min={0}
							step={1}
							class="w-full"
						/>
					</div>

					<!-- Audio Player Preview Toggle Button -->
					<button
						type="button"
						onclick={() => (showAudioPreview = !showAudioPreview)}
						class="w-full py-2.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 hover:text-cyan-100 text-xs font-bold border border-cyan-500/40 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
					>
						<Volume2 class="w-4 h-4 text-cyan-400" />
						<span>{showAudioPreview ? 'Ocultar Player de Prévia' : '🔊 Ouvir Prévia do Trecho Selecionado no Player'}</span>
					</button>
				</div>
			{/if}
		</div>

		<!-- Start Conversion CTA -->
		<button
			type="button"
			onclick={() => converter.startConversion()}
			class="w-full h-14 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 hover:from-cyan-300 hover:to-indigo-300 shadow-xl shadow-cyan-950/40 flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer active:scale-98 cyan-glow-btn text-base"
		>
			<span>Iniciar Conversão MP3</span>
			<ArrowRight class="w-5 h-5 stroke-[2.5]" />
		</button>
	</div>
{/if}

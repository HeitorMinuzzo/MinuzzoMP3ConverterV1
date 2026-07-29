<script lang="ts">
	import { Download, RefreshCw, CheckCircle2, Loader2, ShieldCheck, Music } from 'lucide-svelte';
	import { converter } from '$lib/state.svelte';
	import Progress from '$lib/components/ui/progress/progress.svelte';
</script>

{#if converter.status === 'converting' || converter.status === 'completed'}
	<div class="cyber-panel rounded-2xl p-6 sm:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
		<!-- Track Info Summary Header -->
		{#if converter.videoData}
			<div class="flex items-center gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/80">
				<img
					src={converter.videoData.thumbnail}
					alt={converter.videoData.title}
					class="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0 shadow-md"
				/>
				<div class="min-w-0 flex-1">
					<h4 class="text-sm font-bold text-slate-100 truncate font-['Outfit']">{converter.videoData.title}</h4>
					<div class="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
						<span class="px-2 py-0.5 rounded bg-cyan-950/70 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-800/40">
							{converter.bitrate} kbps
						</span>
						{#if converter.enableTrim}
							<span class="px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 font-mono text-[11px] font-bold border border-blue-800/40">
								Corte: {converter.startTime} - {converter.endTime}
							</span>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Progress Bar & Status Text -->
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					{#if converter.status === 'converting'}
						<Loader2 class="w-4 h-4 text-cyan-400 animate-spin" />
					{:else}
						<CheckCircle2 class="w-4 h-4 text-emerald-400" />
					{/if}
					<span class="text-xs sm:text-sm font-semibold text-slate-200">{converter.statusText}</span>
				</div>
				<span class="text-xs sm:text-sm font-mono font-bold text-cyan-400">{converter.progress}%</span>
			</div>

			<!-- Progress Bar Container with Glow -->
			<div class="relative">
				<Progress value={converter.progress} class="h-3.5 bg-slate-950 border border-slate-800/80 rounded-full" />
				{#if converter.status === 'converting'}
					<div
						class="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full blur-sm opacity-60 transition-all duration-300"
						style="width: {converter.progress}%;"
					></div>
				{/if}
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="space-y-3 pt-2">
			{#if converter.status === 'completed'}
				<!-- Primary Download Button -->
				<button
					type="button"
					onclick={() => converter.downloadMp3()}
					class="w-full h-14 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-3 text-base transition-all duration-300 cursor-pointer active:scale-98 group cyan-glow-btn"
				>
					<Download class="w-5 h-5 text-slate-950 group-hover:translate-y-0.5 transition-transform stroke-[2.5]" />
					<span>Baixar Arquivo MP3 ({converter.estimatedFileSize})</span>
				</button>
			{/if}

			<!-- Reset / Convert Another Video Button -->
			<button
				type="button"
				onclick={() => converter.reset()}
				class="w-full h-11 rounded-xl font-semibold text-slate-300 hover:text-cyan-300 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 hover:border-cyan-500/40 flex items-center justify-center gap-2 text-xs transition-all cursor-pointer"
			>
				<RefreshCw class="w-3.5 h-3.5 text-slate-400" />
				<span>Converter Outro Vídeo</span>
			</button>
		</div>

		<!-- Guarantee Badge -->
		<div class="flex items-center justify-center gap-2 text-[11px] text-slate-500 pt-1">
			<ShieldCheck class="w-4 h-4 text-emerald-400" />
			<span>Conversão direta em alta fidelidade estéreo • Sem propagandas</span>
		</div>
	</div>
{/if}

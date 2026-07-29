<script lang="ts">
	import { Link2, Wand2, ClipboardPaste, AlertCircle, CheckCircle2 } from 'lucide-svelte';
	import { converter } from '$lib/state.svelte';
	import Input from '$lib/components/ui/input/input.svelte';

	let isPasting = $state(false);

	async function handlePaste() {
		try {
			isPasting = true;
			const text = await navigator.clipboard.readText();
			if (text) {
				converter.url = text.trim();
				if (converter.isValidUrl) {
					converter.processUrl();
				}
			}
		} catch (err) {
			console.error('Failed to read clipboard', err);
		} finally {
			setTimeout(() => {
				isPasting = false;
			}, 300);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && converter.isValidUrl && converter.status === 'idle') {
			converter.processUrl();
		}
	}
</script>

<div class="cyber-panel rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden transition-all duration-300">
	<!-- Ambient Background Orbs inside Card -->
	<div class="absolute -top-20 -right-20 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
	<div class="absolute -bottom-20 -left-20 w-44 h-44 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

	<div class="space-y-3 relative z-10">
		<label for="youtube-url" class="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
			<span class="flex items-center gap-1.5 text-cyan-300">
				<Link2 class="w-3.5 h-3.5 text-cyan-400" />
				Link do Vídeo do YouTube
			</span>
			<span class="text-[11px] text-slate-500 font-normal">Suporta vídeos, Shorts & listas</span>
		</label>

		<div class="relative flex flex-col sm:flex-row items-center gap-3">
			<!-- Link Input Group -->
			<div class="relative flex-1 w-full group">
				<div class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-400 transition-colors pointer-events-none">
					<Link2 class="w-5 h-5" />
				</div>

				<Input
					id="youtube-url"
					type="url"
					placeholder="Cole o link do YouTube aqui (ex: https://youtube.com/watch?v=...)"
					bind:value={converter.url}
					onkeydown={handleKeydown}
					class="w-full pl-11 pr-24 h-13 bg-slate-950/80 border-slate-800/90 text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all text-sm font-medium"
				/>

				<!-- Quick Paste Button -->
				<button
					type="button"
					onclick={handlePaste}
					class="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 text-xs font-semibold border border-slate-700/60 hover:border-cyan-500/40 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
					title="Colar da área de transferência"
				>
					<ClipboardPaste class="w-3.5 h-3.5 text-cyan-400" />
					<span>{isPasting ? 'Colado!' : 'Colar'}</span>
				</button>
			</div>

			<!-- Main Convert CTA Button -->
			<button
				type="button"
				disabled={!converter.isValidUrl || converter.status === 'fetching'}
				onclick={() => converter.processUrl()}
				class="w-full sm:w-auto h-13 px-7 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-400 hover:from-cyan-300 hover:to-blue-300 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2.5 transition-all duration-300 cursor-pointer active:scale-95 group shrink-0 relative overflow-hidden cyan-glow-btn"
			>
				<Wand2 class="w-5 h-5 text-slate-950 group-hover:rotate-12 transition-transform duration-300" />
				<span>{converter.status === 'fetching' ? 'Buscando...' : 'Converter'}</span>
			</button>
		</div>

		<!-- Validation Feedback -->
		{#if converter.url.length > 0}
			<div class="flex items-center gap-2 text-xs pt-1 transition-all">
				{#if converter.isValidUrl}
					<CheckCircle2 class="w-4 h-4 text-emerald-400" />
					<span class="text-emerald-400 font-semibold">Link do YouTube válido detectado</span>
				{:else}
					<AlertCircle class="w-4 h-4 text-amber-400" />
					<span class="text-amber-400 font-medium">Insira um link de vídeo do YouTube válido</span>
				{/if}
			</div>
		{/if}

		{#if converter.errorMessage}
			<div class="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2.5">
				<AlertCircle class="w-4.5 h-4.5 text-rose-400 shrink-0" />
				<span>{converter.errorMessage}</span>
			</div>
		{/if}
	</div>
</div>

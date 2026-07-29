<script lang="ts">
	import { AudioLines, Zap } from "lucide-svelte";
</script>

<header class="flex flex-col items-center text-center space-y-4 pt-6 pb-2">
	<!-- Top Status Badge -->
	<div
		class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-xl shadow-md shadow-cyan-950/30 text-xs font-semibold text-cyan-300"
	>
		<Zap class="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
		<span>Conversor de Áudio Ultra Rápido</span>
		<span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
	</div>

	<!-- Minimalist Sleek Icon Container -->
	<div class="relative group">
		<!-- Subtle Outer Ambient Light -->
		<div
			class="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur-xl opacity-40 group-hover:opacity-75 transition duration-500"
		></div>

		<!-- Clean Icon Shield -->
		<div
			class="relative w-16 h-16 rounded-2xl bg-slate-950/90 border border-cyan-500/40 flex items-center justify-center shadow-xl backdrop-blur-xl group-hover:scale-105 transition-transform duration-300"
		>
			<AudioLines class="w-8 h-8 text-cyan-400 stroke-[2.2]" />
		</div>
	</div>

	<!-- Title & Subtitle -->
	<div class="space-y-2 max-w-lg">
		<h1
			class="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-300 bg-clip-text text-transparent font-['Outfit'] drop-shadow-md"
		>
			Minuzzo<span class="text-cyan-400">MP3</span>Converter
		</h1>
		<p
			class="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-md mx-auto font-medium"
		>
			Converta e corte vídeos do YouTube em MP3 de altíssima qualidade
			(128 kbps, 192 kbps e 320 kbps) instantaneamente.
		</p>
	</div>
</header>

<script lang="ts">
	import { GitBranch, Activity, ShieldAlert } from 'lucide-svelte';
</script>

<footer class="pt-8 pb-12 space-y-4 text-center text-xs text-slate-500 max-w-xl mx-auto">
	<!-- Links & Status -->
	<div class="flex items-center justify-center gap-6">
		<a
			href="https://github.com"
			target="_blank"
			rel="noreferrer"
			class="inline-flex items-center gap-1.5 hover:text-cyan-300 transition-colors"
		>
			<GitBranch class="w-3.5 h-3.5" />
			<span>Repositório GitHub</span>
		</a>

		<div class="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
			<Activity class="w-3.5 h-3.5" />
			<span>API Status: Operacional</span>
		</div>
	</div>

	<!-- Copyright Disclaimer -->
	<div class="p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 text-[11px] leading-relaxed text-slate-400 space-y-1">
		<p>
			<strong>MinuzzoMP3Converter</strong> destina-se exclusivamente ao uso pessoal e arquivamento educativo. Respeite os direitos autorais dos criadores de conteúdo.
		</p>
	</div>

	<p class="text-[11px] text-slate-500 font-medium">
		Desenvolvido com SvelteKit 5, Tailwind CSS & Shadcn-Svelte
	</p>
</footer>

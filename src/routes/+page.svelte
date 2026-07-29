<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import InputCard from '$lib/components/InputCard.svelte';
	import PreviewSettingsCard from '$lib/components/PreviewSettingsCard.svelte';
	import ProgressDownloadCard from '$lib/components/ProgressDownloadCard.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>MinuzzoMP3Converter — Conversor de YouTube para MP3 em Alta Qualidade</title>
	<meta name="description" content="Converta e corte vídeos do YouTube em MP3 de alta fidelidade (320kbps) instantaneamente com o MinuzzoMP3Converter." />
</svelte:head>

<main class="relative min-h-screen flex flex-col justify-between overflow-x-hidden selection:bg-cyan-400 selection:text-slate-950">
	<!-- Ambient Background Glowing Light Spheres (Cyan / Blue / Indigo) -->
	<div class="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] bg-gradient-to-tr from-cyan-500/18 via-blue-600/15 to-indigo-600/15 rounded-full blur-[150px] pointer-events-none animate-orb-1"></div>
	<div class="fixed bottom-10 right-10 w-[450px] h-[450px] bg-cyan-400/12 rounded-full blur-[130px] pointer-events-none animate-orb-2"></div>
	<div class="fixed top-20 left-10 w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

	<!-- Dashboard Container -->
	<div class="w-full max-w-2xl mx-auto px-4 py-8 md:py-12 space-y-6 relative z-10">
		<!-- Header -->
		<Header />

		<!-- Main Input Card (State 1) -->
		<InputCard />

		<!-- Preview & Settings Card (State 2) -->
		<PreviewSettingsCard />

		<!-- Progress & Download Card (State 3 & 4) -->
		<ProgressDownloadCard />

		<!-- Footer -->
		<Footer />
	</div>
</main>

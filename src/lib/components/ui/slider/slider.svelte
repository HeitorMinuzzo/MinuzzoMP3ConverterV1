<script lang="ts">
	import { Slider as SliderPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		value = $bindable(),
		type = "multiple",
		orientation = "horizontal",
		class: className,
		...restProps
	}: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props();
</script>

<SliderPrimitive.Root
	bind:ref
	bind:value={value as any}
	data-slot="slider"
	type={type as any}
	{orientation}
	class={cn(
		"data-vertical:min-h-40 relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col",
		className
	)}
	{...restProps as any}
>
	{#snippet children({ thumbItems })}
		<span
			data-slot="slider-track"
			data-orientation={orientation}
			class={cn(
				"rounded-full data-horizontal:h-1.5 data-horizontal:w-full data-vertical:h-full data-vertical:w-1.5 bg-slate-800/90 relative grow overflow-hidden"
			)}
		>
			<SliderPrimitive.Range
				data-slot="slider-range"
				class={cn(
					"bg-gradient-to-r from-cyan-400 to-blue-500 absolute select-none data-horizontal:h-full data-vertical:w-full shadow-sm"
				)}
			/>
		</span>
		{#each thumbItems as thumb (thumb.index)}
			<SliderPrimitive.Thumb
				data-slot="slider-thumb"
				index={thumb.index}
				class="border-2 border-cyan-400 ring-cyan-500/50 relative size-4 rounded-full bg-cyan-300 shadow-md shadow-cyan-950/60 after:absolute after:-inset-2 hover:scale-125 hover:bg-cyan-100 hover:border-cyan-300 focus-visible:ring-2 focus-visible:outline-none active:scale-110 block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing"
			/>
		{/each}
	{/snippet}
</SliderPrimitive.Root>

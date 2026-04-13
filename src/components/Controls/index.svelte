<script>
	import ActionBar from './ActionBar/index.svelte';
	import Keyboard from './Keyboard.svelte';

	export let onGuess;
	export let onUndo;
	export let onRedo;
	export let canUndo;
	export let canRedo;
	export let grid;
	export let fixedGrid;
</script>

<div class="px-4 pb-5 flex justify-center">
	<div class="w-full max-w-xl">
		<ActionBar {grid} {canUndo} {canRedo} {onUndo} {onRedo} />
		<Keyboard {onGuess} {fixedGrid} />
	</div>
</div>
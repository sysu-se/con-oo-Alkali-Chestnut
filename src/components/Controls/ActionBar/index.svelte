<script>
	import Timer from './Timer.svelte';
	import Actions from './Actions.svelte';

	// 从 Controls 接收并转发给 Actions
	export let grid;
	export let canUndo;
	export let canRedo;
	export let onUndo;
	export let onRedo;
</script>

<div class="action-bar space-y-3 xs:space-y-0">
	<Timer />
	<Actions {grid} {canUndo} {canRedo} {onUndo} {onRedo} />
</div>

<style>
	.action-bar {
		@apply flex flex-col flex-wrap justify-between pb-5;
	}

	@screen xs {
		.action-bar {
			@apply flex-row;
		}
	}
</style>
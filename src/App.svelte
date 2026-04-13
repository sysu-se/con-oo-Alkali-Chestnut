<script>
	import { onMount } from 'svelte';
	import { validateSencode } from '@sudoku/sencode';
	import game from '@sudoku/game';
	import { modal } from '@sudoku/stores/modal';
	import Board from './components/Board/index.svelte';
	import Controls from './components/Controls/index.svelte';
	import Header from './components/Header/index.svelte';
	import Modal from './components/Modal/index.svelte';

	// 使用 gameStore
	import { createGameStore } from './stores/gameStore.js';

	let gameStore = null;
	let grid, fixedGrid, invalidCells, canUndo, canRedo, won;

	function handleGuess(row, col, value) {
		if (gameStore) {
			gameStore.guess({ row, col, value });
		}
	}

	function handleUndo() {
		gameStore?.undo();
	}

	function handleRedo() {
		gameStore?.redo();
	}

	function initGame(initialGrid) {
		gameStore = createGameStore(initialGrid);
		({ grid, fixedGrid, invalidCells, canUndo, canRedo, won } = gameStore);

		// 监听胜利
		won.subscribe(w => {
			if (w) {
				game.pause();
				modal.show('gameover');
			}
		});
	}

	onMount(() => {
		let hash = location.hash;
		if (hash.startsWith('#')) hash = hash.slice(1);

		let sencode;
		if (validateSencode(hash)) {
			sencode = hash;
		}

		modal.show('welcome', {
			onHide: () => {
				game.resume();

				// 临时测试题面
				const testGrid = [
					[5, 3, 0, 0, 7, 0, 0, 0, 0],
					[6, 0, 0, 1, 9, 5, 0, 0, 0],
					[0, 9, 8, 0, 0, 0, 0, 6, 0],
					[8, 0, 0, 0, 6, 0, 0, 0, 3],
					[4, 0, 0, 8, 0, 3, 0, 0, 1],
					[7, 0, 0, 0, 2, 0, 0, 0, 6],
					[0, 6, 0, 0, 0, 0, 2, 8, 0],
					[0, 0, 0, 4, 1, 9, 0, 0, 5],
					[0, 0, 0, 0, 8, 0, 0, 7, 9]
				];

				initGame(testGrid);
			},
			sencode
		});
	});
</script>

<header>
	<Header />
</header>

<section>
	{#if grid}
		<Board {grid} {fixedGrid} {invalidCells} />
	{/if}
</section>

<footer>
	{#if grid}
		<Controls {grid} {fixedGrid} {canUndo} {canRedo}
			onGuess={handleGuess}
			onUndo={handleUndo}
			onRedo={handleRedo} />
	{/if}
</footer>

<Modal />

<style global>
	@import "./styles/global.css";
</style>
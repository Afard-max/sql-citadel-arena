import { derived } from 'svelte/store';
import { progressStore } from './progress.js';

export const settingsStore = derived(progressStore, ($progress) => $progress.settings);

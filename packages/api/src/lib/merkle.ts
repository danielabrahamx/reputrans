/**
 * Merkle tree utilities for anonymity set management.
 * Uses Barretenberg Pedersen hash to match Noir's std::hash::pedersen_hash exactly.
 *
 * Tree depth: 10 (1024 leaves)
 */

import { pedersenHash } from './pedersen.js';

const TREE_DEPTH = 10;
const SET_SIZE = 1024; // 2^10

export class MerkleTree {
  private leaves: bigint[];
  private layers: bigint[][];
  private built: boolean;

  constructor() {
    this.leaves = [];
    this.layers = [];
    this.built = false;
  }

  /** Insert a leaf and rebuild tree. Returns the leaf index. Throws if tree is full. */
  insertSync(leaf: bigint): number {
    if (this.leaves.length >= SET_SIZE) throw new Error('Anonymity set is full');
    const index = this.leaves.length;
    this.leaves.push(leaf);
    this.built = false; // mark dirty
    return index;
  }

  /** Rebuild all Merkle layers using real Pedersen hash (async). Must be awaited after insertSync. */
  async build(): Promise<void> {
    const paddedLeaves = [...this.leaves];
    while (paddedLeaves.length < SET_SIZE) paddedLeaves.push(0n);

    this.layers = [];
    let currentLayer = paddedLeaves;
    this.layers.push([...currentLayer]);

    for (let depth = 0; depth < TREE_DEPTH; depth++) {
      const nextLayer: bigint[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = currentLayer[i + 1] ?? 0n;
        nextLayer.push(await pedersenHash([left, right]));
      }
      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }
    this.built = true;
  }

  /** Get the Merkle root (requires build() to have been called). */
  getRoot(): bigint {
    if (!this.built || this.layers.length === 0) return 0n;
    const topLayer = this.layers[this.layers.length - 1];
    return topLayer[0] ?? 0n;
  }

  /** Get the Merkle proof (path + indices) for a leaf at a given index. */
  getProof(leafIndex: number): { path: bigint[]; indices: number[] } {
    if (!this.built) throw new Error('Tree not built — call build() first');
    if (leafIndex >= this.leaves.length) throw new Error('Leaf index out of bounds');

    const path: bigint[] = [];
    const indices: number[] = [];
    let currentIndex = leafIndex;

    for (let depth = 0; depth < TREE_DEPTH; depth++) {
      const layer = this.layers[depth];
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      const sibling = siblingIndex < layer.length ? layer[siblingIndex] : 0n;
      path.push(sibling);
      indices.push(currentIndex % 2); // 0 = left, 1 = right
      currentIndex = Math.floor(currentIndex / 2);
    }

    return { path, indices };
  }

  get size(): number {
    return this.leaves.length;
  }
}

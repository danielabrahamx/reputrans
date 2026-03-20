# TRM Codebase — Technical Analysis
Source: https://github.com/SamsungSAILMontreal/TinyRecursiveModels

---

## 1. Overall Class Structure

| Class | File | Role |
|---|---|---|
| `TinyRecursiveReasoningModel_ACTV1Config` | `models/recursive_reasoning/trm.py` | Pydantic config (all hyperparams) |
| `TinyRecursiveReasoningModel_ACTV1Block` | trm.py | Single transformer/MLP-T block (Attn + SwiGLU, post-norm RMSNorm) |
| `TinyRecursiveReasoningModel_ACTV1ReasoningModule` | trm.py | Stack of blocks; adds input_injection before each pass |
| `TinyRecursiveReasoningModel_ACTV1_Inner` | trm.py | Core model — holds embeddings, L_level reasoning module, lm_head, q_head |
| `TinyRecursiveReasoningModel_ACTV1` | trm.py | ACT outer wrapper — manages carry state, halting loop |
| `ACTLossHead` | `models/losses.py` | Wraps the model; computes LM loss + Q-learning halt loss; exposes `forward()` for training |
| `TinyRecursiveReasoningModel_ACTV1Carry` | trm.py (dataclass) | Outer carry: `inner_carry`, `steps`, `halted`, `current_data` |
| `TinyRecursiveReasoningModel_ACTV1InnerCarry` | trm.py (dataclass) | Inner carry: `z_H` (tensor), `z_L` (tensor) |

---

## 2. Core Recursive Update Function

**Location:** `TinyRecursiveReasoningModel_ACTV1_Inner.forward()` — `models/recursive_reasoning/trm.py`

**Exact signature:**
```python
def forward(
    self,
    carry: TinyRecursiveReasoningModel_ACTV1InnerCarry,
    batch: Dict[str, torch.Tensor]
) -> Tuple[
    TinyRecursiveReasoningModel_ACTV1InnerCarry,
    torch.Tensor,           # logits: [B, seq_len, vocab_size]
    Tuple[torch.Tensor, torch.Tensor]  # (q_halt_logits, q_continue_logits): [B]
]
```

**What it does:**
- Encodes inputs via `_input_embeddings()` → `input_embeddings` shape `[B, seq_len + puzzle_emb_len, hidden_size]`
- Runs `H_cycles - 1` iterations **without gradient** (torch.no_grad), then 1 iteration **with gradient**
- Each "outer cycle" (H-step): runs `L_cycles` L-steps then 1 H-step:
  ```python
  for _L_step in range(L_cycles):
      z_L = L_level(z_L, z_H + input_embeddings)   # z_L attends to z_H+x
  z_H = L_level(z_H, z_L)                           # z_H attends to z_L
  ```
- Returns `new_carry` with `.detach()` on both z_H and z_L (gradients do NOT flow between outer ACT steps)
- `output = lm_head(z_H)[:, puzzle_emb_len:]` — strips the puzzle prefix tokens
- `q_logits = q_head(z_H[:, 0])` — Q-values from first puzzle token position only

---

## 3. Input Embedding Layer

**Method:** `TinyRecursiveReasoningModel_ACTV1_Inner._input_embeddings(input, puzzle_identifiers)`

**Pipeline:**
1. `embed_tokens`: `CastedEmbedding(vocab_size, hidden_size)` — token embedding table, scaled by `sqrt(hidden_size)`
2. `puzzle_emb`: `CastedSparseEmbedding(num_puzzle_identifiers, puzzle_emb_ndim)` — per-puzzle learnable vector. Reshaped from flat `puzzle_emb_ndim`-dim into `[B, puzzle_emb_len, hidden_size]` prefix tokens and concatenated before the sequence.
3. Optional `embed_pos`: learned positional embedding added with 1/sqrt(2) scaling (only if `pos_encodings="learned"`; default is RoPE)
4. Final output scaled by `embed_scale = sqrt(hidden_size)`

**Output dimension:** `[B, seq_len + puzzle_emb_len, hidden_size]`
- Default `hidden_size = 512`, `puzzle_emb_len = 16` → total seq prefix = 16 puzzle tokens + seq_len grid tokens
- `puzzle_emb_ndim = hidden_size = 512` by default (one 512-d vector per puzzle, reshaped into 1 prefix token; with `puzzle_emb_len=16` it pads to 16 * 512 = 8192 dims)

**Non-obvious detail:** `puzzle_emb` uses a custom `CastedSparseEmbeddingSignSGD_Distributed` optimizer — NOT AdamATan2. This is a per-puzzle embedding (like a task identity token) that gets a separate SignSGD optimizer with different LR.

---

## 4. Halting Mechanism

**Type: Learned Q-value halting (custom ACT variant), with max-step cap. During eval: always runs to halt_max_steps.**

**Location:** `TinyRecursiveReasoningModel_ACTV1.forward()` — outer ACT wrapper

**Exact halting logic (training):**
```python
# Always halt at max step
halted = (new_steps >= halt_max_steps)   # halt_max_steps=16 default

if self.training and halt_max_steps > 1:
    if no_ACT_continue:                          # default=True
        halted = halted | (q_halt_logits > 0)    # halt if Q_halt > 0
    else:
        halted = halted | (q_halt_logits > q_continue_logits)

    # Exploration: force minimum step count randomly
    min_halt_steps = (rand < halt_exploration_prob) * randint(2, halt_max_steps+1)
    halted = halted & (new_steps >= min_halt_steps)
```

**During evaluation:** halting logic is skipped entirely — model always runs to `halt_max_steps`. This guarantees uniform batch sizes at eval time.

**Q-head:** `CastedLinear(hidden_size, 2)` → outputs (q_halt_logit, q_continue_logit). Initialized to near-zero (weight=0, bias=-5) for stable bootstrapping. Uses the first position of `z_H` only (puzzle embedding token 0).

**`no_ACT_continue=True` (default):** The continue logit is completely ignored at inference — only sigmoid of halt logit matters. The continue Q-value is only used when `no_ACT_continue=False`.

**Loss for halting (`ACTLossHead.forward()`):**
```python
# Q-learning loss: MSE between q_halt and target (whether sequence was correct)
q_loss = MSE(sigmoid(q_halt_logits), target_is_correct)
# + optional continue loss (disabled by default)
```

---

## 5. Latent State Dimensions

| Tensor | Shape | Notes |
|---|---|---|
| `z_H` | `[B, seq_len + puzzle_emb_len, hidden_size]` = `[B, L+16, 512]` | "High-level" latent; initialized from `H_init` (learned scalar broadcast) |
| `z_L` | `[B, seq_len + puzzle_emb_len, hidden_size]` = `[B, L+16, 512]` | "Low-level" latent; initialized from `L_init` |
| `y` (output logits) | `[B, seq_len, vocab_size]` | Stripped of puzzle prefix; `vocab_size` task-dependent |

**Note:** z_H and z_L are the SAME shape and processed by the SAME `L_level` module. There is no separate H_level module — the "hierarchy" is purely in the update order, not separate network weights. This is a key simplification vs. HRM.

---

## 6. Training Loop

**Script:** `pretrain.py`

**Batching:** `PuzzleDataset` → `DataLoader(batch_size=None)` — dataset yields pre-formed batches. Distributed via rank/world_size sharding at dataset level.

**Forward pass:**
```python
carry, loss, metrics, _, _ = model(carry=carry, batch=batch, return_keys=[])
((1 / global_batch_size) * loss).backward()
```
- Carry is **persistent across batches** within a training epoch — it is only reset when a sample is newly "halted" (i.e., on the next batch a halted sample resets its z_H/z_L to learned init vectors)
- This means the model trains recurrently across sequential batches, not independently per batch

**Optimizer:** `AdamATan2` (a variant of Adam with atan2 gradient normalization — NOT standard Adam). Separate `CastedSparseEmbeddingSignSGD_Distributed` for puzzle embeddings.

**LR schedule:** Cosine decay with warmup. LR set per-step manually into `param_group['lr']` before each `optim.step()`.

**Loss function (from `ACTLossHead`):**
```
total_loss = lm_loss + q_loss
```
- `lm_loss`: `stablemax_cross_entropy` (custom stable softmax variant — NOT standard cross-entropy). Averaged over non-ignored positions.
- `q_loss`: MSE between `sigmoid(q_halt_logits)` and correctness target (float 0/1).

**Gradient isolation:** The carry's `z_H`/`z_L` are detached at each ACT outer step. Within one ACT call, only the final H_cycle gets gradients (H_cycles-1 are wrapped in `torch.no_grad()`).

---

## 7. Surprises and Non-Obvious Details for a Fork

1. **Same module for z_H and z_L:** `L_level` is the *only* transformer module — it processes both latents. z_H←f(z_H, z_L) and z_L←f(z_L, z_H+x) using the same weights. This is the key parameter efficiency trick.

2. **Carry persistence across training batches:** `train_state.carry` is not reset between batches — only halted samples within a batch get their carry reset. A fork must decide whether to preserve this stateful training.

3. **Input injection via addition:** `ReasoningModule.forward()` does `hidden_states = hidden_states + input_injection` before running layers. For z_L updates, injection = `z_H + input_embeddings`. For z_H updates, injection = `z_L`. This is a simple residual injection, not cross-attention.

4. **Eval always runs max steps:** At eval time, `self.training=False` so halting logic is skipped. The model always completes `halt_max_steps=16` full ACT steps. A fork adding goal-anchored early stopping must handle this explicitly.

5. **Gradient only flows through last H_cycle:** The `H_cycles-1` warmup iterations in `_inner.forward()` use `torch.no_grad()`. Only the final H_cycle produces gradients. This significantly reduces VRAM.

6. **stablemax vs softmax:** The loss uses a custom `stablemax_cross_entropy` (with `s(x) = 1/(1-x)` for x<0, else x+1`) instead of standard softmax. This is not a drop-in replacement — it behaves differently at extremes.

7. **puzzle_emb uses SignSGD, not Adam:** The per-task identity embedding has its own optimizer class. It is updated via sign gradient with weight decay, not adaptive moments.

8. **mlp_t variant:** There's an `mlp_t=True` config that replaces self-attention with an MLP operating on the **sequence (L) dimension** instead of the hidden (D) dimension. This is the smallest/fastest variant. The standard config uses full attention.

9. **No H_level module exists:** The config has `H_layers` (ignored) and `L_layers`. Despite the z_H/z_L naming suggesting a hierarchy, there is only one `L_level` module.

10. **AdamATan2 optimizer:** Non-standard; comes from `adam_atan2` package. May not be available on all platforms.

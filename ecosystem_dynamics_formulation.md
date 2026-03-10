# Mathematical Formulation of Cosmic Ecosystem Dynamics

## Abstract

This document derives a system of differential equations that approximates the spatially-explicit, agent-based cosmic ecosystem simulation, providing a mean-field theoretical framework analogous to Lotka-Volterra dynamics.

---

## 1. System Variables

Let:
- **F(t)** = food bloom density (resource)
- **H(t)** = herbivore population (jellyfish, manta, seahorse)
- **C(t)** = carnivore population (shark, anglerfish)
- **A(t)** = apex predator population (leviathan)

Spatial density functions (for advanced treatment):
- **f(x,y,t)** = local food density
- **h(x,y,t)** = local herbivore density
- **c(x,y,t)** = local carnivore density
- **a(x,y,t)** = local apex density

---

## 2. Core Dynamical System (Mean-Field Approximation)

### 2.1 Standard Form

```
dF/dt = r_F(1 - F/K_F) - α_HF·H·F·ε(H,F)

dH/dt = β_HF·H·F·ε(H,F) - μ_H·H - α_CH·C·H·ε(C,H) - α_AH·A·H·ε(A,H)

dC/dt = β_CH·C·H·ε(C,H) - μ_C·C - α_AC·A·C·ε(A,C)

dA/dt = β_AH·A·H·ε(A,H) + β_AC·A·C·ε(A,C) - μ_A·A
```

Where:
- **r_F** = food bloom growth rate (day/night cycle dependent)
- **K_F** = carrying capacity for food
- **α_ij** = attack rate of species i on species j
- **β_ij** = conversion efficiency (energy gained per unit consumed)
- **μ_i** = mortality rate of species i
- **ε(i,j)** = spatial encounter probability function

---

## 3. Key Extensions Beyond Classical Lotka-Volterra

### 3.1 Spatial Encounter Probability

The function **ε(P, Q)** accounts for finite sensing range and movement:

```
ε(P, Q) = 1 - exp(-σ·(P·Q)/(A_total))
```

Where:
- **σ** = effective sensing cross-section (avg. sense radius² / domain area)
- **A_total** = total simulation area
- This captures: sparse populations rarely encounter each other

### 3.2 Energy-Gated Reproduction

From code analysis (THRESHOLDS in eco-behaviour.js):
- Reproduction only occurs when energy > 150
- This creates a **reproductive delay** function:

```
β_eff(E) = β_max · Θ(E - E_thresh) · (E - E_thresh)/E_scale
```

Where:
- **Θ** = Heaviside step function
- **E_thresh** ≈ 150 (from THRESHOLDS.seekMate)
- **E_scale** ≈ 50 (energy scale for reproduction efficiency)

Population-level energy **E_i(t)** evolves as:

```
dE_i/dt = (energy_gain_rate - energy_loss_rate)·N_i
```

Modified reproduction term becomes:

```
dH/dt = β_HF·H·F·ε(H,F)·Θ(E_H - 150)·(E_H - 150)/50 - ...
```

### 3.3 Age-Structured Mortality

From code (maxAge varies by species):

```
μ_i(age) = μ_base,i + μ_age,i·(age/age_max,i)^2
```

Population-averaged mortality:

```
μ_eff,i = ∫_0^∞ μ_i(a)·p_i(a) da
```

Where **p_i(a)** = age distribution of species i

---

## 4. Parameter Extraction from Code

### 4.1 Attack Rates (α)

From `doKillCheck` in eco-behaviour.js:

```javascript
const dx=p.x-c.x, dy=p.y-c.y;
if (Math.sqrt(dx*dx+dy*dy) < c.size+p.size) {
    c.energy += p.size * 6 * (1 + c.size*0.02);
    p._dead = true;
}
```

**Kill radius** = predator.size + prey.size  
**Energy gain** = prey.size × 6 × (1 + pred.size × 0.02)

Attack rate scaling:
```
α_ij ≈ π·(r_i + r_j)²·v_i / A_total
```

Where:
- **r_i** = sensing radius (SPECIES_DEFS[species].sense)
- **v_i** = movement speed (SPECIES_DEFS[species].speed)

### 4.2 Conversion Efficiency (β)

From kill energy gain:
```
β_ij = (prey_size × 6 × (1 + pred_size × 0.02)) / prey_energy_cost
```

Typical values from code:
- Jellyfish size ≈ 8-12
- Shark size ≈ 16-24
- Energy per kill ≈ 48-144

### 4.3 Mortality Rates (μ)

**Base metabolism** (from `updateCreature` energy drain):
```javascript
c.energy -= (0.05 + c.size*0.005 + c.speed*0.015) * godMode.aggrMult;
```

```
μ_metabolic ≈ (0.05 + size×0.005 + speed×0.015) / avg_energy
```

**Age mortality** (from `maxAge` in SPECIES_DEFS):
```
μ_age = 1 / (maxAge_frames × fps)
```

Example:
- Jellyfish maxAge ≈ 6000 frames
- At 60fps → ~100 seconds → μ ≈ 0.01/sec

---

## 5. Spatial PDE Formulation

For high-fidelity modeling including movement patterns:

### 5.1 Reaction-Diffusion-Advection System

```
∂h/∂t = D_h·∇²h + ∇·(χ_h·h·∇f) + R_h(h,c,a,f)

∂c/∂t = D_c·∇²c + ∇·(χ_c·c·∇h) + R_c(h,c,a)

∂a/∂t = D_a·∇²a + ∇·(χ_a·a·∇(h+c)) + R_a(h,c,a)

∂f/∂t = D_f·∇²f + S_f(x,y,t) - α_hf·h·f
```

Where:
- **D_i** = diffusion coefficient (random walk component)
- **χ_i** = chemotaxis coefficient (directed movement toward food/prey)
- **R_i** = local reaction terms (predation, reproduction, death)
- **S_f** = food source term (bloom spawning)

### 5.2 Diffusion Coefficients from Movement

From movement code (steerToward, wander):

```
D_i ≈ (speed_i)² · Δt / 4
```

Typical:
- Jellyfish: speed ≈ 0.7, D ≈ 0.12
- Shark: speed ≈ 1.4, D ≈ 0.49

### 5.3 Chemotaxis from Behavior

From `decide` function in eco-behaviour.js:

```javascript
if (wantFood && c.diet === 'herb' && foodD < Infinity) {
    steerToward(c, foodDx, foodDy, turnCap);
}
```

Chemotaxis strength:
```
χ_h ≈ speed_h · sense_h / (sense_h + ⟨||∇f||⟩)
```

---

## 6. Stochastic Differential Equation (SDE) Version

To account for demographic stochasticity:

```
dH = [β_HF·H·F·ε - μ_H·H - α_CH·C·H·ε - α_AH·A·H·ε]dt + σ_H√H·dW_H

dC = [β_CH·C·H·ε - μ_C·C - α_AC·A·C·ε]dt + σ_C√C·dW_C

dA = [β_AH·A·H·ε + β_AC·A·C·ε - μ_A·A]dt + σ_A√A·dW_A
```

Where:
- **W_i** = Wiener process (Brownian motion)
- **σ_i** = demographic noise intensity
- **√N** scaling = typical for birth-death processes

Noise intensities from simulation variance:
```
σ_i² ≈ (birth_rate + death_rate) / N_i
```

---

## 7. Circadian Forcing (Day/Night Cycle)

From `updateDayNight` in eco-canvas.js:

```javascript
dayPhase += CYCLE_SPEED;
dayT = 0.5 + 0.5 * Math.sin(dayPhase);
```

Food growth becomes time-dependent:

```
r_F(t) = r_day · [0.5 + 0.5·sin(ω·t)]
```

Where:
- **ω** = 2π / T_cycle
- **T_cycle** ≈ 1800 frames (30 seconds at 60fps from code)

This creates periodic forcing:

```
dF/dt = r_day·[0.5 + 0.5·sin(ωt)]·(1 - F/K_F) - α_HF·H·F·ε
```

Expected behavior: Hopf bifurcations, resonance when predator-prey oscillation period ≈ day/night period

---

## 8. Linearized Stability Analysis

Equilibrium points **(F*, H*, C*, A*)** satisfy:

```
r_F(1 - F*/K_F) = α_HF·H*·F*·ε(H*,F*)

β_HF·H*·F*·ε(H*,F*) = μ_H·H* + α_CH·C*·H*·ε(C*,H*) + α_AH·A*·H*·ε(A*,H*)

β_CH·C*·H*·ε(C*,H*) = μ_C·C* + α_AC·A*·C*·ε(A*,C*)

β_AH·A*·H*·ε(A*,H*) + β_AC·A*·C*·ε(A*,C*) = μ_A·A*
```

Jacobian matrix **J** at equilibrium:

```
J = [∂f_F/∂F   ∂f_F/∂H   ∂f_F/∂C   ∂f_F/∂A  ]
    [∂f_H/∂F   ∂f_H/∂H   ∂f_H/∂C   ∂f_H/∂A  ]
    [∂f_C/∂F   ∂f_C/∂H   ∂f_C/∂C   ∂f_C/∂A  ]
    [∂f_A/∂F   ∂f_A/∂H   ∂f_A/∂C   ∂f_A/∂A  ]
```

Stability: Re(λ_i) < 0 for all eigenvalues of J

Oscillatory: Im(λ_i) ≠ 0 → limit cycles

---

## 9. Numerical Parameter Estimates

From SPECIES_DEFS and behavior code:

| Parameter | Herbivore (H) | Carnivore (C) | Apex (A) |
|-----------|---------------|---------------|----------|
| **Size** | 8-12 | 14-20 | 22-30 |
| **Speed** | 0.6-0.9 | 1.1-1.6 | 0.8-1.3 |
| **Sense** | 100-180 | 180-260 | 220-320 |
| **Max Age** | 6000-9000 | 8000-12000 | 10000-15000 |
| **Reproduction Energy** | 150 | 150 | 150 |
| **α (attack rate)** | — | 0.008 | 0.012 |
| **β (conversion)** | 0.85 | 0.65 | 0.55 |
| **μ (mortality)** | 0.008 | 0.006 | 0.005 |

Food bloom parameters:
- **r_F** ≈ 0.15/sec (day), 0.02/sec (night)
- **K_F** ≈ 200 blooms (estimated from spawn rate)
- **α_HF** ≈ 0.012

---

## 10. Simplified 2-Species Example

For intuition, consider just herbivores and carnivores:

```
dH/dt = β·H·F(t)·[1 - exp(-σHF·H·F/A)] - μ_H·H - α·C·H·[1 - exp(-σCH·C·H/A)]

dC/dt = γ·α·C·H·[1 - exp(-σCH·C·H/A)] - μ_C·C
```

With periodic food forcing F(t) = F₀[0.5 + 0.5sin(ωt)]:

This becomes a **forced Lotka-Volterra oscillator with spatial saturation**

Classical LV behavior emerges when:
- ε ≈ 1 (dense populations, high encounter rate)
- F(t) = constant (no circadian cycle)

Your system adds:
- **Spatial dilution** (ε < 1 at low density)
- **Periodic forcing** (day/night)
- **Energy gating** (reproduction threshold)
- **Demographic noise** (finite population)

---

## 11. Comparison to Classical Lotka-Volterra

| Feature | Classical LV | Your Ecosystem |
|---------|-------------|----------------|
| **Encounter** | Mass action (N₁·N₂) | Spatially limited (ε function) |
| **Food** | Constant or logistic | Periodic (day/night) |
| **Reproduction** | Instant | Energy-gated (threshold) |
| **Mortality** | Constant rate | Age-dependent |
| **Space** | Well-mixed | Explicit 2D with sensing |
| **Stochasticity** | Deterministic | Demographic noise |
| **Trophic levels** | 2 | 4 (food→herb→carn→apex) |

---

## 12. Validation & Fitting

To extract parameters from simulation data:

### 12.1 Time Series Analysis
```python
# Record population counts over time
t, H, C, A = extract_timeseries(simulation_data)

# Fit ODE parameters using optimization
from scipy.optimize import minimize

def ode_system(t, y, params):
    F, H, C, A = y
    # ... (equations above)
    return [dF_dt, dH_dt, dC_dt, dA_dt]

def objective(params):
    solution = solve_ivp(ode_system, ...)
    return np.sum((solution - observed_data)**2)

optimal_params = minimize(objective, initial_guess)
```

### 12.2 Spectral Analysis

Check for oscillations:
```python
from scipy.fft import fft

# Power spectrum of herbivore population
freqs = np.fft.fftfreq(len(H), dt)
power = np.abs(fft(H))**2

# Peak frequency = dominant oscillation period
peak_freq = freqs[np.argmax(power[1:])]
period = 1 / peak_freq
```

Expected: Peak near circadian period (30 sec) + slower predator-prey cycle (~5-10 min)

---

## 13. Emergent Phenomena Predicted by Model

### 13.1 Trophic Cascades
Apex removal → carnivore bloom → herbivore crash → food bloom

```
∂A/∂t = 0  (remove apex)
⟹  dC/dt > 0  (carnivores increase)
⟹  dH/dt < 0  (herbivores decrease)
⟹  dF/dt > 0  (food increases)
```

### 13.2 Resonance with Circadian Forcing

When intrinsic predator-prey period ≈ day/night period:
```
T_intrinsic = 2π/√(α·β·γ - μ_C·μ_H)
```

If T_intrinsic ≈ 30 sec → **resonance amplification** of oscillations

### 13.3 Spatial Pattern Formation (PDE version)

Turing instability conditions:
```
D_h/D_c ≠ 1
∂R_h/∂h + ∂R_c/∂c < 0  (stable in ODE)
D_h·∂R_c/∂c + D_c·∂R_h/∂h > 2√(D_h·D_c·∂R_h/∂h·∂R_c/∂c)
```

Predicts: **Patchy distributions** even without explicit habitat heterogeneity

---

## 14. Summary

Your cosmic ecosystem can be represented as:

**Simplified Version:**
```
dH/dt = reproduction(H,F,E_H) - predation(C,H) - predation(A,H) - death(H)
dC/dt = feeding(C,H,E_C) - predation(A,C) - death(C)  
dA/dt = feeding(A,H,C,E_A) - death(A)
dF/dt = growth(F,t) - grazing(H,F)
```

**With Key Extensions:**
- Spatial encounter saturation: **ε(N₁,N₂)**
- Energy-gated reproduction: **Θ(E - 150)**
- Circadian forcing: **r(t) = r₀[0.5 + 0.5sin(ωt)]**
- Demographic noise: **√N·dW**

This bridges agent-based simulation ↔ continuum theory, enabling:
- Analytical predictions
- Parameter sensitivity analysis
- Long-term behavior forecasting
- Comparison with real ecosystems

The randomness and movement don't prevent mathematical formulation — they just shift us from deterministic ODEs to stochastic PDEs, which are still well-studied in mathematical ecology!

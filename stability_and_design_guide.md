# Ecosystem Stability Analysis & Design Guide

## Table of Contents
1. [Understanding Stability](#understanding-stability)
2. [Factors That Impact Stability](#factors-that-impact-stability)
3. [Spectral Analysis Explained](#spectral-analysis-explained)
4. [Building a Stable Ecosystem](#building-a-stable-ecosystem)
5. [Practical Design Guidelines](#practical-design-guidelines)

---

## 1. Understanding Stability

### What Does "Stable" Mean?

An ecosystem is **stable** if small disturbances don't cause it to collapse. Mathematically:

- **Stable equilibrium**: After a perturbation, populations return to balance
- **Unstable equilibrium**: Small changes cause runaway growth or extinction
- **Limit cycle**: Populations oscillate in a repeating pattern (can be stable!)

### Three Types of Stability

1. **Local Stability** (Lyapunov Stability)
   - Near equilibrium, do populations return?
   - Determined by **eigenvalues** of the Jacobian matrix
   
2. **Structural Stability**
   - Does the system survive parameter changes?
   - Example: Can it handle removing one species?
   
3. **Resilience**
   - How quickly does it recover from disturbances?
   - Measured by the **magnitude** of eigenvalues

---

## 2. Factors That Impact Stability

### A. Mathematical Factors (From Eigenvalue Analysis)

The Jacobian matrix at equilibrium tells us everything:

```
J = [∂f_F/∂F   ∂f_F/∂H   ∂f_F/∂C   ∂f_F/∂A ]
    [∂f_H/∂F   ∂f_H/∂H   ∂f_H/∂C   ∂f_H/∂A ]
    [∂f_C/∂F   ∂f_C/∂H   ∂f_C/∂C   ∂f_C/∂A ]
    [∂f_A/∂F   ∂f_A/∂H   ∂f_A/∂C   ∂f_A/∂A ]
```

**Stability criterion**: All eigenvalues λᵢ must have **Re(λᵢ) < 0**

#### What Each Eigenvalue Tells You:

| Eigenvalue | Meaning | Ecosystem Behavior |
|------------|---------|-------------------|
| **Re(λ) < 0** | Stable mode | Perturbations decay |
| **Re(λ) > 0** | Unstable mode | Perturbations grow → collapse |
| **Im(λ) ≠ 0** | Oscillatory | Populations cycle |
| **\|λ\|** large | Fast dynamics | Quick recovery (high resilience) |
| **\|λ\|** small | Slow dynamics | Sluggish response |

---

### B. Ecological Factors (What You Can Control)

#### **Factor 1: Predation Strength (α parameters)**

```
α_CH = carnivore attack rate on herbivores
```

**Too high** → Predators overexploit prey → **boom-bust cycles** → instability  
**Too low** → Herbivores overpopulate → deplete food → collapse  
**Sweet spot** → Balanced regulation

**Rule of thumb from your data:**
```
α_CH ≈ 0.02 (your fitted value)
α_AH ≈ 0.04 (apex on herbivores)
α_AC ≈ 0.07 (apex on carnivores)
```

Notice: **Top predators should attack MORE STRONGLY** to control populations.

---

#### **Factor 2: Conversion Efficiency (β parameters)**

```
β_CH = fraction of prey energy converted to predator biomass
```

**Too high** → Predators grow too efficiently → overexploit  
**Too low** → Predators can't sustain → extinction  

**Your values:**
```
β_HF = 0.85 (herbivores from food - high, plants are nutritious)
β_CH = 0.60 (carnivores from herbivores - medium)
β_AH = 0.55 (apex from herbivores - lower)
β_AC = 0.93 (apex from carnivores - surprisingly high!)
```

**Insight**: Lower conversion efficiency at higher trophic levels = **energy pyramid** = stability!

---

#### **Factor 3: Mortality Rates (μ parameters)**

```
μ_H = herbivore death rate (metabolism + age + disease)
```

**Too high** → Species can't maintain population → extinction  
**Too low** → Overpopulation → resource depletion  

**Your fitted values:**
```
μ_H = 0.0083 (/sec) → lifespan ~120 seconds
μ_C = 0.0071 (/sec) → lifespan ~140 seconds  
μ_A = 0.0058 (/sec) → lifespan ~172 seconds
```

**Pattern**: Larger predators live longer (matches real ecology!)

**Stability insight**: Higher mortality = more stable (prevents overpopulation)

---

#### **Factor 4: Food Growth Rate (r_F)**

```
r_F = how fast food blooms regenerate
```

**Too high** → Herbivore population explodes → predator boom → collapse  
**Too low** → Base of food web collapses → everything dies  

**Your value:**
```
r_F = 0.15 (/sec) during daytime
r_F = 0.075 (/sec) average over day/night cycle
```

**Critical ratio**: r_F should be comparable to μ_H (so food regrows as fast as it's eaten)

---

#### **Factor 5: Spatial Encounter Rate (σ)**

```
ε(N₁, N₂) = 1 - exp(-σ·N₁·N₂/A)
```

**At low density**: ε ≈ σ·N₁·N₂/A (linear, like mass action)  
**At high density**: ε → 1 (everyone encounters everyone)

**Effect on stability:**
- **Low σ** (sparse encounters) → **more stable** (natural refuge at low density)
- **High σ** (dense encounters) → **less stable** (predators find every last prey)

**Your value:**
```
σ = 0.001
```

This creates a **weak Allee effect** at low density (harder for predators to find prey) = **stabilizing!**

---

#### **Factor 6: Circadian Forcing (ω)**

```
r_F(t) = r̄_F · [0.5 + 0.5·sin(ωt)]
ω = 2π/T_cycle
```

**Periodic forcing can:**
- **Stabilize** if it provides predictable resource pulses
- **Destabilize** if it resonates with intrinsic oscillations (see spectral analysis)

**Your value:**
```
T_cycle = 30 seconds
ω = 0.209 rad/sec
```

---

### C. How to Calculate Stability (Step-by-Step)

#### **Step 1: Find Equilibrium**

Solve for populations where all derivatives = 0:

```python
from scipy.optimize import fsolve

def equilibrium_eqs(y):
    F, H, C, A = y
    dF, dH, dC, dA = ecosystem_odes(0, y, params)
    return [dF, dH, dC, dA]

y_eq = fsolve(equilibrium_eqs, [100, 50, 20, 5])
print(f"Equilibrium: F={y_eq[0]:.1f}, H={y_eq[1]:.1f}, C={y_eq[2]:.1f}, A={y_eq[3]:.1f}")
```

**From your plot**: The system decays to low equilibrium because it's **over-predated**!

---

#### **Step 2: Compute Jacobian Matrix**

Numerically estimate partial derivatives:

```python
def compute_jacobian(y_eq, params, eps=1e-6):
    J = np.zeros((4, 4))
    f0 = np.array(ecosystem_odes(0, y_eq, params))
    
    for i in range(4):
        y_pert = y_eq.copy()
        y_pert[i] += eps
        f_pert = np.array(ecosystem_odes(0, y_pert, params))
        J[:, i] = (f_pert - f0) / eps
    
    return J

J = compute_jacobian(y_eq, fitted_params)
```

---

#### **Step 3: Find Eigenvalues**

```python
eigenvalues = np.linalg.eigvals(J)

for i, lam in enumerate(eigenvalues):
    real = np.real(lam)
    imag = np.imag(lam)
    
    print(f"λ_{i+1} = {real:.4f} + {imag:.4f}i")
    
    if real < 0:
        print(f"  → Mode {i+1} is STABLE (decays with time constant {-1/real:.1f}s)")
    else:
        print(f"  → Mode {i+1} is UNSTABLE (grows with time constant {1/real:.1f}s)")
    
    if abs(imag) > 1e-6:
        period = 2*np.pi / abs(imag)
        print(f"  → Oscillates with period {period:.1f}s")
```

---

#### **Step 4: Interpret Results**

Example output:
```
λ_1 = -0.0234 + 0.0187i  → Stable oscillation, period = 336s, damping time = 43s
λ_2 = -0.0234 - 0.187i   → (complex conjugate of λ_1)
λ_3 = -0.0089 + 0.0000i  → Stable decay, no oscillation, time constant = 112s
λ_4 = -0.0521 + 0.0000i  → Stable fast decay, time constant = 19s
```

**Verdict**: System is **STABLE** (all Re(λ) < 0) with **damped oscillations**.

---

## 3. Spectral Analysis Explained

### What Is Spectral Analysis?

**Goal**: Find hidden periodicities in population time series.

**Method**: Fourier Transform (FFT) decomposes a signal into constituent frequencies.

---

### How It Works (Intuitive)

Imagine your herbivore population over time:
```
H(t) = H_avg + A₁·sin(ω₁t) + A₂·sin(ω₂t) + A₃·sin(ω₃t) + ...
```

The **power spectrum** tells you the amplitude (A) of each frequency (ω).

**Peaks in the spectrum** = dominant oscillation periods.

---

### Your Spectral Analysis Results

From the plot (bottom left):

```
Peak period: 300.6 seconds (5 minutes)
Circadian period: 30 seconds
```

**What this means:**

1. **Primary oscillation**: 300 seconds (5 min)  
   - This is the **intrinsic predator-prey cycle**
   - Period = 2π/Im(λ) from eigenvalues
   - Predators chase herbivores → lag → oscillation

2. **Circadian forcing**: 30 seconds  
   - Day/night cycle from the code
   - Food growth oscillates at this frequency
   - **NO RESONANCE** (300s ≠ 30s) → good for stability!

3. **Why no 30s peak?**  
   - The day/night cycle is **too fast** compared to population dynamics
   - Populations can't respond quickly → **averaging effect**
   - Like trying to push a slow pendulum at high frequency (no resonance)

---

### Interpreting the Spectrum

```python
from scipy.fft import fft, fftfreq

# Fourier transform
n = len(H_data)
H_fft = fft(H_data - np.mean(H_data))  # Remove DC component
freqs = fftfreq(n, dt)[:n//2]          # Positive frequencies only
power = 2.0/n * np.abs(H_fft[:n//2])   # Power spectrum

# Find dominant period
peak_idx = np.argmax(power[1:]) + 1    # Skip DC (constant)
peak_freq = freqs[peak_idx]
peak_period = 1 / peak_freq

plt.semilogy(1/freqs[1:], power[1:])   # Plot period vs power
plt.axvline(peak_period, label=f'Dominant: {peak_period:.1f}s')
plt.axvline(30, label='Circadian: 30s')
```

---

### What Different Spectra Mean

#### **Spectrum 1: Sharp Peak**
```
Power
  ^
  |     *
  |    * *
  |___*___*____> Period
      300s
```
**Meaning**: Strong regular oscillation (limit cycle)  
**Stability**: Can be stable if damped  
**Cause**: Predator-prey time lag

---

#### **Spectrum 2: Multiple Peaks**
```
Power
  ^
  |  *       *
  | * *     * *
  |*___*___*___*> Period
    30s   90s  300s
```
**Meaning**: Resonance between forcing and intrinsic cycle  
**Stability**: **DANGEROUS** - can amplify to collapse  
**Fix**: Change forcing period or adjust parameters

---

#### **Spectrum 3: Broad Hump**
```
Power
  ^
  |  _____
  | /     \
  |/       \___> Period
```
**Meaning**: Irregular, chaotic dynamics  
**Stability**: Usually **unstable**  
**Cause**: Multiple unstable modes interfering

---

#### **Spectrum 4: Flat (White Noise)**
```
Power
  ^
  |_____________> Period
```
**Meaning**: Pure randomness, no structure  
**Stability**: Neutral (demographic stochasticity only)  
**Cause**: No strong interactions

---

### Resonance Detection

**Resonance** happens when:
```
T_intrinsic ≈ T_forcing
```

This **amplifies oscillations** → potentially unstable!

**Your case:**
```
T_intrinsic = 300s
T_forcing   = 30s
Ratio       = 10:1 → NO RESONANCE ✓
```

**Bad example** (what to avoid):
```
T_intrinsic = 28s
T_forcing   = 30s
Ratio       ≈ 1:1 → RESONANCE ✗ → AMPLIFICATION → COLLAPSE
```

---

### Using Spectral Analysis to Debug

**Problem**: Populations oscillate wildly and crash  
**Diagnosis**:
```python
# Run spectral analysis
peak_period = spectral_analysis(t, H_data)

if abs(peak_period - 30) < 5:
    print("RESONANCE DETECTED!")
    print("Fix: Change circadian period or adjust predation rates")
```

---

## 4. Building a Stable Ecosystem

### The May-Wigner Stability Theorem

**Key insight from ecology**: Complex ecosystems can be **less stable**!

**Why?**
- More species = more interactions = higher chance of destabilizing feedback
- **Random interaction strengths** → likely to have Re(λ) > 0

**But**: Real ecosystems ARE stable! How?

**Answer**: Structure matters!
- Food webs aren't random
- Weak interactions buffer strong ones
- Omnivory and redundancy help

---

### Design Principles for Stable Ecosystems

#### **Principle 1: Energy Pyramid**

```
Apex (A):      Low population, high mortality
    ↑
Carnivore (C): Medium population, medium mortality  
    ↑
Herbivore (H): High population, low mortality
    ↑
Food (F):      Very high, fast regeneration
```

**Mathematical constraint**:
```
β_CH · α_CH · H* ≈ μ_C  (carnivore energy in = energy out)

Rearranging: H* ≈ μ_C / (β_CH · α_CH)
```

**Design rule**: Each level should support ~10× less biomass than below.

---

#### **Principle 2: Top-Down Control**

**Apex predators stabilize by preventing carnivore explosions.**

**Test**: Remove apex predators from your simulation:
```python
params_no_apex = params.copy()
params_no_apex['alpha_AC'] = 0  # Apex can't eat carnivores
params_no_apex['alpha_AH'] = 0  # Apex can't eat herbivores

# Simulate
sol = solve_ivp(ecosystem_odes, t_span, y0, args=(params_no_apex,))
```

**Prediction**: Carnivores boom → herbivores crash → carnivores crash → **trophic cascade!**

---

#### **Principle 3: Weak Interaction Strength**

**From your fitted parameters:**
```
α_CH = 0.022  (carnivores on herbivores)
```

This is **small** relative to population sizes.

**Why?**
- **Strong predation** (α large) → tight coupling → **oscillations**
- **Weak predation** (α small) → loose coupling → **buffering**

**Stability rule**:
```
α_ij << μ_j  (predation rate << prey mortality)
```

If predation is the **main cause of death**, you get cycles.

---

#### **Principle 4: Omnivory (Multiple Food Sources)**

Your apex predator eats **both** herbivores AND carnivores:
```
dA/dt = β_AH·A·H·ε(A,H) + β_AC·A·C·ε(A,C) - μ_A·A
```

**Benefit**: If one food source crashes, apex can switch → **buffering!**

**Stability effect**: Reduces oscillation amplitude (shown in theory by McCann et al. 1998).

---

#### **Principle 5: Spatial Refuges**

Your encounter function:
```
ε(N₁, N₂) = 1 - exp(-σ·N₁·N₂/A)
```

**At low prey density**: ε → 0 (hard for predators to find prey)

This creates a **refuge at low density** → prevents extinction → stabilizing!

**Classical predator-prey** (no refuge):
```
dH/dt = ... - α·C·H  (always proportional to H)
```

**Problem**: Predators can drive H → 0.

**Your model** (with refuge):
```
dH/dt = ... - α·C·H·ε(C,H)
```

When H → 0, ε → 0 faster, so predation stops → **H survives!**

---

#### **Principle 6: Resource Pulses (Not Too Fast)**

Your circadian cycle:
```
r_F(t) = 0.15 · [0.5 + 0.5·sin(2πt/30)]
```

**Effect**: Provides predictable food bursts.

**Stability guideline**:
```
T_circadian << T_intrinsic  (fast forcing is stabilizing)
T_circadian ≈ T_intrinsic   (resonance is DESTABILIZING)  
T_circadian >> T_intrinsic  (slow forcing is neutral)
```

**Your case**: 30s << 300s → **good!**

---

## 5. Practical Design Guidelines

### Recipe for a Stable 4-Level Ecosystem

#### **Step 1: Set Equilibrium Targets**

Decide desired populations:
```
F* = 100  (food)
H* = 40   (herbivores)
C* = 15   (carnivores)
A* = 3    (apex)
```

**Rule**: Each level ~3-4× smaller than below (biomass pyramid).

---

#### **Step 2: Design Mortality Rates**

Bigger animals live longer:
```
μ_H = 0.010  (herbivores die ~100s lifespan)
μ_C = 0.007  (carnivores die ~140s lifespan)
μ_A = 0.005  (apex die ~200s lifespan)
```

**Check**: μ should increase as you go down the food chain (smaller animals = faster turnover).

---

#### **Step 3: Calculate Attack Rates from Equilibrium**

At equilibrium, energy in = energy out:

**For carnivores:**
```
β_CH · α_CH · C* · H* · ε(C*,H*) = μ_C · C*

Solving: α_CH = μ_C / (β_CH · H* · ε(C*,H*))
```

With ε ≈ 1 (dense populations), β_CH = 0.6, H* = 40:
```
α_CH = 0.007 / (0.6 × 40 × 1) ≈ 0.0003
```

**But wait**: Your fitted value is α_CH = 0.022 (much higher!).

**Why the difference?**  
Your populations are **not at equilibrium** - they're decaying!

This means **predation is too strong** for the food input rate.

---

#### **Step 4: Balance Food Input**

Total herbivore consumption:
```
H* · (0.05 + size×0.005 + speed×0.015) ≈ 40 × 0.11 ≈ 4.4 energy/sec
```

Food must regenerate this fast:
```
r_F · F* · (1 - F*/K_F) ≥ 4.4

With F* = 100, K_F = 200:
r_F · 100 · (1 - 100/200) ≥ 4.4
r_F ≥ 0.088
```

**Your value**: r_F = 0.15 ✓ (adequate!)

But food is also consumed:
```
α_HF · H* · F* · ε ≈ 0.00012 · 40 · 100 · 1 ≈ 0.48
```

So net food growth:
```
r_F·F*(1-F*/K) - α_HF·H*·F* = 7.5 - 0.48 = 7.02 ✓
```

Plenty of food! **So why are populations declining?**

---

#### **Step 5: Diagnose Instability**

Run eigenvalue analysis:
```python
eigenvalues = np.linalg.eigvals(J)
print(eigenvalues)
```

**If Re(λ_i) > 0**: System unstable → adjust parameters  
**If Im(λ_i) large**: System oscillatory → check resonance

**Your issue**: Probably **overpredation at top levels** (α_AH, α_AC too high).

---

### Parameter Adjustment Strategy

#### **Problem**: Populations crash to zero

**Diagnosis**:
```python
# Check if predation outpaces reproduction
energy_in = beta_HF * H * F * eps_HF
energy_out = mu_H * H + alpha_CH * C * H * eps_CH + alpha_AH * A * H * eps_AH

if energy_out > energy_in:
    print("Herbivores dying faster than reproducing!")
```

**Fixes**:

1. **Increase food** (↑ r_F or ↑ K_F)
2. **Decrease predation** (↓ α_CH, ↓ α_AH)
3. **Increase conversion** (↑ β_HF)
4. **Decrease mortality** (↓ μ_H)

---

#### **Problem**: Wild oscillations

**Diagnosis**: Check spectral analysis for resonance.

**Fixes**:

1. **Change circadian period** (avoid resonance)
2. **Weaken interactions** (↓ all α values by 50%)
3. **Add omnivory** (let carnivores also eat food)
4. **Increase spatial refuge** (↓ σ)

---

#### **Problem**: One species goes extinct

**Diagnosis**: That species' equilibrium is ≤ 0.

**Fixes**:

1. **Reduce their predation** (↓ α)
2. **Increase their food** (if herbivore: ↑ r_F)
3. **Increase their efficiency** (↑ β)
4. **Remove their predators temporarily** (bootstrap population)

---

### Example: Fixing Your Ecosystem

**Observation**: All populations decay to low levels.

**Hypothesis**: Apex predator is too efficient → carnivores can't sustain → herbivores can't sustain.

**Test**:
```python
params_fix = fitted_params.copy()
params_fix['alpha_AC'] = 0.02  # Reduce from 0.074
params_fix['alpha_AH'] = 0.01  # Reduce from 0.041
params_fix['mu_A'] = 0.012     # Increase apex mortality (starve if no food)

sol_fix = solve_ivp(ecosystem_odes, t_span, y0, args=(params_fix,))
```

**Prediction**: Higher equilibrium populations, stable coexistence.

---

## Summary: Quick Stability Checklist

### ✓ Your Ecosystem is Stable If:

- [ ] All eigenvalues have **Re(λ) < 0**
- [ ] Equilibrium populations are **all positive**
- [ ] **No resonance** between circadian and intrinsic periods
- [ ] Predation rates **weaker than mortality** (α_ij < μ_j)
- [ ] Energy pyramid: **F* >> H* >> C* >> A***
- [ ] Conversion efficiency **decreases** up food chain
- [ ] Spatial refuge exists (**σ small**, ε → 0 at low density)

### ✗ Warning Signs of Instability:

- [ ] Populations **oscillate** with increasing amplitude
- [ ] One species **goes extinct** repeatedly
- [ ] Equilibrium populations are **negative** (impossible!)
- [ ] Eigenvalues have **Re(λ) > 0**
- [ ] **Resonance peak** in spectral analysis (T_intrinsic ≈ 30s)
- [ ] Phase space shows **spiral outward** (unstable focus)

---

## Advanced: Parameter Sensitivity Analysis

### How Much Can Parameters Change Before Instability?

Use **bifurcation analysis**:

```python
# Scan over predation strength
alphas = np.linspace(0.001, 0.1, 50)
max_eig_real = []

for alpha in alphas:
    params_test = params.copy()
    params_test['alpha_CH'] = alpha
    
    y_eq, J, eigs = stability_analysis(params_test)
    max_eig_real.append(np.max(np.real(eigs)))

# Find critical value
critical_alpha = alphas[np.where(np.array(max_eig_real) > 0)[0][0]]
print(f"System goes unstable at α_CH > {critical_alpha:.4f}")

plt.plot(alphas, max_eig_real)
plt.axhline(0, color='red', linestyle='--')
plt.xlabel('Predation rate α_CH')
plt.ylabel('Max Re(λ)')
plt.title('Stability Boundary')
```

This tells you the **safety margin** for each parameter!

---

## Final Thoughts

**Key Insight**: Stability isn't about eliminating oscillations - it's about **damping** them.

Your ecosystem shows:
- ✓ Stable eigenvalues (all Re(λ) < 0)
- ✓ No dangerous resonance
- ✓ Reasonable parameter values
- ✗ **But** equilibrium too low (populations decay)

**Root cause**: Food web is **unbalanced** - top predators too efficient, not enough food regeneration to support the biomass.

**Solution**: Tune parameters so equilibrium matches your desired population levels using the equilibrium equations!

---

**Next Steps**:

1. Run the parameter extraction script on REAL simulation data (not synthetic)
2. Compare fitted parameters to theoretical estimates
3. Use bifurcation analysis to find stability boundaries  
4. Adjust parameters to achieve your target equilibrium
5. Monitor spectral analysis to ensure no resonance develops

Good luck with your cosmic ecosystem! 🌌🐟

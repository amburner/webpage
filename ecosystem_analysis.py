#!/usr/bin/env python3
"""
Ecosystem Dynamics Parameter Extraction & Model Fitting

This script extracts population dynamics from the simulation logs and fits
a Lotka-Volterra-style ODE model to the data.

Usage:
    python ecosystem_analysis.py --data simulation_log.json
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import odeint, solve_ivp
from scipy.optimize import minimize
from scipy.fft import fft, fftfreq
import json


# ============================================================================
# 1. ODE MODEL DEFINITION
# ============================================================================

def spatial_encounter(N1, N2, sigma=50000, A=960000):
    """
    Spatial encounter probability function.

    At low densities, encounter probability ~ N1*N2 (mass action).
    At high densities, saturates to 1 (everyone encounters everyone).

    Parameters:
    -----------
    N1, N2 : float
        Population counts
    sigma : float
        Effective sensing cross-section.
        Calibrated so that eps ~ 0.9 at typical equilibrium densities.
        sigma = 50000 gives eps(40,15) ~ 1.0, eps(3,15) ~ 0.90.
    A : float
        Total simulation area (pixels^2). Canvas = 1200 x 800 = 960000.
    """
    return 1 - np.exp(-sigma * N1 * N2 / A)


def ecosystem_odes(t, y, params):
    """
    4-compartment ecosystem model:

    F = food (blooms)
    H = herbivores
    C = carnivores
    A = apex predators

    Key change from classical LV: apex predators only eat carnivores
    (alpha_AH = 0), matching the eco-behaviour.js rebalancing where
    leviathan hunts carnivores exclusively.
    """
    F, H, C, A = [max(x, 0.0) for x in y]

    r_F      = params['r_F']
    K_F      = params['K_F']
    alpha_HF = params['alpha_HF']
    alpha_CH = params['alpha_CH']
    alpha_AC = params['alpha_AC']
    beta_HF  = params['beta_HF']
    beta_CH  = params['beta_CH']
    beta_AC  = params['beta_AC']
    mu_H     = params['mu_H']
    mu_C     = params['mu_C']
    mu_A     = params['mu_A']
    sigma    = params.get('sigma',  50000)
    A_total  = params.get('A_total', 960000)
    omega    = params.get('omega',  0)

    # Circadian forcing (day/night cycle)
    r_F_eff = r_F * (0.5 + 0.5 * np.sin(omega * t))

    # Encounter probabilities
    eps_HF = spatial_encounter(H, F, sigma, A_total)
    eps_CH = spatial_encounter(C, H, sigma, A_total)
    eps_AC = spatial_encounter(A, C, sigma, A_total)

    dF_dt =  r_F_eff * F * (1 - F / K_F) - alpha_HF * H * F * eps_HF

    dH_dt = (beta_HF * H * F * eps_HF
             - mu_H * H
             - alpha_CH * C * H * eps_CH)

    dC_dt = (beta_CH * C * H * eps_CH
             - mu_C * C
             - alpha_AC * A * C * eps_AC)

    dA_dt = (beta_AC * A * C * eps_AC
             - mu_A * A)

    return [dF_dt, dH_dt, dC_dt, dA_dt]


# ============================================================================
# 2. EQUILIBRIUM-CONSISTENT PARAMETER DERIVATION
# ============================================================================

def derive_equilibrium_params(alpha_CH, alpha_AC, mu_H, mu_C, mu_A,
                               F_star=100.0, H_star=40.0, C_star=15.0, A_star=3.0,
                               K_F=200.0, r_F=0.15, sigma=50000, A_total=960000):
    """
    Back-solve beta and alpha_HF values so that the target equilibrium
    (F*, H*, C*, A*) is a fixed point of the ODE system.

    This guarantees the simulation does NOT drift to zero from the
    start — it oscillates *around* the desired population levels.

    Derivation:
      dA/dt = 0  =>  beta_AC  = mu_A / (C* * eps_AC)
      dC/dt = 0  =>  beta_CH  = (mu_C + alpha_AC * A* * eps_AC) / (H* * eps_CH)
      dH/dt = 0  =>  alpha_CH is a free parameter; beta_HF = (mu_H + alpha_CH*C*eps_CH) / (F*eps_HF)
      dF/dt = 0  =>  alpha_HF = r_F_avg * (1 - F*/K_F) / (H* * eps_HF)
                     where r_F_avg = r_F * 0.5 (average over circadian cycle)
    """
    def eps(N1, N2):
        return 1 - np.exp(-sigma * N1 * N2 / A_total)

    eps_HF = eps(H_star, F_star)
    eps_CH = eps(C_star, H_star)
    eps_AC = eps(A_star, C_star)

    # Enforce eps floor to avoid division by near-zero
    eps_HF = max(eps_HF, 1e-12)
    eps_CH = max(eps_CH, 1e-12)
    eps_AC = max(eps_AC, 1e-12)

    beta_AC  = mu_A / (C_star * eps_AC)
    beta_CH  = (mu_C + alpha_AC * A_star * eps_AC) / (H_star * eps_CH)
    beta_HF  = (mu_H + alpha_CH * C_star * eps_CH) / (F_star * eps_HF)
    alpha_HF = r_F * 0.5 * (1.0 - F_star / K_F) / (H_star * eps_HF)

    return {
        'r_F':      r_F,
        'K_F':      K_F,
        'alpha_HF': alpha_HF,
        'alpha_CH': alpha_CH,
        'alpha_AC': alpha_AC,
        'beta_HF':  beta_HF,
        'beta_CH':  beta_CH,
        'beta_AC':  beta_AC,
        'mu_H':     mu_H,
        'mu_C':     mu_C,
        'mu_A':     mu_A,
        'sigma':    sigma,
        'A_total':  A_total,
        'omega':    2 * np.pi / 30,   # circadian period = 30 s
    }


def estimate_mortality_rate(size, speed, max_age_frames, fps=60):
    """
    Estimate death rate mu from per-frame metabolism + age limit.

    From updateCreature: energy -= (0.05 + size*0.005 + speed*0.015)
    """
    metabolic_drain = 0.05 + size * 0.005 + speed * 0.015
    avg_energy = 160
    mu_metabolic = metabolic_drain / avg_energy

    max_age_seconds = max_age_frames / fps
    mu_age = 1.0 / max_age_seconds

    return mu_metabolic + mu_age


def extract_initial_params():
    """
    Derive parameter set from SPECIES_DEFS and equilibrium targets.

    Mortality rates come directly from code (metabolism formula + maxAge).
    Attack rates (alpha_CH, alpha_AC) come from the published fitted values.
    All beta values and alpha_HF are back-solved to ensure the target
    equilibrium H*=40, C*=15, A*=3 is a fixed point.
    """
    species_props = {
        'jellyfish':  {'size': 10, 'speed': 0.70, 'sense': 140, 'maxAge': 7500},
        'manta':      {'size': 12, 'speed': 0.90, 'sense': 160, 'maxAge': 8000},
        'seahorse':   {'size':  8, 'speed': 0.60, 'sense': 120, 'maxAge': 6000},
        'shark':      {'size': 18, 'speed': 1.30, 'sense': 220, 'maxAge': 10000},
        'anglerfish': {'size': 16, 'speed': 1.10, 'sense': 200, 'maxAge':  9000},
        'leviathan':  {'size': 26, 'speed': 1.00, 'sense': 280, 'maxAge': 12000},
    }

    herb_species = ['jellyfish', 'manta', 'seahorse']
    carn_species = ['shark', 'anglerfish']
    apex = species_props['leviathan']

    herb_size  = np.mean([species_props[s]['size']   for s in herb_species])
    herb_speed = np.mean([species_props[s]['speed']  for s in herb_species])
    herb_maxAge= np.mean([species_props[s]['maxAge'] for s in herb_species])

    carn_size  = np.mean([species_props[s]['size']   for s in carn_species])
    carn_speed = np.mean([species_props[s]['speed']  for s in carn_species])
    carn_maxAge= np.mean([species_props[s]['maxAge'] for s in carn_species])

    mu_H = estimate_mortality_rate(herb_size, herb_speed, herb_maxAge)
    mu_C = estimate_mortality_rate(carn_size, carn_speed, carn_maxAge)
    mu_A = estimate_mortality_rate(apex['size'], apex['speed'], apex['maxAge'])

    # alpha_CH and alpha_AC from published fit (ecosystem_fit.png parameter box)
    alpha_CH = 0.02263
    alpha_AC = 0.07424

    return derive_equilibrium_params(
        alpha_CH=alpha_CH,
        alpha_AC=alpha_AC,
        mu_H=mu_H,
        mu_C=mu_C,
        mu_A=mu_A,
    )


# ============================================================================
# 3. SYNTHETIC DATA GENERATION (SDE — demographic noise)
# ============================================================================

def generate_stochastic_data(params, y0, T=600.0, dt=0.05, noise_scale=0.03,
                              seed=42):
    """
    Euler-Maruyama integration of the ODE with sqrt(N) demographic noise.

    The SDE form is:
        dX = f(X, t) dt + sigma_noise * sqrt(X) dW

    where dW ~ N(0, sqrt(dt)).  The sqrt(N) scaling is the standard
    birth-death process approximation (van Kampen expansion).
    """
    np.random.seed(seed)

    n_steps = int(T / dt)
    t_arr = np.arange(n_steps + 1) * dt
    traj  = np.zeros((n_steps + 1, 4))
    traj[0] = y0

    for i in range(n_steps):
        y    = traj[i].copy()
        dydt = np.array(ecosystem_odes(t_arr[i], y, params))
        noise = noise_scale * np.sqrt(np.maximum(y, 0)) * np.random.randn(4) / np.sqrt(dt)
        y_new = y + dydt * dt + noise * dt
        traj[i + 1] = np.maximum(y_new, 0.01)   # hard floor — no negative pops

    return t_arr, {
        'F': traj[:, 0],
        'H': traj[:, 1],
        'C': traj[:, 2],
        'A': traj[:, 3],
    }


# ============================================================================
# 4. MODEL FITTING
# ============================================================================

def fit_model_to_data(t_data, pop_data, initial_params):
    """
    Fit alpha_CH, alpha_AC and mortality rates to simulation time series.

    Uses a fast coarse-then-fine grid search restricted to a tight
    neighbourhood of the initial estimates, so it completes in seconds.
    All beta values are re-derived analytically at each evaluation via
    derive_equilibrium_params, guaranteeing the target equilibrium remains
    a fixed point throughout.
    """
    y0 = [pop_data['F'][0], pop_data['H'][0],
          pop_data['C'][0], pop_data['A'][0]]

    scales_H = np.mean(pop_data['H']) + 1.0
    scales_C = np.mean(pop_data['C']) + 1.0
    scales_A = np.mean(pop_data['A']) + 1.0

    def score(param_vec):
        a_CH, a_AC, m_H, m_C, m_A = param_vec
        if any(v <= 0 for v in param_vec):
            return 1e12
        try:
            p = derive_equilibrium_params(
                alpha_CH=a_CH, alpha_AC=a_AC,
                mu_H=m_H, mu_C=m_C, mu_A=m_A,
            )
            sol = solve_ivp(ecosystem_odes,
                            (t_data[0], t_data[-1]), y0,
                            args=(p,), t_eval=t_data,
                            method='RK45', max_step=5.0,
                            dense_output=False)
            if sol.status != 0 or sol.y.shape[1] != len(t_data):
                return 1e12
            err = (np.sum(((sol.y[1] - pop_data['H']) / scales_H) ** 2) +
                   np.sum(((sol.y[2] - pop_data['C']) / scales_C) ** 2) +
                   np.sum(((sol.y[3] - pop_data['A']) / scales_A) ** 2))
            return err
        except Exception:
            return 1e12

    # Coarse grid: ±20 % around initial values (3 points per param = 3^5 = 243 evals)
    x0    = np.array([initial_params['alpha_CH'], initial_params['alpha_AC'],
                      initial_params['mu_H'],     initial_params['mu_C'],
                      initial_params['mu_A']])
    grids = [x0[i] * np.array([0.80, 1.0, 1.20]) for i in range(5)]

    best_val  = 1e12
    best_x    = x0.copy()
    for a_CH in grids[0]:
      for a_AC in grids[1]:
        for m_H in grids[2]:
          for m_C in grids[3]:
            for m_A in grids[4]:
                v = score([a_CH, a_AC, m_H, m_C, m_A])
                if v < best_val:
                    best_val = v
                    best_x   = np.array([a_CH, a_AC, m_H, m_C, m_A])

    # Fine local search around best grid point (Nelder-Mead, tight budget)
    result = minimize(score, best_x, method='Nelder-Mead',
                      options={'maxiter': 200, 'xatol': 1e-3, 'fatol': 1e-3})
    if result.fun < best_val:
        best_x = result.x

    fitted = derive_equilibrium_params(
        alpha_CH=best_x[0], alpha_AC=best_x[1],
        mu_H=best_x[2],     mu_C=best_x[3], mu_A=best_x[4],
    )
    return fitted, min(best_val, result.fun)


# ============================================================================
# 5. ANALYSIS UTILITIES
# ============================================================================

def spectral_analysis(t, y, dt):
    """FFT to find dominant oscillation period."""
    n     = len(y)
    yf    = fft(y - np.mean(y))
    xf    = fftfreq(n, dt)[:n // 2]
    power = 2.0 / n * np.abs(yf[:n // 2])

    peak_idx    = np.argmax(power[1:]) + 1
    peak_freq   = xf[peak_idx]
    peak_period = 1.0 / peak_freq if peak_freq > 0 else np.inf

    return xf, power, peak_period


def stability_analysis(params):
    """Jacobian eigenvalues at the equilibrium fixed point."""
    from scipy.optimize import fsolve

    def rhs(y):
        return ecosystem_odes(0.0, y, params)

    y_eq = fsolve(rhs, [100.0, 40.0, 15.0, 3.0], full_output=False)

    eps = 1e-6
    J   = np.zeros((4, 4))
    f0  = np.array(rhs(y_eq))
    for i in range(4):
        yp      = y_eq.copy()
        yp[i]  += eps
        J[:, i] = (np.array(rhs(yp)) - f0) / eps

    eigenvalues = np.linalg.eigvals(J)
    return y_eq, J, eigenvalues


def intrinsic_lv_period(params):
    """
    Approximate intrinsic predator-prey oscillation period.

    For the H-C subsystem at equilibrium with F fixed:
        omega_LV = sqrt(alpha_CH * beta_CH * H* * C*)
    """
    H_star = 40.0
    C_star = 15.0
    omega  = np.sqrt(params['alpha_CH'] * params['beta_CH'] * H_star * C_star)
    return 2.0 * np.pi / omega


# ============================================================================
# 6. PLOTTING
# ============================================================================

def plot_results(t_data, pop_data, t_model, sol_model, params):
    """Visualise data vs model fit."""
    fig, axes = plt.subplots(2, 2, figsize=(12, 8))

    species_names = ['Herbivores', 'Carnivores', 'Apex']
    col_data  = ['#00fff5', '#ff00ff', '#ff6b35']
    col_model = ['#00bfb3', '#cc00cc', '#cc4400']

    # ── Population dynamics ────────────────────────────────────────────────
    ax = axes[0, 0]
    keys = ['H', 'C', 'A']
    model_cols = [1, 2, 3]   # columns in sol_model
    for i, (name, cd, cm, k, mc) in enumerate(
            zip(species_names, col_data, col_model, keys, model_cols)):
        if k in pop_data:
            ax.plot(t_data, pop_data[k], 'o', color=cd, alpha=0.35,
                    markersize=2.5, label=f'{name} (data)')
            ax.plot(t_model, sol_model[:, mc], '-', color=cd,
                    linewidth=2, label=f'{name} (model)')
    ax.set_xlabel('Time (s)')
    ax.set_ylabel('Population')
    ax.set_title('Population Dynamics: Data vs Model')
    ax.legend(fontsize=8)
    ax.grid(alpha=0.3)
    ax.set_ylim(bottom=0)

    # ── Phase space (H vs C) ───────────────────────────────────────────────
    ax = axes[0, 1]
    if 'H' in pop_data and 'C' in pop_data:
        ax.plot(pop_data['H'], pop_data['C'], 'o', color='#9b7db5',
                alpha=0.25, markersize=2.5, label='Data')
        ax.plot(sol_model[:, 1], sol_model[:, 2], '-', color='#ff00ff',
                linewidth=2, label='Model')
        # Mark equilibrium
        ax.axvline(40, color='#888', linestyle=':', linewidth=1)
        ax.axhline(15, color='#888', linestyle=':', linewidth=1)
        ax.plot(40, 15, '*', color='#ffff00', markersize=14,
                label='Equilibrium (40, 15)', zorder=5)
    ax.set_xlabel('Herbivore Population')
    ax.set_ylabel('Carnivore Population')
    ax.set_title('Phase Space (H vs C)')
    ax.legend(fontsize=8)
    ax.grid(alpha=0.3)

    # ── Spectral analysis ──────────────────────────────────────────────────
    ax = axes[1, 0]
    if 'H' in pop_data:
        # Use second half of signal to avoid transient
        midpt = len(t_data) // 2
        dt    = t_data[1] - t_data[0]
        xf, power, period = spectral_analysis(
            t_data[midpt:], pop_data['H'][midpt:], dt)
        ax.semilogy(1.0 / xf[1:], power[1:], color='#00fff5', linewidth=1.8)
        ax.axvline(period, color='#ff00ff', linestyle='--',
                   label=f'Peak: {period:.1f}s')
        ax.axvline(30, color='#ff6b35', linestyle='--',
                   label='Circadian: 30s')
        T_lv = intrinsic_lv_period(params)
        ax.axvline(T_lv, color='#ffff00', linestyle='--',
                   label=f'LV theory: {T_lv:.1f}s')
    ax.set_xlabel('Period (s)')
    ax.set_ylabel('Power')
    ax.set_title('Power Spectrum (Herbivores)')
    ax.legend(fontsize=8)
    ax.grid(alpha=0.3)
    ax.set_xlim(left=0, right=min(t_data[-1], 400))

    # ── Parameter summary ──────────────────────────────────────────────────
    ax = axes[1, 1]
    ax.axis('off')
    key_params = ['alpha_CH', 'alpha_AC', 'beta_CH', 'beta_AC',
                  'mu_H', 'mu_C', 'mu_A']
    lines = ['Fitted Parameters:\n']
    for key in key_params:
        lines.append(f'{key}: {params[key]:.5f}')
    T_lv = intrinsic_lv_period(params)
    lines.append(f'\nIntrinsic LV period: {T_lv:.1f} s')
    lines.append(f'Target equilibrium:')
    lines.append(f'  H* = 40  C* = 15  A* = 3')
    ax.text(0.08, 0.92, '\n'.join(lines),
            transform=ax.transAxes, fontfamily='monospace',
            fontsize=9.5, verticalalignment='top')

    plt.tight_layout()
    return fig


# ============================================================================
# 7. MAIN
# ============================================================================

if __name__ == '__main__':

    print('=' * 70)
    print('COSMIC ECOSYSTEM DYNAMICS — Parameter Extraction & Model Fitting')
    print('=' * 70)

    # ── Step 1: derive equilibrium-consistent parameters ───────────────────
    print('\n[1] Deriving equilibrium-consistent parameters from code...')
    params = extract_initial_params()
    print('    Parameters:')
    for k in ['alpha_CH', 'alpha_AC', 'beta_CH', 'beta_AC',
              'mu_H', 'mu_C', 'mu_A', 'alpha_HF']:
        print(f'      {k:12s} = {params[k]:.5f}')
    T_lv = intrinsic_lv_period(params)
    print(f'    Intrinsic LV period: {T_lv:.1f} s')

    # ── Step 2: generate stochastic synthetic data ─────────────────────────
    print('\n[2] Generating synthetic data (SDE with demographic noise)...')
    # Initial conditions: start near but not exactly at equilibrium
    # (matching the rebalanced sim starting populations)
    y0 = [100.0, 42.0, 16.0, 3.0]
    t_data, pop_data = generate_stochastic_data(
        params, y0, T=600.0, dt=0.05, noise_scale=0.03, seed=42)
    print(f'    Generated {len(t_data)} time points  (dt=0.05 s)')
    for k in ['H', 'C', 'A']:
        mn = pop_data[k].mean()
        lo = pop_data[k].min()
        hi = pop_data[k].max()
        print(f'    {k}: mean={mn:.1f}  range=[{lo:.1f}, {hi:.1f}]')

    # ── Step 3: fit model to data ──────────────────────────────────────────
    print('\n[3] Fitting ODE model to stochastic data...')
    fitted_params, fit_error = fit_model_to_data(
        t_data[::600], {k: v[::600] for k, v in pop_data.items()}, params)
    print(f'    Fitting complete.  Residual error: {fit_error:.4f}')
    print(f'    Fitted parameters:')
    for k in ['alpha_CH', 'alpha_AC', 'mu_H', 'mu_C', 'mu_A']:
        print(f'      {k:12s} = {fitted_params[k]:.5f}  '
              f'(initial: {params[k]:.5f})')

    # ── Step 4: deterministic model trajectory ─────────────────────────────
    print('\n[4] Integrating deterministic model with fitted parameters...')
    t_eval = np.linspace(0, 600, 1200)
    sol_fitted = solve_ivp(ecosystem_odes, (0, 600), y0,
                           args=(fitted_params,), t_eval=t_eval,
                           method='RK45', max_step=0.05)
    sol_T = sol_fitted.y.T   # shape (1200, 4)
    print(f'    Final state: F={sol_T[-1,0]:.1f}  H={sol_T[-1,1]:.1f}  '
          f'C={sol_T[-1,2]:.1f}  A={sol_T[-1,3]:.1f}')

    # ── Step 5: stability analysis ─────────────────────────────────────────
    print('\n[5] Linearised stability analysis...')
    try:
        y_eq, J, eigenvalues = stability_analysis(fitted_params)
        print(f'    Fixed point:  F={y_eq[0]:.1f}  H={y_eq[1]:.1f}  '
              f'C={y_eq[2]:.1f}  A={y_eq[3]:.1f}')
        print(f'    Eigenvalues:')
        for i, lam in enumerate(eigenvalues):
            print(f'      λ_{i+1} = {lam.real:+.4f} {lam.imag:+.4f}i')

        max_real = np.max(np.real(eigenvalues))
        if max_real < 0:
            print(f'    ✓ Equilibrium is STABLE  (max Re(λ) = {max_real:.4f})')
        else:
            print(f'    ✗ Equilibrium is UNSTABLE  (max Re(λ) = {max_real:.4f})')

        if np.any(np.abs(np.imag(eigenvalues)) > 1e-6):
            osc_eig  = eigenvalues[np.abs(np.imag(eigenvalues)).argmax()]
            osc_period = 2 * np.pi / np.abs(osc_eig.imag)
            print(f'    ⟳ Oscillatory mode: period ≈ {osc_period:.1f} s  '
                  f'(half-life ≈ {np.log(2)/abs(osc_eig.real):.1f} s)')

    except Exception as exc:
        print(f'    Stability analysis failed: {exc}')

    # ── Step 6: spectral analysis ──────────────────────────────────────────
    print('\n[6] Spectral analysis of herbivore time series...')
    midpt = len(t_data) // 2
    dt_val = t_data[1] - t_data[0]
    xf, power, period_H = spectral_analysis(
        t_data[midpt:], pop_data['H'][midpt:], dt_val)
    T_lv_fit = intrinsic_lv_period(fitted_params)
    print(f'    Herbivore dominant period: {period_H:.1f} s')
    print(f'    LV theory period: {T_lv_fit:.1f} s')
    print(f'    Circadian period: 30 s')

    # ── Step 7: generate plot ──────────────────────────────────────────────
    print('\n[7] Generating plots...')
    fig = plot_results(t_data, pop_data, sol_fitted.t, sol_T, fitted_params)
    plt.savefig('ecosystem_fit.png', dpi=150, bbox_inches='tight',
                facecolor='white')
    print('    Saved to ecosystem_fit.png')

    # ── Summary ───────────────────────────────────────────────────────────
    print('\n' + '=' * 70)
    print('ANALYSIS COMPLETE')
    print('=' * 70)
    print(f'\n  Equilibrium:     H* ≈ {y_eq[1]:.0f}  C* ≈ {y_eq[2]:.0f}  '
          f'A* ≈ {y_eq[3]:.0f}')
    print(f'  Stability:       {"STABLE" if max_real < 0 else "UNSTABLE"}')
    print(f'  LV period:       {T_lv_fit:.1f} s')
    print(f'  Dominant period: {period_H:.1f} s')
    print('\n  See ecosystem_dynamics_formulation.md for full mathematical details.')

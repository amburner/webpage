#!/usr/bin/env python3
"""
Interactive Ecosystem Parameter Tuner

Adjust parameters in real-time and see stability analysis + predictions.
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.widgets import Slider, Button
from scipy.integrate import solve_ivp
from scipy.optimize import fsolve
import sys

# Import from ecosystem_analysis.py
from ecosystem_analysis import (
    ecosystem_odes, 
    extract_initial_params,
    spatial_encounter,
    spectral_analysis
)


def compute_stability(params, y_eq=None):
    """
    Compute stability metrics for given parameters.
    
    Returns:
    --------
    dict with keys:
        - equilibrium: [F, H, C, A]
        - eigenvalues: complex array
        - is_stable: bool
        - max_real: float (largest real part)
        - periods: list of oscillation periods
    """
    
    # Find equilibrium with multiple initial guesses
    if y_eq is None:
        def eq_eqs(y):
            # Ensure positive populations during search
            y_pos = np.maximum(y, 0.001)
            return ecosystem_odes(0, y_pos, params)
        
        # Try multiple initial conditions
        initial_guesses = [
            [100, 40, 15, 3],
            [150, 50, 20, 5],
            [80, 30, 10, 2],
            [120, 35, 12, 1],
            [200, 60, 25, 8],
        ]
        
        best_y_eq = None
        best_residual = np.inf
        
        for guess in initial_guesses:
            try:
                result = fsolve(eq_eqs, guess, full_output=True)
                y_candidate = result[0]
                info = result[1]
                
                # Check if solution is valid
                residual = np.sum(np.abs(info['fvec']))
                
                if result[2] == 1 and np.all(y_candidate >= 0) and residual < best_residual:
                    best_y_eq = y_candidate
                    best_residual = residual
            except:
                continue
        
        y_eq = best_y_eq
        
        # If still no valid equilibrium found
        if y_eq is None or best_residual > 1e-3:
            y_eq = [np.nan, np.nan, np.nan, np.nan]
    
    # Check if equilibrium is valid
    if np.any(np.isnan(y_eq)) or np.any(y_eq < 0):
        return {
            'equilibrium': y_eq,
            'eigenvalues': [np.nan],
            'is_stable': False,
            'max_real': np.nan,
            'periods': [],
            'valid': False,
            'message': 'No valid equilibrium (all populations must be positive)'
        }
    
    # Compute Jacobian
    eps = 1e-6
    J = np.zeros((4, 4))
    f0 = np.array(ecosystem_odes(0, y_eq, params))
    
    for i in range(4):
        y_pert = y_eq.copy()
        y_pert[i] += eps
        f_pert = np.array(ecosystem_odes(0, y_pert, params))
        J[:, i] = (f_pert - f0) / eps
    
    # Eigenvalues
    eigenvalues = np.linalg.eigvals(J)
    max_real = np.max(np.real(eigenvalues))
    is_stable = max_real < -1e-6  # Small tolerance for numerical errors
    
    # Extract oscillation periods
    periods = []
    seen_freqs = []
    for lam in eigenvalues:
        imag_part = abs(np.imag(lam))
        if imag_part > 1e-4:  # Threshold for considering oscillatory
            # Check if this frequency already seen (conjugate pair)
            if not any(abs(imag_part - f) < 1e-4 for f in seen_freqs):
                period = 2 * np.pi / imag_part
                periods.append(period)
                seen_freqs.append(imag_part)
    
    # Determine stability message
    if is_stable:
        message = 'Stable equilibrium'
    elif max_real > 1e-6:
        message = 'Unstable (populations will diverge)'
    else:
        message = 'Marginally stable (neutrally stable)'
    
    return {
        'equilibrium': y_eq,
        'eigenvalues': eigenvalues,
        'is_stable': is_stable,
        'max_real': max_real,
        'periods': sorted(periods),
        'valid': True,
        'message': message
    }


def predict_dynamics(params, duration=300):
    """
    Simulate ecosystem dynamics with given parameters.
    """
    y0 = [100, 40, 15, 3]  # Initial conditions
    t_span = (0, duration)
    t_eval = np.linspace(0, duration, 500)
    
    try:
        sol = solve_ivp(ecosystem_odes, t_span, y0, args=(params,),
                       t_eval=t_eval, method='RK45', max_step=1.0)
        return sol
    except:
        return None


class EcosystemTuner:
    """
    Interactive parameter tuning interface.
    """
    
    def __init__(self):
        self.params = extract_initial_params()
        self.original_params = self.params.copy()
        
        # Create figure with better layout
        self.fig = plt.figure(figsize=(18, 11))
        
        # Main plots area (top 70% of figure)
        gs_main = self.fig.add_gridspec(2, 3, left=0.05, right=0.95, top=0.95, bottom=0.45,
                                        hspace=0.35, wspace=0.3)
        
        # Population dynamics (wider)
        self.ax_pop = self.fig.add_subplot(gs_main[0, :2])
        # Phase space
        self.ax_phase = self.fig.add_subplot(gs_main[1, :2])
        # Eigenvalue plot
        self.ax_eig = self.fig.add_subplot(gs_main[0, 2])
        # Stability metrics
        self.ax_metrics = self.fig.add_subplot(gs_main[1, 2])
        self.ax_metrics.axis('off')
        
        # Sliders area (bottom 40% of figure, separated)
        # Left column
        slider_left = 0.08
        slider_right = 0.45
        slider_bottom = 0.05
        slider_top = 0.40
        slider_width = slider_right - slider_left
        
        # Initialize plots
        self.update_plots()
        
        # Create sliders
        self.create_sliders()
        
        plt.show()
    
    def create_sliders(self):
        """Create parameter adjustment sliders with proper spacing."""
        slider_params = [
            ('alpha_CH', 'Carn→Herb attack', 0.001, 0.1, self.params['alpha_CH']),
            ('alpha_AH', 'Apex→Herb attack', 0.001, 0.1, self.params['alpha_AH']),
            ('alpha_AC', 'Apex→Carn attack', 0.001, 0.15, self.params['alpha_AC']),
            ('mu_H', 'Herb mortality', 0.001, 0.03, self.params['mu_H']),
            ('mu_C', 'Carn mortality', 0.001, 0.03, self.params['mu_C']),
            ('mu_A', 'Apex mortality', 0.001, 0.03, self.params['mu_A']),
            ('r_F', 'Food growth', 0.01, 0.5, self.params['r_F']),
            ('beta_CH', 'Carn efficiency', 0.1, 1.0, self.params['beta_CH']),
        ]
        
        self.sliders = {}
        n_sliders = len(slider_params)
        
        # Split sliders into two columns
        n_left = (n_sliders + 1) // 2
        n_right = n_sliders - n_left
        
        # Left column sliders
        left_x = 0.08
        left_width = 0.35
        slider_height = 0.03
        slider_spacing = 0.045
        
        for i in range(n_left):
            key, label, vmin, vmax, vinit = slider_params[i]
            y_pos = 0.38 - i * slider_spacing
            ax = plt.axes([left_x, y_pos, left_width, slider_height])
            slider = Slider(ax, label, vmin, vmax, valinit=vinit, valstep=0.0001)
            slider.on_changed(lambda val, k=key: self.update_param(k, val))
            self.sliders[key] = slider
        
        # Right column sliders
        right_x = 0.55
        right_width = 0.35
        
        for i in range(n_right):
            idx = n_left + i
            key, label, vmin, vmax, vinit = slider_params[idx]
            y_pos = 0.38 - i * slider_spacing
            ax = plt.axes([right_x, y_pos, right_width, slider_height])
            slider = Slider(ax, label, vmin, vmax, valinit=vinit, valstep=0.0001)
            slider.on_changed(lambda val, k=key: self.update_param(k, val))
            self.sliders[key] = slider
        
        # Add reset button
        reset_ax = plt.axes([0.42, 0.02, 0.16, 0.04])
        self.reset_button = Button(reset_ax, 'Reset to Defaults', 
                                   color='lightcoral', hovercolor='salmon')
        self.reset_button.on_clicked(self.reset_params)
    
    def reset_params(self, event=None):
        """Reset all parameters to original values."""
        self.params = self.original_params.copy()
        for key, slider in self.sliders.items():
            slider.set_val(self.params[key])
        # update_plots will be called by slider callbacks
    
    def update_param(self, key, value):
        """Update parameter and refresh plots."""
        self.params[key] = value
        self.update_plots()
    
    def update_plots(self):
        """Refresh all plots with current parameters."""
        # Clear axes
        self.ax_pop.clear()
        self.ax_phase.clear()
        self.ax_eig.clear()
        self.ax_metrics.clear()
        self.ax_metrics.axis('off')
        
        # Compute stability
        stability = compute_stability(self.params)
        
        # Simulate dynamics
        sol = predict_dynamics(self.params)
        
        # Plot population dynamics
        if sol is not None and sol.success:
            colors = ['#9b7db5', '#00fff5', '#ff00ff', '#ff6b35']
            labels = ['Food', 'Herbivores', 'Carnivores', 'Apex']
            
            for i, (color, label) in enumerate(zip(colors, labels)):
                self.ax_pop.plot(sol.t, sol.y[i], color=color, linewidth=2, label=label)
            
            self.ax_pop.set_xlabel('Time (s)')
            self.ax_pop.set_ylabel('Population')
            self.ax_pop.set_title('Population Dynamics')
            self.ax_pop.legend(loc='upper right')
            self.ax_pop.grid(alpha=0.3)
            
            # Plot phase space (H vs C)
            self.ax_phase.plot(sol.y[1], sol.y[2], color='#ff00ff', linewidth=2)
            self.ax_phase.scatter(sol.y[1, 0], sol.y[2, 0], color='green', s=100, 
                                 marker='o', label='Start', zorder=10)
            self.ax_phase.scatter(sol.y[1, -1], sol.y[2, -1], color='red', s=100,
                                 marker='X', label='End', zorder=10)
            
            if stability['valid'] and stability['equilibrium'][1] > 0:
                self.ax_phase.scatter(stability['equilibrium'][1], 
                                     stability['equilibrium'][2],
                                     color='yellow', s=200, marker='*',
                                     label='Equilibrium', zorder=5, 
                                     edgecolors='black', linewidths=2)
            
            self.ax_phase.set_xlabel('Herbivore Population')
            self.ax_phase.set_ylabel('Carnivore Population')
            self.ax_phase.set_title('Phase Space (H vs C)')
            self.ax_phase.legend()
            self.ax_phase.grid(alpha=0.3)
        else:
            self.ax_pop.text(0.5, 0.5, 'Simulation Failed\n(Unstable or Invalid)',
                           ha='center', va='center', fontsize=14, color='red',
                           transform=self.ax_pop.transAxes)
        
        # Plot eigenvalues in complex plane
        if stability['valid']:
            eigs = stability['eigenvalues']
            real_parts = np.real(eigs)
            imag_parts = np.imag(eigs)
            
            # Determine axis limits
            max_real = max(abs(real_parts.min()), abs(real_parts.max())) * 1.3
            max_imag = max(abs(imag_parts.max()), abs(imag_parts.min()), 0.005) * 1.2
            
            # Draw stability boundary (Re(λ) = 0)
            self.ax_eig.axvline(0, color='red', linestyle='--', linewidth=2.5, 
                               label='Stability boundary', zorder=1)
            
            # Shade stable/unstable regions
            self.ax_eig.fill_betweenx([-max_imag, max_imag], -max_real, 0, 
                                     alpha=0.15, color='green', label='Stable', zorder=0)
            self.ax_eig.fill_betweenx([-max_imag, max_imag], 0, max_real,
                                     alpha=0.15, color='red', label='Unstable', zorder=0)
            
            # Plot eigenvalues with labels
            for i, (real, imag) in enumerate(zip(real_parts, imag_parts), 1):
                color = '#00ff00' if real < 0 else '#ff0000'
                self.ax_eig.scatter(real, imag, s=150, c=color, 
                                   marker='o', edgecolors='black', linewidths=2, zorder=10,
                                   label=f'λ{i}' if i <= 2 else None)
                # Add small label
                if abs(imag) > 1e-4:
                    period = 2*np.pi/abs(imag)
                    self.ax_eig.annotate(f'{period:.0f}s', (real, imag),
                                        xytext=(5, 5), textcoords='offset points',
                                        fontsize=7, color=color)
            
            self.ax_eig.set_xlabel('Real Part Re(λ)', fontsize=10)
            self.ax_eig.set_ylabel('Imaginary Part Im(λ)', fontsize=10)
            self.ax_eig.set_title('Eigenvalue Spectrum', fontsize=11, fontweight='bold')
            self.ax_eig.grid(alpha=0.3, linestyle=':')
            self.ax_eig.axhline(0, color='black', linewidth=0.5, zorder=1)
            self.ax_eig.set_xlim(-max_real, max_real)
            self.ax_eig.set_ylim(-max_imag, max_imag)
            self.ax_eig.legend(fontsize=7, loc='upper right')
        else:
            self.ax_eig.text(0.5, 0.5, 'No Valid\nEigenvalues',
                           ha='center', va='center', fontsize=14, color='red',
                           transform=self.ax_eig.transAxes)
        
        # Display stability metrics
        metrics_text = "╔════════════════════════════════╗\n"
        metrics_text += "║   STABILITY ANALYSIS           ║\n"
        metrics_text += "╚════════════════════════════════╝\n\n"
        
        if stability['valid']:
            F_eq, H_eq, C_eq, A_eq = stability['equilibrium']
            metrics_text += "Equilibrium Populations:\n"
            metrics_text += f"  Food:       {F_eq:7.1f}\n"
            metrics_text += f"  Herbivores: {H_eq:7.1f}\n"
            metrics_text += f"  Carnivores: {C_eq:7.1f}\n"
            metrics_text += f"  Apex:       {A_eq:7.1f}\n\n"
            
            # Stability status with color
            if stability['is_stable']:
                status = "✓ STABLE"
                color = 'lightgreen'
            else:
                status = "✗ UNSTABLE"
                color = 'lightcoral'
            
            metrics_text += f"Status: {status}\n"
            metrics_text += f"Max Re(λ): {stability['max_real']:+.6f}\n\n"
            
            # Eigenvalue details
            metrics_text += "Eigenvalues:\n"
            for i, lam in enumerate(stability['eigenvalues'], 1):
                real = np.real(lam)
                imag = np.imag(lam)
                if abs(imag) > 1e-4:
                    period = 2*np.pi/abs(imag)
                    metrics_text += f"  λ{i}: {real:+.5f} {imag:+.5f}i\n"
                    metrics_text += f"      (period: {period:.1f}s)\n"
                else:
                    metrics_text += f"  λ{i}: {real:+.5f}\n"
            
            # Oscillation summary
            if stability['periods']:
                metrics_text += f"\nDominant Periods:\n"
                for period in stability['periods']:
                    metrics_text += f"  • {period:6.1f} seconds\n"
                    
                # Check resonance
                circadian = 30.0
                metrics_text += f"\nCircadian: {circadian:.1f}s\n"
                for period in stability['periods']:
                    ratio = period / circadian
                    if abs(ratio - round(ratio)) < 0.15:  # Close to integer ratio
                        metrics_text += f"⚠ RESONANCE RISK!\n"
                        metrics_text += f"   {period:.1f}s ≈ {round(ratio)}×{circadian:.1f}s\n"
                        color = 'lightyellow'
            else:
                metrics_text += "\n(No oscillations)\n"
                
            metrics_text += f"\n{stability['message']}"
        else:
            metrics_text += "✗ INVALID EQUILIBRIUM\n\n"
            metrics_text += stability.get('message', 'Could not find equilibrium')
            color = 'lightcoral'
        
        self.ax_metrics.text(0.05, 0.95, metrics_text, 
                           transform=self.ax_metrics.transAxes,
                           fontfamily='monospace', fontsize=8.5,
                           verticalalignment='top',
                           bbox=dict(boxstyle='round', facecolor=color, 
                                    alpha=0.3, edgecolor='black', linewidth=1.5))
        
        self.fig.canvas.draw_idle()


def main():
    """Run the interactive tuner."""
    print("=" * 70)
    print("ECOSYSTEM PARAMETER TUNER")
    print("=" * 70)
    print("\nAdjust sliders to tune parameters and observe stability changes.")
    print("Green eigenvalues = stable, Red = unstable")
    print("\nClose the window to exit.\n")
    
    tuner = EcosystemTuner()


if __name__ == "__main__":
    main()
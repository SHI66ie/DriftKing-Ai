import numpy as np
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("telemetry_smoother")

def numpy_pchip_interpolate(x, y, x_new):
    """
    Custom 1D Piecewise Cubic Hermite Interpolating Polynomial (PCHIP) using NumPy.
    Ensures shape preservation and no overshoots.
    """
    x = np.asarray(x)
    y = np.asarray(y)
    x_new = np.asarray(x_new)
    
    n = len(x)
    h = np.diff(x)
    delta = np.diff(y) / h
    
    # Calculate slopes (harmonic mean of adjacent slopes)
    d = np.zeros(n)
    for i in range(1, n - 1):
        if delta[i-1] * delta[i] > 0:
            w1 = 2*h[i] + h[i-1]
            w2 = h[i] + 2*h[i-1]
            d[i] = (w1 + w2) / (w1 / delta[i-1] + w2 / delta[i])
        else:
            d[i] = 0.0
            
    # Boundary slopes
    d[0] = delta[0]
    d[-1] = delta[-1]
    
    # Evaluate at x_new
    idx = np.searchsorted(x, x_new) - 1
    idx = np.clip(idx, 0, n - 2)
    
    x_low = x[idx]
    h_i = h[idx]
    t = (x_new - x_low) / h_i
    
    y_low = y[idx]
    y_high = y[idx+1]
    d_low = d[idx]
    d_high = d[idx+1]
    
    # Hermite basis functions
    h00 = 2*t**3 - 3*t**2 + 1
    h10 = t**3 - 2*t**2 + t
    h01 = -2*t**3 + 3*t**2
    h11 = t**3 - t**2
    
    return h00 * y_low + h10 * h_i * d_low + h01 * y_high + h11 * h_i * d_high

def numpy_savgol_filter(y, window_size=11, polyorder=3):
    """
    Custom Savitzky-Golay filter implementation using pure NumPy linear algebra.
    """
    y = np.asarray(y)
    half_window = (window_size - 1) // 2
    
    # Create Vandermonde matrix
    b = np.mat([[k**i for i in range(polyorder + 1)] for k in range(-half_window, half_window + 1)])
    m = np.linalg.pinv(b).A[0]
    
    # Pad y to handle boundaries
    firstvals = y[0] - np.abs(y[1:half_window+1][::-1] - y[0])
    lastvals = y[-1] + np.abs(y[-half_window-1:-1][::-1] - y[-1])
    y_padded = np.concatenate((firstvals, y, lastvals))
    
    # Convolve
    return np.convolve(m[::-1], y_padded, mode='valid')

def smooth_telemetry(time_seq, throttle_seq, brake_seq, speed_seq=None):
    """
    Smooths throttle and brake telemetry arrays while strictly preserving peaks.
    Uses PCHIP interpolation and Savitzky-Golay filtering via NumPy.
    """
    t = np.array(time_seq, dtype=float)
    throttle = np.array(throttle_seq, dtype=float)
    brake = np.array(brake_seq, dtype=float)
    
    # High-resolution time grid for interpolation
    t_smooth = np.linspace(t[0], t[-1], len(t) * 2)

    try:
        throttle_interp = numpy_pchip_interpolate(t, throttle, t_smooth)
        brake_interp = numpy_pchip_interpolate(t, brake, t_smooth)
        
        window_size = 11
        if len(t_smooth) > window_size:
            throttle_smooth = numpy_savgol_filter(throttle_interp, window_size=window_size, polyorder=3)
            brake_smooth = numpy_savgol_filter(brake_interp, window_size=window_size, polyorder=3)
        else:
            throttle_smooth = throttle_interp
            brake_smooth = brake_interp
            
        throttle_smooth = np.clip(throttle_smooth, 0.0, 100.0).tolist()
        brake_smooth = np.clip(brake_smooth, 0.0, 100.0).tolist()
        
        return {
            "time": t_smooth.tolist(),
            "throttle": throttle_smooth,
            "brake": brake_smooth,
            "engine": "NumPy Native Engine"
        }
    except Exception as fallback_err:
        logger.error(f"NumPy smoothing failed: {fallback_err}")
        return {
            "time": t.tolist(),
            "throttle": throttle.tolist(),
            "brake": brake.tolist(),
            "engine": "Unfiltered Raw"
        }

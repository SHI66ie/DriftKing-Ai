import math
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mat_tyre_models")

class TyreDegradationSimulator:
    def __init__(self):
        logger.info("Initializing Tyre Degradation Simulation Engine...")

    def predict_deg(self, compound, track_temp, lap, fuel_load=50.0, safety_car_laps=None):
        """
        Calculates tyre degradation and grip levels using an exponential thermal-wear model.
        """
        if safety_car_laps is None:
            safety_car_laps = []

        compound_lower = compound.lower()
        if compound_lower == 'soft':
            base_grip = 1.0
            decay_rate = 0.045
            temp_sensitivity = 0.015
            optimum_temp = 90.0
        elif compound_lower == 'medium':
            base_grip = 0.88
            decay_rate = 0.025
            temp_sensitivity = 0.009
            optimum_temp = 95.0
        elif compound_lower == 'hard':
            base_grip = 0.78
            decay_rate = 0.012
            temp_sensitivity = 0.005
            optimum_temp = 100.0
        else:
            base_grip = 0.85
            decay_rate = 0.025
            temp_sensitivity = 0.010
            optimum_temp = 95.0

        # Thermal model
        carcass_temp = track_temp * 1.5 + (fuel_load * 0.15) + (lap * 0.5)

        # Safety Car cooling effect
        sc_active = False
        sc_cooldown = 0.0
        for sc_lap in safety_car_laps:
            if lap >= sc_lap:
                # Cooling drops carcass temp by 12 degrees C per lap under SC
                sc_cooldown += 12.0 * math.exp(-0.2 * (lap - sc_lap))
                sc_active = True

        carcass_temp -= sc_cooldown
        if carcass_temp < track_temp:
            carcass_temp = track_temp

        # Thermal grip penalty (non-linear parabolic curve around optimum temp)
        thermal_penalty = temp_sensitivity * ((carcass_temp - optimum_temp) / optimum_temp) ** 2

        # Degradation model: Exponential decay based on lap age, fuel load, and thermal stress
        wear_factor = 1.0 + (fuel_load * 0.005)
        if sc_active:
            wear_factor *= 0.4

        decay = math.exp(-decay_rate * wear_factor * lap)

        # Combine base grip, mechanical decay, and thermal penalty
        grip = base_grip * decay - thermal_penalty

        # Clamp grip between 0 and 1
        return max(0.0, min(1.0, grip))

def initialize():
    return TyreDegradationSimulator()

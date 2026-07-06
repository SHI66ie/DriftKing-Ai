import json
from http.server import HTTPServer, BaseHTTPRequestHandler
import sys
import os
import math
import random
import concurrent.futures

# Set up pathing
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from telemetry.telemetry_smoother import smooth_telemetry
import mat_tyre_models

# Initialize Tyre Degradation Engine
tyre_sim = mat_tyre_models.initialize()

class MicroserviceHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        try:
            req_data = json.loads(post_data) if post_data else {}
        except Exception:
            self._set_headers(400)
            self.wfile.write(json.dumps({"error": "Invalid JSON format"}).encode('utf-8'))
            return

        if self.path == "/api/tyre/degradation":
            self.handle_tyre_degradation(req_data)
        elif self.path == "/api/telemetry/smooth":
            self.handle_telemetry_smooth(req_data)
        elif self.path == "/api/strategy/simulate":
            self.handle_strategy_simulate(req_data)
        elif self.path == "/api/visualization/track-map":
            self.handle_track_map(req_data)
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode('utf-8'))

    def handle_tyre_degradation(self, data):
        try:
            compound = data.get("compound", "Soft")
            track_temp = float(data.get("track_temp", 42.5))
            lap = int(data.get("lap", 1))
            fuel_load = float(data.get("fuel_load", 50.0))
            safety_car_laps = data.get("safety_car_laps", [])

            grip = tyre_sim.predict_deg(
                compound=compound,
                track_temp=track_temp,
                lap=lap,
                fuel_load=fuel_load,
                safety_car_laps=safety_car_laps
            )
            self._set_headers(200)
            self.wfile.write(json.dumps({"success": True, "grip": grip}).encode('utf-8'))
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_telemetry_smooth(self, data):
        try:
            time_seq = data.get("time", [])
            throttle_seq = data.get("throttle", [])
            brake_seq = data.get("brake", [])

            # Perform smoothing
            res = smooth_telemetry(time_seq, throttle_seq, brake_seq)
            self._set_headers(200)
            self.wfile.write(json.dumps(res).encode('utf-8'))
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_strategy_simulate(self, data):
        try:
            num_laps = int(data.get("num_laps", 50))
            track_temp = float(data.get("track_temp", 35.0))
            base_lap_time = float(data.get("base_lap_time", 95.0))
            fuel_effect = float(data.get("fuel_effect", 0.05))
            pit_stop_loss = float(data.get("pit_stop_loss", 22.0))
            num_simulations = int(data.get("num_simulations", 1000))

            # Python parallel sweep fallback
            sweep_laps = list(range(5, num_laps - 4))
            
            def simulate_strategy(pit_lap):
                total_times = []
                for _ in range(num_simulations):
                    race_time = 0.0
                    fuel = 100.0
                    sc_active = False
                    sc_duration = 0
                    
                    for lap in range(1, num_laps + 1):
                        fuel = max(0.0, fuel - 1.8)
                        if not sc_active and random.random() < 0.015:
                            sc_active = True
                            sc_duration = random.randint(3, 5)
                        
                        lap_pace = base_lap_time + (fuel * fuel_effect)
                        if lap == pit_lap:
                            pit_error = max(2.0, random.normalvariate(2.8, 0.4))
                            race_time += pit_stop_loss + pit_error
                            fuel = 50.0
                        
                        if sc_active and sc_duration > 0:
                            lap_pace *= 1.4
                            sc_duration -= 1
                            if sc_duration == 0:
                                sc_active = False
                        
                        race_time += lap_pace
                    total_times.append(race_time)
                
                mean_time = sum(total_times) / len(total_times)
                variance = sum((x - mean_time) ** 2 for x in total_times) / len(total_times)
                risk_std = math.sqrt(variance)
                return mean_time, risk_std

            mean_race_times = []
            risk_stds = []
            
            with concurrent.futures.ThreadPoolExecutor() as executor:
                results = list(executor.map(simulate_strategy, sweep_laps))
                
            for mean_time, risk_std in results:
                mean_race_times.append(mean_time)
                risk_stds.append(risk_std)
                
            best_idx = 0
            for idx in range(1, len(mean_race_times)):
                if mean_race_times[idx] < mean_race_times[best_idx]:
                    best_idx = idx

            output = {
                "sweep_laps": sweep_laps,
                "mean_race_times": mean_race_times,
                "risk_std": risk_stds,
                "optimal_pit_lap": int(sweep_laps[best_idx]),
                "optimal_race_time": float(mean_race_times[best_idx]),
                "engine": "Python Multiprocessing Fallback"
            }
            self._set_headers(200)
            self.wfile.write(json.dumps(output).encode('utf-8'))
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

    def handle_track_map(self, data):
        try:
            lat = data.get("lat", [])
            lon = data.get("lon", [])
            elevation = data.get("elevation", [])
            speed = data.get("speed", [])

            # Generate stand-alone Plotly HTML directly
            html_lines = [
                "<!DOCTYPE html>",
                "<html>",
                "<head>",
                "  <script src=\"https://cdn.plot.ly/plotly-latest.min.js\"></script>",
                "  <style>body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #0b0c10; }</style>",
                "</head>",
                "<body>",
                "  <div id=\"chart\" style=\"width: 100vw; height: 100vh;\"></div>",
                "  <script>",
                f"    const lat = {json.dumps(lat)};",
                f"    const lon = {json.dumps(lon)};",
                f"    const elevation = {json.dumps(elevation)};",
                f"    const speed = {json.dumps(speed)};",
                "    const trace = {",
                "      type: \"scatter3d\",",
                "      mode: \"lines+markers\",",
                "      x: lon,",
                "      y: lat,",
                "      z: elevation,",
                "      line: {",
                "        width: 6,",
                "        color: speed,",
                "        colorscale: \"Viridis\",",
                "        colorbar: { title: \"Speed (km/h)\", thickness: 15, tickfont: { color: \"#ffffff\" } }",
                "      },",
                "      marker: { size: 2.5, opacity: 0.8, color: speed, colorscale: \"Viridis\" }",
                "    };",
                "    const layout = {",
                "      title: { text: \"Interactive 3D Speed-Gradient Track Overlay\", font: { color: \"#ffffff\" } },",
                "      paper_bgcolor: \"#0b0c10\",",
                "      plot_bgcolor: \"#0b0c10\",",
                "      scene: {",
                "        xaxis: { title: \"Longitude\", gridcolor: \"#1f2833\", tickfont: { color: \"#c5c6c7\" } },",
                "        yaxis: { title: \"Latitude\", gridcolor: \"#1f2833\", tickfont: { color: \"#c5c6c7\" } },",
                "        zaxis: { title: \"Elevation (m)\", gridcolor: \"#1f2833\", tickfont: { color: \"#c5c6c7\" } }",
                "      },",
                "      margin: { l: 0, r: 0, b: 0, t: 40 }",
                "    };",
                "    Plotly.newPlot(\"chart\", [trace], layout);",
                "  </script>",
                "</body>",
                "</html>"
            ]
            html_content = "\n".join(html_lines)
            self._set_headers(200, "text/html")
            self.wfile.write(html_content.encode('utf-8'))
        except Exception as e:
            self._set_headers(500)
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, MicroserviceHandler)
    print(f"Kobayashi-Ai Python microservice running on port {port}...")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()

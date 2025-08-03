
const root = document.getElementById("root");

let heatFlux = null;
let power = null;
const SENSOR_AREA_CM2 = 15;

function render(flux, watt, eff) {
  root.innerHTML = `
    <div style="font-family: sans-serif; padding: 1em; max-width: 400px; margin: auto;">
      <h2>Live Effizienz Monitor</h2>
      <button id="coreBtn">CORE verbinden</button>
      <button id="assiomaBtn">Assioma verbinden</button>
      <p><strong>Wärmeverlust:</strong> ${flux !== null ? flux.toFixed(2) : "--"} W</p>
      <p><strong>Leistung:</strong> ${watt !== null ? watt : "--"} W</p>
      <p><strong>Effizienz:</strong> ${eff !== null ? eff.toFixed(1) : "--"} %</p>
    </div>
  `;
  document.getElementById("coreBtn").onclick = connectCore;
  document.getElementById("assiomaBtn").onclick = connectAssioma;
}

render(null, null, null);

async function connectCore() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        "00002100-5b1e-4347-b07c-97b514daE121",
        "00002101-5b1e-4347-b07c-97b514daE121"
      ]
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService("00002100-5b1e-4347-b07c-97b514daE121");
    const charac = await service.getCharacteristic("00002101-5b1e-4347-b07c-97b514daE121");
    await charac.startNotifications();
    charac.addEventListener("characteristicvaluechanged", (event) => {
      const value = event.target.value;
      const raw = value.getUint16(2, true);
      const mWcm2 = raw / 100.0;
      heatFlux = (mWcm2 * SENSOR_AREA_CM2) / 1000;
      const eff = power ? (power / (power + heatFlux)) * 100 : null;
      render(heatFlux, power, eff);
    });
  } catch (err) {
    alert("CORE Verbindung fehlgeschlagen: " + err);
  }
}

async function connectAssioma() {
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "Assioma" }],
      optionalServices: ["cycling_power"]
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService("cycling_power");
    const charac = await service.getCharacteristic("00002a63-0000-1000-8000-00805f9b34fb");
    await charac.startNotifications();
    charac.addEventListener("characteristicvaluechanged", (event) => {
      const value = event.target.value;
      power = value.getUint16(2, true);
      const eff = heatFlux ? (power / (power + heatFlux)) * 100 : null;
      render(heatFlux, power, eff);
    });
  } catch (err) {
    alert("Assioma Verbindung fehlgeschlagen: " + err);
  }
}

let coreChar = null;
let assiomaSmooth = null;
let fluxSmooth = 0;
let powerSmooth = 0;
let heatLossFactor = 200;
let sensorArea = 10;
let dataZeit = [], dataSensor = [], dataAssioma = [], dataEffizienz = [];

const ctx = document.getElementById("chart").getContext("2d");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: dataZeit,
    datasets: [
      { label: "Sensorleistung (W)", data: dataSensor, yAxisID: 'y' },
      { label: "Assioma (W)", data: dataAssioma, yAxisID: 'y' },
      { label: "Effizienz (%)", data: dataEffizienz, yAxisID: 'y1' }
    ]
  },
  options: {
    responsive: true,
    scales: {
      y: { type: 'linear', position: 'left', title: { display: true, text: 'Leistung (W)' } },
      y1: { type: 'linear', position: 'right', title: { display: true, text: 'Effizienz (%)' }, grid: { drawOnChartArea: false } }
    }
  }
});

function updateDisplay(core, sensor, assioma, eff) {
  document.getElementById("statusText").textContent = `Sensor: ${sensor} W | Assioma: ${assioma || "–"} W | Effizienz: ${eff}`;
}

document.getElementById("coreBtn").addEventListener("click", async () => {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [0x2100] }]
  });
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(0x2100);
  coreChar = await service.getCharacteristic(0x2101);
  await coreChar.startNotifications();
  coreChar.addEventListener("characteristicvaluechanged", handleCOREData);
});

function handleCOREData(event) {
  const dv = event.target.value;
  const fluxRaw = dv.getInt16(4, true);
  const flux = fluxRaw / 10;
  fluxSmooth = fluxSmooth * 0.9 + flux * 0.1;
  powerSmooth = (fluxSmooth * sensorArea) / 1000;
  const totalPower = powerSmooth * heatLossFactor;
  const eff = (assiomaSmooth && totalPower > 0) ? (assiomaSmooth / totalPower * 100).toFixed(1) : null;

  const time = new Date().toLocaleTimeString();
  dataZeit.push(time);
  dataSensor.push(powerSmooth.toFixed(2));
  dataAssioma.push(assiomaSmooth?.toFixed(0));
  dataEffizienz.push(eff);
  if (dataZeit.length > 60) {
    dataZeit.shift(); dataSensor.shift(); dataAssioma.shift(); dataEffizienz.shift();
  }
  chart.update();
  updateDisplay(flux, powerSmooth.toFixed(2), assiomaSmooth?.toFixed(0), eff || "–");
}

document.getElementById("assiomaBtn").addEventListener("click", async () => {
  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: ["cycling_power"]
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService("cycling_power");
    const char = await service.getCharacteristic("cycling_power_measurement");
    await char.startNotifications();
    char.addEventListener("characteristicvaluechanged", (e) => {
      const v = e.target.value;
      const power = v.getUint16(2, true);
      assiomaSmooth = assiomaSmooth ? assiomaSmooth * 0.9 + power * 0.1 : power;
    });
  } catch (e) {
    console.error("Assioma Fehler:", e);
  }
});


let chart = null;
const data = {
  labels: [],
  datasets: [
    { label: 'Wärmeverlust (W)', borderColor: 'red', data: [], tension: 0.2 },
    { label: 'Leistung (W)', borderColor: 'blue', data: [], tension: 0.2 },
    { label: 'Effizienz (%)', borderColor: 'green', data: [], tension: 0.2 }
  ]
};

function updateChart(coreWatt, bikeWatt, efficiency) {
  const now = new Date().toLocaleTimeString();
  data.labels.push(now);
  if (data.labels.length > 20) {
    data.labels.shift();
    data.datasets.forEach(d => d.data.shift());
  }
  data.datasets[0].data.push(coreWatt);
  data.datasets[1].data.push(bikeWatt);
  data.datasets[2].data.push(efficiency);

  chart.update();
}

window.onload = () => {
  const ctx = document.getElementById('chart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: data,
    options: {
      scales: {
        y: { beginAtZero: true }
      }
    }
  });

  document.getElementById("coreBtn").onclick = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'CORE' }],
        optionalServices: ['00002100-5b1e-4347-b07c-97b514dae121']
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('00002100-5b1e-4347-b07c-97b514dae121');
      const characteristic = await service.getCharacteristic('00002101-5b1e-4347-b07c-97b514dae121');
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', event => {
        const val = event.target.value;
        const power = val.getUint16(0, true) / 100;
        document.getElementById("corePower").textContent = power.toFixed(2);
        latest.core = power;
        calculateEfficiency();
      });
    } catch (error) {
      alert("CORE Verbindung fehlgeschlagen: " + error);
    }
  };

  document.getElementById("assiomaBtn").onclick = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['cycling_power'] }]
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('cycling_power');
      const characteristic = await service.getCharacteristic('cycling_power_measurement');
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', event => {
        const val = event.target.value;
        const power = val.getUint16(2, true);
        document.getElementById("bikePower").textContent = power.toFixed(0);
        latest.bike = power;
        calculateEfficiency();
      });
    } catch (error) {
      alert("Assioma Verbindung fehlgeschlagen: " + error);
    }
  };
};

const latest = { core: null, bike: null };

function calculateEfficiency() {
  if (latest.core != null && latest.bike != null) {
    const eff = latest.bike / (latest.bike + latest.core) * 100;
    document.getElementById("efficiency").textContent = eff.toFixed(1);
    updateChart(latest.core, latest.bike, eff);
  }
}

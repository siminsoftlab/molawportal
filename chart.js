function drawPieChart(canvasId, dataObj, label) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(dataObj),
      datasets: [{
        data: Object.values(dataObj),
        backgroundColor: [
          "#4a90e2", "#50e3c2", "#f5a623",
          "#e74c3c", "#9b59b6", "#2ecc71"
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        title: { display: true, text: label }
      }
    }
  });
}

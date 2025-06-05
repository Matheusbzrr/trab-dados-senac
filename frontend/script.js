let dadosCasos = [];
let chartRosca = null;
let chartIdade = null;
let chartModelo = null;

const paletaGradiente = [
  '#40516c', '#4a5d7c', '#53698c', '#5d759c',
  '#6b82a7', '#7b90b1', '#8b9dba'
];

function filtrarPorData(casos) {
  const inicio = document.getElementById('dataInicio').value;
  const fim = document.getElementById('dataFim').value;

  return casos.filter(caso => {
    if (!caso.data_do_caso) return false;
    const data = new Date(caso.data_do_caso);
    const dataInicio = inicio ? new Date(inicio) : null;
    const dataFim = fim ? new Date(fim) : null;

    return (!dataInicio || data >= dataInicio) &&
           (!dataFim || data <= dataFim);
  });
}

function contarOcorrencias(casos, chave) {
  const contagem = {};
  casos.forEach(caso => {
    const valor = chave.includes('.') ? chave.split('.').reduce((o, k) => o?.[k], caso) : caso[chave];
    if (valor !== undefined && valor !== null) {
      contagem[valor] = (contagem[valor] || 0) + 1;
    }
  });
  return contagem;
}

function atualizarGraficoRosca(variavel) {
  const dadosFiltrados = filtrarPorData(dadosCasos);
  const contagem = contarOcorrencias(dadosFiltrados, variavel);
  const labels = Object.keys(contagem);
  const valores = Object.values(contagem);

  const cores = labels.map((_, i) => paletaGradiente[i % paletaGradiente.length]);

  if(chartRosca) chartRosca.destroy();

  const ctx = document.getElementById("graficoRosca").getContext("2d");
  chartRosca = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: valores,
        backgroundColor: cores
      }]
    },
    options: {
      responsive: true,
      devicePixelRatio: window.devicePixelRatio || 1,
      plugins: {
        legend: {
          position: 'right'
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { display: false } }
      }
    }
  });
}

function atualizarGraficoDistribuicao() {
  const dadosFiltrados = filtrarPorData(dadosCasos);
  const idades = dadosFiltrados
    .map(caso => caso.vitima?.idade)
    .filter(idade => typeof idade === "number" && idade >= 0);

  const faixas = {};
  idades.forEach(idade => {
    const faixaInicio = Math.floor((idade - 1) / 10) * 10 + 1;
    const faixaLabel = `${faixaInicio}-${faixaInicio + 9}`;
    faixas[faixaLabel] = (faixas[faixaLabel] || 0) + 1;
  });

  const labels = Object.keys(faixas).sort((a, b) => {
    const numA = parseInt(a.split('-')[0]);
    const numB = parseInt(b.split('-')[0]);
    return numA - numB;
  });
  const valores = labels.map(label => faixas[label]);

  if(chartIdade) chartIdade.destroy();

  const ctx = document.getElementById("graficoDistribuicao").getContext("2d");
  chartIdade = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Número de Vítimas",
        data: valores,
        backgroundColor: paletaGradiente[5]
      }]
    },
    options: {
      responsive: true,
      devicePixelRatio: window.devicePixelRatio || 1,
      scales: {
        x: {
          title: { display: true, text: 'Faixa Etária' },
          grid: { display: false }
        },
        y: {
          title: { display: true, text: 'Quantidade' },
          beginAtZero: true,
          grid: { display: false }
        }
      }
    }
  });
}

function atualizarGraficoModeloScatter() {
  const dadosFiltrados = filtrarPorData(dadosCasos);
  if (!dadosFiltrados.length) return;

  const classes = [...new Set(dadosFiltrados.map(c => c.tipo_do_caso))];
  const classeToY = {};
  classes.forEach((c, i) => classeToY[c] = i + 1);

  const datasets = classes.map((classe, idx) => {
    const pontos = dadosFiltrados
      .filter(c => c.tipo_do_caso === classe)
      .map(c => ({
        x: c.vitima?.idade || 0,
        y: classeToY[classe]
      }))
      .filter(p => p.x > 0);

    return {
      label: classe,
      data: pontos,
      backgroundColor: '#5d759c',
      pointRadius: 5,
      grid: { display: false }
    };
  });

  const ctx = document.getElementById("graficoModelo").getContext("2d");
  if(chartModelo) chartModelo.destroy();

  const container = document.getElementById("containerGraficoModelo");
  container.innerHTML = `
    <h3>Fatores Determinantes nos Tipos de Caso</h3> <!-- TÍTULO ALTERADO -->
    <canvas id="graficoModelo"></canvas>
  `;

  chartModelo = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: datasets
    },
    options: {
      responsive: true,
      devicePixelRatio: window.devicePixelRatio || 1,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Idade da Vítima'
          },
          beginAtZero: true,
          min: 0,
          max: 100
        },
        y: {
          title: {
            display: true,
            text: 'Tipo do Caso'
          },
          ticks: {
            stepSize: 1,
            callback: function(value) {
              return classes[value - 1] || value;
            }
          },
          min: 0,
          max: classes.length + 1
        }
      },
      plugins: {
        legend: {
          position: 'top'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Tipo: ${context.dataset.label}, Idade: ${context.parsed.x}`;
            }
          }
        }
      }
    }
  });
}

function atualizarGraficos() {
  const variavelRosca = document.getElementById("variavelRosca").value;
  atualizarGraficoRosca(variavelRosca);
  atualizarGraficoDistribuicao();
  atualizarGraficoModeloScatter();
}

document.getElementById("variavelRosca").addEventListener("change", atualizarGraficos);
document.getElementById("dataInicio").addEventListener("change", atualizarGraficos);
document.getElementById("dataFim").addEventListener("change", atualizarGraficos);

async function carregarDados() {
  const resposta = await fetch('http://127.0.0.1:5000/api/casos');
  dadosCasos = await resposta.json();
  atualizarGraficos();
}

window.onload = carregarDados;
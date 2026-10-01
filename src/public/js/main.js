document.addEventListener('DOMContentLoaded', () => {
  // Sidebar Toggle em dispositivos móveis
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('show');
    });
  }

  // Inicializar Gráficos do Dashboard se existirem na página
  if (window.chartData) {
    const { vendasDias, pagamentos } = window.chartData;

    // Gráfico de Faturamento 7 Dias
    const ctxVendas = document.getElementById('vendasChart');
    if (ctxVendas && vendasDias) {
      const labels = vendasDias.map(item => {
        const d = new Date(item.data + 'T00:00:00');
        return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
      });
      const dataTotais = vendasDias.map(item => item.total);

      new Chart(ctxVendas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Faturamento (R$)',
            data: dataTotais,
            borderColor: '#e63946',
            backgroundColor: 'rgba(230, 57, 70, 0.15)',
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#e63946',
            pointRadius: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              grid: { color: 'rgba(255, 255, 255, 0.05)' },
              ticks: { color: '#94a3b8' }
            },
            x: {
              grid: { display: false },
              ticks: { color: '#94a3b8' }
            }
          }
        }
      });
    }

    // Gráfico de Formas de Pagamento
    const ctxPagamento = document.getElementById('pagamentoChart');
    if (ctxPagamento && pagamentos) {
      const pagLabels = pagamentos.map(p => p.forma_pagamento.replace('_', ' '));
      const pagTotais = pagamentos.map(p => p.total);

      new Chart(ctxPagamento, {
        type: 'doughnut',
        data: {
          labels: pagLabels,
          datasets: [{
            data: pagTotais,
            backgroundColor: ['#e63946', '#ffb703', '#3b82f6', '#10b981', '#8b5cf6'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#f8fafc', boxWidth: 12 }
            }
          }
        }
      });
    }
  }
});

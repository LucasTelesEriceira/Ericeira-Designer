function financeiroApp() {
  return {
    loading: true,
    selectedPeriod: 'this_month',
    customStartDate: '',
    customEndDate: '',
    periodLabel: '',
    
    summary: {
      gross_revenue: 0,
      services_revenue: 0,
      sales_revenue: 0,
      total_expenses: 0,
      net_profit: 0,
      profit_margin: 0,
      ticket_average: 0,
      total_transactions: 0,
      services_count: 0,
      sales_count: 0,
      expenses_count: 0
    },

    paymentMethods: [],
    expensesByCategory: [],
    monthlyEvolution: [],
    topServices: [],
    topProducts: [],

    chartEvolutionInstance: null,
    chartPaymentInstance: null,

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }

      const role = this.getUserRole()
      if (role !== 'admin') {
        showToast('Acesso restrito para administradores', 'warning')
        window.location.href = 'dashboard.html'
        return
      }

      await this.fetchFinancialData()
    },

    getUserRole() {
      return typeof getUserRole === 'function' ? getUserRole() : (localStorage.getItem('userRole') || 'admin')
    },

    getUserRoleLabel() {
      return typeof getUserRoleLabel === 'function' ? getUserRoleLabel() : 'Administrador'
    },

    getUserDisplayName() {
      return typeof getUserDisplayName === 'function' ? getUserDisplayName() : (localStorage.getItem('userDisplayName') || 'Usuário')
    },

    logout() {
      if (typeof logout === 'function') {
        logout()
      } else {
        localStorage.clear()
        window.location.href = 'login.html'
      }
    },

    formatCurrency(val) {
      if (typeof formatCurrency === 'function') {
        return formatCurrency(val)
      }
      return 'R$ ' + parseFloat(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },

    setPeriod(period) {
      this.selectedPeriod = period
      this.fetchFinancialData()
    },

    applyCustomPeriod() {
      if (!this.customStartDate || !this.customEndDate) {
        showToast('Selecione data inicial e data final', 'warning')
        return
      }
      this.selectedPeriod = 'custom'
      this.fetchFinancialData()
    },

    async fetchFinancialData() {
      this.loading = true
      let url = getUrlBase()[getEnv()] + `/json/api/v1/financial/report?period=${this.selectedPeriod}`

      if (this.selectedPeriod === 'custom') {
        url += `&start_date=${this.customStartDate}&end_date=${this.customEndDate}`
      }

      try {
        const response = await fetch(url, {
          headers: getAuthHeaders()
        })

        if (handleAuthError(response)) return

        if (!response.ok) {
          const err = await response.json()
          showToast('Erro ao carregar dados: ' + (err.error || 'Falha na requisição'))
          return
        }

        const data = await response.json()

        this.periodLabel = data.period?.label || ''
        this.summary = data.summary || this.summary
        this.paymentMethods = data.payment_methods || []
        this.expensesByCategory = data.expenses_by_category || []
        this.monthlyEvolution = data.monthly_evolution || []
        this.topServices = data.top_services || []
        this.topProducts = data.top_products || []

        // Renderizar ou atualizar gráficos do Chart.js após atualização do DOM
        this.$nextTick(() => {
          this.renderEvolutionChart()
          this.renderPaymentMethodsChart()
        })
      } catch (error) {
        console.error('Erro ao buscar dados financeiros:', error)
        showToast('Erro ao carregar relatórios financeiros')
      } finally {
        this.loading = false
      }
    },

    renderEvolutionChart() {
      const ctx = document.getElementById('chartEvolution')
      if (!ctx || typeof Chart === 'undefined') return

      if (this.chartEvolutionInstance) {
        this.chartEvolutionInstance.destroy()
      }

      const labels = this.monthlyEvolution.map(m => m.label)
      const revenues = this.monthlyEvolution.map(m => m.revenue)
      const expenses = this.monthlyEvolution.map(m => m.expenses)
      const profits = this.monthlyEvolution.map(m => m.profit)

      this.chartEvolutionInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Entradas (R$)',
              data: revenues,
              backgroundColor: 'rgba(16, 185, 129, 0.85)',
              borderRadius: 6,
              order: 2
            },
            {
              label: 'Saídas (R$)',
              data: expenses,
              backgroundColor: 'rgba(239, 68, 68, 0.85)',
              borderRadius: 6,
              order: 3
            },
            {
              label: 'Lucro Líquido (R$)',
              data: profits,
              type: 'line',
              borderColor: '#ec4899',
              backgroundColor: 'rgba(236, 72, 153, 0.1)',
              fill: true,
              tension: 0.3,
              pointRadius: 4,
              pointHoverRadius: 6,
              borderWidth: 2.5,
              order: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                font: { size: 11, family: 'Roboto, sans-serif' }
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const val = context.parsed.y || 0
                  return `${context.dataset.label}: R$ ${val.toFixed(2)}`
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 11 } }
            },
            y: {
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
              ticks: {
                callback: (val) => 'R$ ' + val,
                font: { size: 10 }
              }
            }
          }
        }
      })
    },

    renderPaymentMethodsChart() {
      const ctx = document.getElementById('chartPayment')
      if (!ctx || typeof Chart === 'undefined') return

      if (this.chartPaymentInstance) {
        this.chartPaymentInstance.destroy()
      }

      if (this.paymentMethods.length === 0) {
        return
      }

      const labels = this.paymentMethods.map(p => p.label)
      const dataValues = this.paymentMethods.map(p => p.total)

      const colors = [
        '#10b981', // Emerald
        '#3b82f6', // Blue
        '#8b5cf6', // Purple
        '#f59e0b', // Amber
        '#ec4899', // Pink
        '#6b7280'  // Gray
      ]

      this.chartPaymentInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: dataValues,
            backgroundColor: colors.slice(0, labels.length),
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 10,
                font: { size: 11, family: 'Roboto, sans-serif' }
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const val = context.parsed || 0
                  const total = dataValues.reduce((a, b) => a + b, 0)
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0
                  return `${context.label}: R$ ${val.toFixed(2)} (${pct}%)`
                }
              }
            }
          },
          cutout: '68%'
        }
      })
    }
  }
}

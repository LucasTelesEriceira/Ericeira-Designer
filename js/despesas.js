function despesasApp() {
  return {
    expenses: [],
    loading: true,
    openFormExpense: false,
    formExpense: {
      id: '',
      title: '',
      amount: '',
      date: '',
      category: 'Geral',
    },
    errors: {},
    expenseSearch: '',
    expenseCategories: [
      { value: 'Geral', label: 'Geral' },
      { value: 'Materiais', label: 'Materiais' },
      { value: 'Ferramentas', label: 'Ferramentas' },
      { value: 'Aluguel', label: 'Aluguel' },
      { value: 'Energia', label: 'Energia' },
      { value: 'Água', label: 'Água' },
      { value: 'Internet', label: 'Internet' },
      { value: 'Outros', label: 'Outros' },
    ],

    pageSize: 15,
    displayedCount: 15,

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      this.loading = true
      await this.fetchExpenses()
      this.loading = false

      this.$watch('expenseSearch', () => {
        this.displayedCount = this.pageSize
      })
    },

    async fetchExpenses() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/expenses',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        const res = await response.json()
        const raw = Array.isArray(res) ? res : (res.expenses || [])
        
        this.expenses = raw.map(e => ({
          id: e.id,
          title: e.title || e.name || 'Despesa',
          amount: parseFloat(e.amount || e.value || 0),
          category: e.category || 'Geral',
          date: e.date || e.expense_date || ''
        }))
        this.expenses.sort((a, b) => b.date.localeCompare(a.date))
      } catch (error) {
        console.error('Erro ao buscar despesas:', error)
      }
    },

    filteredExpenses() {
      if (!this.expenseSearch) return this.expenses
      const q = this.expenseSearch.toLowerCase().trim()
      return this.expenses.filter(
        (e) => (e.title && e.title.toLowerCase().includes(q)) || (e.category && e.category.toLowerCase().includes(q))
      )
    },

    paginatedExpenses() {
      return this.filteredExpenses().slice(0, this.displayedCount)
    },

    hasMoreExpenses() {
      return this.displayedCount < this.filteredExpenses().length
    },

    loadMoreExpenses() {
      if (this.hasMoreExpenses()) {
        this.displayedCount += this.pageSize
      }
    },

    formatDate(date) {
      if (!date) return ''
      return typeof formatDate === 'function' ? formatDate(date) : date
    },

    formatCurrency(val) {
      if (typeof formatCurrency === 'function') {
        return formatCurrency(val)
      }
      return 'R$ ' + parseFloat(val || 0).toFixed(2)
    },

    openExpenseForm(expense = null) {
      if (expense) {
        this.formExpense = {
          id: expense.id,
          title: expense.title || '',
          amount: expense.amount || '',
          date: expense.date || new Date().toISOString().split('T')[0],
          category: expense.category || 'Geral',
        }
      } else {
        this.formExpense = {
          id: '',
          title: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          category: 'Geral',
        }
      }
      this.errors = {}
      this.openFormExpense = true
    },

    validateExpenseForm() {
      this.errors = {}
      const f = this.formExpense
      if (!f.title || !f.title.trim()) this.errors.title = 'Título é obrigatório'
      if (!f.amount || parseFloat(f.amount) <= 0) this.errors.amount = 'Informe um valor válido'
      if (!f.date) this.errors.date = 'Data é obrigatória'
      return Object.keys(this.errors).length === 0
    },

    async postExpense() {
      if (!this.validateExpenseForm()) return
      try {
        const f = this.formExpense
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/expenses',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({
              id: f.id || 0,
              title: f.title.trim(),
              amount: parseFloat(f.amount),
              category: f.category || 'Geral',
              date: f.date,
            }),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao salvar'))
          return
        }

        showToast(f.id ? 'Despesa atualizada com sucesso' : 'Despesa registrada com sucesso', 'success')
        this.openFormExpense = false
        this.loading = true
        await this.fetchExpenses()
        this.loading = false
      } catch (error) {
        console.error('Erro ao salvar despesa:', error)
        showToast('Erro ao salvar despesa')
      }
    },

    async deleteExpense(id) {
      if (!confirm('Excluir esta despesa?')) return

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/expenses',
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify({ id }),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          showToast('Erro: ' + (error.error || 'Falha ao excluir'))
          return
        }

        showToast('Despesa excluída com sucesso', 'success')
        this.expenses = this.expenses.filter((e) => e.id !== id)
        if (typeof invalidateCache === 'function') {
          invalidateCache('expenses')
          invalidateCache('dashboard')
        }
      } catch (error) {
        console.error('Erro ao excluir despesa:', error)
        showToast('Erro ao excluir despesa')
      }
    },
  }
}

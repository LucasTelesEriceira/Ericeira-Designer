function despesasApp() {
  return {
    expenses: [],
    openFormExpense: false,
    formExpense: { id: '', title: '', description: '', amount: '', expense_date: '', category: '', payment_method: '', notes: '' },
    expenseCategories: [
      { value: 'materials', label: 'Materiais' },
      { value: 'tools', label: 'Ferramentas' },
      { value: 'rent', label: 'Aluguel' },
      { value: 'energy', label: 'Energia' },
      { value: 'water', label: 'Água' },
      { value: 'internet', label: 'Internet' },
      { value: 'other', label: 'Outros' },
    ],

    async init() {
      if (!localStorage.getItem('jwtToken')) {
        window.location.href = 'login.html'
        return
      }
      await this.fetchExpenses()
    },

    async fetchExpenses() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/expenses',
          { headers: getAuthHeaders() }
        )
        if (handleAuthError(response)) return
        this.expenses = await response.json()
      } catch (error) {
        console.error('Erro ao buscar despesas:', error)
      }
    },

    openExpenseForm(expense = null) {
      if (expense) {
        this.formExpense = {
          id: expense.id,
          title: expense.title || '',
          description: expense.description || '',
          amount: expense.amount || '',
          expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
          category: expense.category || '',
          payment_method: expense.payment_method || 'pix',
          notes: expense.notes || '',
        }
      } else {
        this.formExpense = {
          id: '', title: '', description: '', amount: '',
          expense_date: new Date().toISOString().split('T')[0],
          category: '', payment_method: 'pix', notes: '',
        }
      }
      this.openFormExpense = true
    },

    async postExpense() {
      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/expenses',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders(),
            },
            body: JSON.stringify(this.formExpense),
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          alert('Erro: ' + (error.error || 'Falha ao salvar'))
          return
        }

        const newExpense = await response.json()
        if (this.formExpense.id) {
          const index = this.expenses.findIndex(e => e.id === this.formExpense.id)
          if (index !== -1) this.expenses[index] = newExpense.meta_input
        } else {
          this.expenses.push(newExpense.meta_input)
        }
        this.expenses.sort((a, b) => b.expense_date.localeCompare(a.expense_date))
        this.openFormExpense = false
        this.formExpense = { id: '', title: '', description: '', amount: '', expense_date: '', category: '', payment_method: '', notes: '' }
      } catch (error) {
        console.error('Erro ao salvar despesa:', error)
      }
    },

    async deleteExpense(id) {
      if (!confirm('Excluir esta despesa?')) return

      try {
        const response = await fetch(
          getUrlBase()[getEnv()] + '/json/api/v1/expenses/' + id,
          {
            method: 'DELETE',
            headers: { ...getAuthHeaders() },
          }
        )

        if (handleAuthError(response)) return

        if (!response.ok) {
          const error = await response.json()
          alert('Erro: ' + (error.error || 'Falha ao excluir'))
          return
        }

        this.expenses = this.expenses.filter((e) => e.id !== id)
      } catch (error) {
        console.error('Erro ao excluir despesa:', error)
      }
    },
  }
}

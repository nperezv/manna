import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAppStore = create(
  persist(
    (set, get) => ({

      // ── Onboarding ──────────────────────────────────────────────────────
      onboardingDone: false,
      completeOnboarding: () => set({ onboardingDone: true }),

      // ── Theme ────────────────────────────────────────────────────────────
      theme: 'light',
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', next)
        set({ theme: next })
      },

      // ── Family config ────────────────────────────────────────────────────
      familyName: 'Mi Familia',
      currency: 'EUR',
      tithePercent: 10,          // FIXED: always 10%, never editable
      fastOfferingPercent: 2,    // Suggested %, freely editable
      fastOfferingFixed: null,   // Override with fixed amount if user wants
      // Bank integration — SEPA mandate reference for auto-detection (Phase 2)
      churchBankReference: '',   // e.g. 'ES15866R2800159B'
      churchBankName: 'IGLESIA JESUCRISTO', // text pattern in bank statement
      members: [],

      setFamilyConfig: (config) => {
        set(config)
        // If fastOfferingPercent changed, recalc budget cat 11 immediately
        if (config.fastOfferingPercent !== undefined || config.fastOfferingFixed !== undefined) {
          setTimeout(() => get()._recalcTitheBudget(get().getCurrentMonth()), 0)
        }
      },
      addMember: (m) => set(s => ({ members: [...s.members, { ...m, id: Date.now() }] })),
      removeMember: (id) => set(s => ({ members: s.members.filter(m => m.id !== id) })),

      // ── Income categories ────────────────────────────────────────────────
      // computable: counts toward tithe calculation
      // non-computable: recorded but ignored for tithe (transfers, reimbursements, etc.)

      // ── Recurring income definitions ─────────────────────────────────────
      // { id, name, category, estimatedAmount, dayOfMonth, computable,
      //   bankPattern, active, createdAt }
      recurringIncomes: [],
      addRecurringIncome: (r) => set(s => ({
        recurringIncomes: [...s.recurringIncomes, {
          ...r, id: Date.now(), active: true, createdAt: new Date().toISOString()
        }]
      })),
      updateRecurringIncome: (id, data) => set(s => ({
        recurringIncomes: s.recurringIncomes.map(r => r.id === id ? { ...r, ...data } : r)
      })),
      removeRecurringIncome: (id) => set(s => ({
        recurringIncomes: s.recurringIncomes.filter(r => r.id !== id)
      })),

      // ── Income ───────────────────────────────────────────────────────────
      incomes: [],
      addIncome: (income) => {
        // computable defaults to true unless explicitly set to false
        const computable = income.computable !== false
        const newIncome = { ...income, id: Date.now(), type: 'income', computable }
        set(s => ({ incomes: [...s.incomes, newIncome] }))
        // Only recalc tithe if income is computable
        if (computable) {
          const month = income.date ? income.date.substring(0, 7) : get().getCurrentMonth()
          get()._recalcTitheBudget(month)
        }
      },
      updateIncome: (id, data) => set(s => ({
        incomes: s.incomes.map(i => i.id === id ? { ...i, ...data } : i)
      })),
      removeIncome: (id) => {
        set(s => ({ incomes: s.incomes.filter(i => i.id !== id) }))
        get()._recalcTitheBudget(get().getCurrentMonth())
      },

      // Internal: recalculate cat 1 (diezmo) and cat 11 (ofrenda) budgets
      _recalcTitheBudget: (month) => {
        const m = month || get().getCurrentMonth()
        const monthIncome = get().incomes
          .filter(i => i.date.startsWith(m))
          .reduce((sum, i) => sum + i.amount, 0)
        const tithe = Math.round(monthIncome * (get().tithePercent / 100) * 100) / 100
        const { fastOfferingFixed, fastOfferingPercent } = get()
        const fast = fastOfferingFixed
          ? fastOfferingFixed
          : Math.round(monthIncome * (fastOfferingPercent / 100) * 100) / 100
        // Cat 1 = diezmo (locked, auto), Cat 11 = ofrenda ayuno (suggested)
        get().updateBudgetCategory(1, { budgeted: tithe })
        get().updateBudgetCategory(11, { budgeted: fast })
      },

      // ── Custom categorization rules ─────────────────────────────────────────
      categorizationRules: [], // [{ id, pattern, categoryId, createdAt }]
      addCategorizationRule: (rule) => set(s => ({
        categorizationRules: [...s.categorizationRules, { ...rule, id: Date.now(), createdAt: new Date().toISOString() }]
      })),
      removeCategorizationRule: (id) => set(s => ({
        categorizationRules: s.categorizationRules.filter(r => r.id !== id)
      })),

      // ── Expenses ─────────────────────────────────────────────────────────
      expenses: [],
      addExpense: (e) => set(s => ({
        expenses: [...s.expenses, { ...e, id: Date.now(), type: 'expense' }]
      })),
      updateExpense: (id, data) => set(s => ({
        expenses: s.expenses.map(e => e.id === id ? { ...e, ...data } : e)
      })),
      removeExpense: (id) => set(s => ({ expenses: s.expenses.filter(e => e.id !== id) })),

      // ── Budget categories ─────────────────────────────────────────────────
      // Pillar 1: diezmo (id:1) and ofrenda (id:11) are SEPARATE
      budgetCategories: [
        { id: 1,  name: 'Diezmo',              color: '#e6ad3c', budgeted: 0, pillar: 1, locked: true  },
        { id: 11, name: 'Ofrenda de ayuno',    color: '#f5c842', budgeted: 0, pillar: 1, locked: false },
        { id: 2,  name: 'Vivienda',            color: '#4a9fd4', budgeted: 0, pillar: 2, locked: false },
        { id: 20, name: 'Suministros',         color: '#2d8bbf', budgeted: 0, pillar: 2, locked: false },
        { id: 3,  name: 'Alimentación',        color: '#e6ad3c', budgeted: 0, pillar: 2, locked: false },
        { id: 4,  name: 'Transporte',          color: '#8b6cf7', budgeted: 0, pillar: 2, locked: false },
        { id: 5,  name: 'Educación',           color: '#e05c4e', budgeted: 0, pillar: 2, locked: false },
        { id: 6,  name: 'Salud',               color: '#f0a030', budgeted: 0, pillar: 2, locked: false },
        { id: 21, name: 'Suscripciones',       color: '#7c5cbf', budgeted: 0, pillar: 2, locked: false },
        { id: 7,  name: 'Ocio y familia',      color: '#d4548a', budgeted: 0, pillar: 2, locked: false },
        { id: 8,  name: 'Ahorro emergencias',  color: '#2d9b8a', budgeted: 0, pillar: 3, locked: false },
        { id: 9,  name: 'Metas de ahorro',     color: '#6b8fd4', budgeted: 0, pillar: 3, locked: false },
        { id: 10, name: 'Deudas',              color: '#c05a3a', budgeted: 0, pillar: 4, locked: false },
      ],
      updateBudgetCategory: (id, data) => set(s => ({
        budgetCategories: s.budgetCategories.map(c => c.id === id ? { ...c, ...data } : c)
      })),

      // ── Subcategory budgets ──────────────────────────────────────────────────
      // { [subId]: amount } — keyed by subcategory ID
      subcategoryBudgets: {},
      setSubcategoryBudget: (subId, amount) => set(s => ({
        subcategoryBudgets: { ...s.subcategoryBudgets, [subId]: amount }
      })),
      getSubcategoryBudget: (subId) => {
        return get().subcategoryBudgets[subId] || 0
      },

      // ── Savings goals ─────────────────────────────────────────────────────
      savingsGoals: [],
      addSavingsGoal: (g) => set(s => ({
        savingsGoals: [...s.savingsGoals, { ...g, id: Date.now(), saved: 0, createdAt: new Date().toISOString() }]
      })),
      updateSavingsGoal: (id, data) => set(s => ({
        savingsGoals: s.savingsGoals.map(g => g.id === id ? { ...g, ...data } : g)
      })),
      removeSavingsGoal: (id) => set(s => ({
        savingsGoals: s.savingsGoals.filter(g => g.id !== id)
      })),

      // ── Debts ────────────────────────────────────────────────────────────
      debts: [],
      addDebt: (d) => set(s => ({
        debts: [...s.debts, { ...d, id: Date.now(), createdAt: new Date().toISOString() }]
      })),
      updateDebt: (id, data) => set(s => ({
        debts: s.debts.map(d => d.id === id ? { ...d, ...data } : d)
      })),
      removeDebt: (id) => set(s => ({ debts: s.debts.filter(d => d.id !== id) })),

      // ── Tithe payments (Pilar 1 — Diezmo) ────────────────────────────────
      tithePayments: [],
      addTithePayment: (p) => {
        const id = Date.now()
        const date = p.date || new Date().toISOString()
        const payment = { ...p, id, date, source: p.source || 'manual' }
        const expense = p.amount > 0 ? {
          id: Date.now() + 1,
          description: p.note ? `Diezmo — ${p.note}` : 'Diezmo',
          amount: p.amount,
          categoryId: 1,
          date,
          type: 'expense',
          member: p.member || '',
          autoFromPayment: id,
          source: p.source || 'manual',
        } : null
        set(s => ({
          tithePayments: [...s.tithePayments, payment],
          expenses: expense ? [...s.expenses, expense] : s.expenses,
        }))
      },
      updateTithePayment: (id, data) => set(s => ({
        tithePayments: s.tithePayments.map(p => p.id === id ? { ...p, ...data } : p)
      })),
      removeTithePayment: (id) => {
        const payment = get().tithePayments.find(p => p.id === id)
        set(s => ({ tithePayments: s.tithePayments.filter(p => p.id !== id) }))
        // Also remove the auto-generated expense
        if (payment) {
          set(s => ({ expenses: s.expenses.filter(e => e.autoFromPayment !== id) }))
        }
      },

      // ── Fast offering payments (Pilar 1 — Ofrenda) ───────────────────────
      fastOfferingPayments: [],
      addFastOfferingPayment: (p) => {
        const id = Date.now()
        const date = p.date || new Date().toISOString()
        const payment = { ...p, id, date, source: p.source || 'manual' }
        const expense = p.amount > 0 ? {
          id: Date.now() + 2,
          description: p.note ? `Ofrenda de ayuno — ${p.note}` : 'Ofrenda de ayuno',
          amount: p.amount,
          categoryId: 11,
          date,
          type: 'expense',
          member: p.member || '',
          autoFromPayment: id,
          source: p.source || 'manual',
        } : null
        set(s => ({
          fastOfferingPayments: [...s.fastOfferingPayments, payment],
          expenses: expense ? [...s.expenses, expense] : s.expenses,
        }))
      },
      updateFastOfferingPayment: (id, data) => set(s => ({
        fastOfferingPayments: s.fastOfferingPayments.map(p => p.id === id ? { ...p, ...data } : p)
      })),
      removeFastOfferingPayment: (id) => {
        const payment = get().fastOfferingPayments.find(p => p.id === id)
        set(s => ({ fastOfferingPayments: s.fastOfferingPayments.filter(p => p.id !== id) }))
        // Also remove the auto-generated expense
        if (payment) {
          set(s => ({ expenses: s.expenses.filter(e => e.autoFromPayment !== id) }))
        }
      },

      // ── Custom donations (Pilar 1 — añadibles) ──────────────────────────────
      // Each donation: { id, name, color, budgeted, pillar:1, isDonation:true,
      //   bankChannel: 'sepa'|'bizum'|'western_union'|'transfer',
      //   bankPattern: 'texto identificador en extracto' }
      donations: [],
      addDonation: (d) => set(s => ({
        donations: [...s.donations, {
          ...d, id: Date.now(), budgeted: d.budgeted || 0,
          pillar: 1, isDonation: true, createdAt: new Date().toISOString()
        }]
      })),
      updateDonation: (id, data) => set(s => ({
        donations: s.donations.map(d => d.id === id ? { ...d, ...data } : d)
      })),
      removeDonation: (id) => set(s => ({
        donations: s.donations.filter(d => d.id !== id)
      })),

      // ── Custom subcategories (user-defined, any parent) ─────────────────────
      // Same pattern as donations but for any pillar/parent
      // { id, name, color, parentId, pillar, budgeted,
      //   bankChannel, bankPattern, createdAt }
      customSubcategories: [],
      addCustomSubcategory: (sub) => set(s => ({
        customSubcategories: [...s.customSubcategories, {
          ...sub, id: Date.now(), budgeted: sub.budgeted || 0,
          createdAt: new Date().toISOString(), isCustom: true,
        }]
      })),
      updateCustomSubcategory: (id, data) => set(s => ({
        customSubcategories: s.customSubcategories.map(c => c.id === id ? { ...c, ...data } : c)
      })),
      removeCustomSubcategory: (id) => set(s => ({
        customSubcategories: s.customSubcategories.filter(c => c.id !== id)
      })),

      // Donation payments
      donationPayments: [],
      addDonationPayment: (p) => {
        const id = Date.now()
        const date = p.date || new Date().toISOString()
        const payment = { ...p, id, date, source: p.source || 'manual' }
        const expense = p.amount > 0 ? {
          id: Date.now() + 3,
          description: p.note ? `${p.donationName} — ${p.note}` : p.donationName || 'Donación',
          amount: p.amount,
          categoryId: p.donationId, // uses donation's own ID as categoryId
          date, type: 'expense',
          member: p.member || '',
          autoFromPayment: id,
          source: p.source || 'manual',
          isDonation: true,
        } : null
        set(s => ({
          donationPayments: [...s.donationPayments, payment],
          expenses: expense ? [...s.expenses, expense] : s.expenses,
        }))
      },
      removeDonationPayment: (id) => {
        set(s => ({
          donationPayments: s.donationPayments.filter(p => p.id !== id),
          expenses: s.expenses.filter(e => e.autoFromPayment !== id),
        }))
      },

      getDonationPaid: (donationId, month) => {
        const m = month || get().getCurrentMonth()
        return get().donationPayments
          .filter(p => p.donationId === donationId && p.date?.startsWith(m))
          .reduce((s, p) => s + p.amount, 0)
      },

      // ── Computed helpers ──────────────────────────────────────────────────
      getCurrentMonth: () => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      },

      getMonthlyIncome: (month, computableOnly = false) => {
        const m = month || get().getCurrentMonth()
        return get().incomes
          .filter(i => i.date.startsWith(m) && (!computableOnly || i.computable !== false))
          .reduce((s, i) => s + i.amount, 0)
      },

      getMonthlyExpenses: (month) => {
        const m = month || get().getCurrentMonth()
        return get().expenses.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0)
      },

      // Diezmo: always 10%, never changes
      getTitheOwed: (month) => {
        // Only computable incomes count toward tithe
        const m = month || get().getCurrentMonth()
        const computableIncome = get().incomes
          .filter(i => i.date.startsWith(m) && i.computable !== false)
          .reduce((s, i) => s + i.amount, 0)
        return Math.round(computableIncome * 0.10 * 100) / 100
      },

      getTithePaid: (month) => {
        const m = month || get().getCurrentMonth()
        return get().tithePayments
          .filter(p => p.date?.startsWith(m))
          .reduce((s, p) => s + p.amount, 0)
      },

      // Ofrenda: suggested % or fixed override
      getFastOfferingOwed: (month) => {
        const income = get().getMonthlyIncome(month)
        const { fastOfferingFixed, fastOfferingPercent } = get()
        return fastOfferingFixed
          ? fastOfferingFixed
          : Math.round(income * (fastOfferingPercent / 100) * 100) / 100
      },

      getFastOfferingPaid: (month) => {
        const m = month || get().getCurrentMonth()
        return get().fastOfferingPayments
          .filter(p => p.date?.startsWith(m))
          .reduce((s, p) => s + p.amount, 0)
      },

      // Legacy alias (for backward compat with other pages)
      getFastOffering: () => {
        const income = get().getMonthlyIncome(get().getCurrentMonth())
        const { fastOfferingFixed, fastOfferingPercent } = get()
        return fastOfferingFixed
          ? fastOfferingFixed
          : Math.round(income * (fastOfferingPercent / 100) * 100) / 100
      },

      getCategoryExpenses: (categoryId, month) => {
        const m = month || get().getCurrentMonth()
        const isParent = categoryId < 100
        const customSubs = get().customSubcategories || []
        const dons = get().donations || []
        return get().expenses
          .filter(e => {
            if (!e.date.startsWith(m)) return false
            if (e.categoryId === categoryId) return true
            if (!isParent) return false
            const subId = e.categoryId
            // Custom subcategory belonging to this parent
            if (customSubs.some(c => c.id === subId && c.parentId === categoryId)) return true
            // Donation belonging to pilar 1
            if (categoryId === 1 && dons.some(d => d.id === subId)) return true
            if (subId < 100) return false
            // Built-in subcategory mapping
            const subParent =
              subId >= 1001 ? 10 :
              subId >= 901 ? (subId < 902 ? 8 : 9) :
              subId >= 801 ? 7 :
              subId >= 701 ? 21 :
              subId >= 601 ? 6 :
              subId >= 501 ? 5 :
              subId >= 401 ? 4 :
              subId >= 301 ? 3 :
              subId >= 204 ? 20 :
              subId >= 201 ? 2 :
              subId >= 111 ? 11 :
              subId >= 101 ? 1 : null
            return subParent === categoryId
          })
          .reduce((s, e) => s + e.amount, 0)
      },
    }),
    {
      name: 'finanzas-familia-store',
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          document.documentElement.setAttribute('data-theme', state.theme)
        }
        // Migration: ensure new categories exist
        if (state?.budgetCategories) {
          const ids = state.budgetCategories.map(c => c.id)
          const additions = []
          if (!ids.includes(11)) additions.push({ id: 11, name: 'Ofrenda de ayuno', color: '#f5c842', budgeted: 0, pillar: 1, locked: false })
          if (!ids.includes(20)) additions.push({ id: 20, name: 'Suministros',      color: '#2d8bbf', budgeted: 0, pillar: 2, locked: false })
          if (!ids.includes(21)) additions.push({ id: 21, name: 'Suscripciones',    color: '#7c5cbf', budgeted: 0, pillar: 2, locked: false })
          if (additions.length > 0) {
            const order = [1,11,2,20,3,4,5,6,21,7,8,9,10]
            state.budgetCategories = [...state.budgetCategories.filter(c=>c.id!==1), 
              { ...(state.budgetCategories.find(c=>c.id===1) || {}), id:1, name:'Diezmo', color:'#e6ad3c', pillar:1, locked:true },
              ...additions
            ].sort((a,b) => order.indexOf(a.id) - order.indexOf(b.id))
          }
        }
      }
    }
  )
)

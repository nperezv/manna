import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/client'
import { getCurrentMonth } from '../utils/helpers'

// ── useApi — generic hook for any API call ─────────────────────
export function useApi(apiFn, deps = []) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const result = await apiFn()
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

// ── useDashboard ───────────────────────────────────────────────
export function useDashboard(month) {
  const m = month || getCurrentMonth()
  const { data, loading, error, refetch } = useApi(
    () => api.dashboard.get(m), [m]
  )
  return { dashboard: data, loading, error, refetch }
}

// ── useExpenses ────────────────────────────────────────────────
export function useExpenses(month) {
  const m = month || getCurrentMonth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.expenses.list({ month: m })
      setExpenses(data)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [m])

  useEffect(() => { load() }, [load])

  const addExpense = async (expense) => {
    const created = await api.expenses.create(expense)
    setExpenses(prev => [created, ...prev])
    return created
  }

  const updateExpense = async (id, data) => {
    const updated = await api.expenses.update(id, data)
    setExpenses(prev => prev.map(e => e.id === id ? updated : e))
    return updated
  }

  const deleteExpense = async (id) => {
    await api.expenses.delete(id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  return { expenses, loading, error, refetch: load, addExpense, updateExpense, deleteExpense }
}

// ── useIncomes ─────────────────────────────────────────────────
export function useIncomes(month) {
  const m = month || getCurrentMonth()
  const [incomes, setIncomes] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.incomes.list(m)
      setIncomes(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [m])

  useEffect(() => { load() }, [load])

  const addIncome = async (income) => {
    const created = await api.incomes.create(income)
    setIncomes(prev => [created, ...prev])
    return created
  }

  const deleteIncome = async (id) => {
    await api.incomes.delete(id)
    setIncomes(prev => prev.filter(i => i.id !== id))
  }

  return { incomes, loading, refetch: load, addIncome, deleteIncome }
}

// ── useTithe ───────────────────────────────────────────────────
export function useTithe(month) {
  const m = month || getCurrentMonth()
  const [titheData, setTitheData] = useState(null)
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.tithe.get(m)
      setTitheData(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [m])

  useEffect(() => { load() }, [load])

  const pay = async (payment) => {
    const result = await api.tithe.pay(payment)
    await load() // refetch to get updated totals
    return result
  }

  return { titheData, loading, refetch: load, pay }
}

// ── useBudget ──────────────────────────────────────────────────
export function useBudget(month) {
  const m = month || getCurrentMonth()
  const [budget, setBudget] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const data = await api.budget.get(m)
      setBudget(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [m])

  useEffect(() => { load() }, [load])

  const setCategory = async (categoryId, budgeted) => {
    // Optimistic update — update local state immediately, no flicker
    setBudget(prev => {
      if (!prev) return prev
      const existing = prev.budgetCategories.find(b => b.category_id === categoryId)
      const updated = existing
        ? prev.budgetCategories.map(b => b.category_id === categoryId ? { ...b, budgeted } : b)
        : [...prev.budgetCategories, { category_id: categoryId, budgeted }]
      return { ...prev, budgetCategories: updated }
    })
    await api.budget.setCategory({ category_id: categoryId, budgeted, month: m })
    load(false) // sync silently
  }

  const setSubcategory = async (subcategoryId, budgeted) => {
    // Optimistic update
    setBudget(prev => {
      if (!prev) return prev
      const existing = prev.subcategoryBudgets.find(b => b.subcategory_id === subcategoryId)
      const updated = existing
        ? prev.subcategoryBudgets.map(b => b.subcategory_id === subcategoryId ? { ...b, budgeted } : b)
        : [...prev.subcategoryBudgets, { subcategory_id: subcategoryId, budgeted }]
      return { ...prev, subcategoryBudgets: updated }
    })
    await api.budget.setSubcategory({ subcategory_id: subcategoryId, budgeted, month: m })
    load(false) // sync silently
  }

  return { budget, loading, refetch: load, setCategory, setSubcategory }
}

// ── useDebts ───────────────────────────────────────────────────
export function useDebts() {
  const [debts, setDebts]     = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.debts.list()
      setDebts(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const addDebt    = async (debt)        => { const d = await api.debts.create(debt);        setDebts(p => [...p, d]); return d }
  const updateDebt = async (id, data)    => { const d = await api.debts.update(id, data);    setDebts(p => p.map(x => x.id === id ? d : x)); return d }
  const deleteDebt = async (id)          => { await api.debts.delete(id);                    setDebts(p => p.filter(x => x.id !== id)) }
  const payDebt    = async (id, amount)  => { const d = await api.debts.payment(id, { amount }); setDebts(p => p.map(x => x.id === id ? d : x)); return d }

  return { debts, loading, refetch: load, addDebt, updateDebt, deleteDebt, payDebt }
}

// ── useSavings ─────────────────────────────────────────────────
export function useSavings() {
  const [goals, setGoals]     = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.savings.list()
      setGoals(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const addGoal    = async (g)        => { const d = await api.savings.create(g);        setGoals(p => [...p, d]); return d }
  const updateGoal = async (id, data) => { const d = await api.savings.update(id, data); setGoals(p => p.map(x => x.id === id ? d : x)); return d }
  const deleteGoal = async (id)       => { await api.savings.delete(id);                 setGoals(p => p.filter(x => x.id !== id)) }
  const addToGoal  = async (id, amt)  => { const d = await api.savings.add(id, { amount: amt }); setGoals(p => p.map(x => x.id === id ? d : x)); return d }

  return { goals, loading, refetch: load, addGoal, updateGoal, deleteGoal, addToGoal }
}

// ── useDonations ───────────────────────────────────────────────
export function useDonations() {
  const [donations, setDonations] = useState([])
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.donations.list()
      setDonations(data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const addDonation    = async (d)       => { const r = await api.donations.create(d);      setDonations(p => [...p, r]); return r }
  const deleteDonation = async (id)      => { await api.donations.delete(id);               setDonations(p => p.filter(x => x.id !== id)) }
  const payDonation    = async (id, b)   => { return api.donations.pay(id, b) }

  return { donations, loading, refetch: load, addDonation, deleteDonation, payDonation }
}

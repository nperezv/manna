const express = require('express')
const { authenticate } = require('../middleware/auth')

const authCtrl        = require('../controllers/auth.controller')
const familyCtrl      = require('../controllers/family.controller')
const expensesCtrl    = require('../controllers/expenses.controller')
const incomesCtrl     = require('../controllers/incomes.controller')
const titheCtrl       = require('../controllers/tithe.controller')
const budgetCtrl      = require('../controllers/budget.controller')
const budgetSuggestCtrl = require('../controllers/budget.suggestion.controller')
const debtsCtrl       = require('../controllers/debts.controller')
const savingsCtrl     = require('../controllers/savings.controller')
const dashboardCtrl   = require('../controllers/dashboard.controller')
const donationsCtrl   = require('../controllers/donations.controller')
const invitationsCtrl = require('../controllers/invitations.controller')
const profileCtrl     = require('../controllers/profile.controller')

const router = express.Router()

// ── Public routes (no auth) ───────────────────────────────────
router.post('/auth/register', authCtrl.register)
router.post('/auth/login',    authCtrl.login)
router.post('/auth/refresh',  authCtrl.refresh)
router.post('/auth/logout',   authCtrl.logout)

// Invitations — public
router.get('/invitations/check',   invitationsCtrl.checkToken)
router.post('/invitations/accept', invitationsCtrl.accept)

// ── Protected routes ──────────────────────────────────────────
router.use(authenticate)

// Dashboard
router.get('/dashboard',         dashboardCtrl.getDashboard)
router.get('/dashboard/history', dashboardCtrl.getDashboardHistory)

// Family
router.get('/family',         familyCtrl.getFamily)
router.patch('/family',       familyCtrl.updateFamily)
router.post('/family/invite', familyCtrl.inviteMember)

// Incomes
router.get('/incomes',         incomesCtrl.getIncomes)
router.get('/incomes/summary', incomesCtrl.getSummary)
router.post('/incomes',        incomesCtrl.createIncome)
router.delete('/incomes/:id',  incomesCtrl.deleteIncome)

// Expenses
router.get('/expenses',        expensesCtrl.getExpenses)
router.post('/expenses',       expensesCtrl.createExpense)
router.patch('/expenses/:id',  expensesCtrl.updateExpense)
router.delete('/expenses/:id', expensesCtrl.deleteExpense)

// Tithe
router.get('/tithe',         titheCtrl.getTitheData)
router.get('/tithe/history', titheCtrl.getTitheHistory)
router.post('/tithe/pay',  titheCtrl.registerPayment)

// Budget
router.get('/budget',             budgetCtrl.getBudget)
router.put('/budget/category',    budgetCtrl.upsertBudgetCategory)
router.put('/budget/subcategory',       budgetCtrl.upsertSubcategoryBudget)
router.get('/budget/custom-subs',       budgetCtrl.getCustomSubs)
router.post('/budget/custom-subs',      budgetCtrl.createCustomSub)
router.patch('/budget/custom-subs/:id', budgetCtrl.updateCustomSub)
router.delete('/budget/custom-subs/:id',budgetCtrl.deleteCustomSub)
router.get('/budget/renamed-subs',      budgetCtrl.getRenamedSubs)
router.patch('/budget/renamed-subs',    budgetCtrl.updateRenamedSub)
router.get('/budget/suggest',      budgetSuggestCtrl.getBudgetSuggestion)
router.post('/budget/copy',        budgetSuggestCtrl.copyBudget)

// Debts
router.get('/debts',               debtsCtrl.getDebts)
router.post('/debts',              debtsCtrl.createDebt)
router.patch('/debts/:id',         debtsCtrl.updateDebt)
router.delete('/debts/:id',        debtsCtrl.deleteDebt)
router.post('/debts/:id/payment',  debtsCtrl.makePayment)

// Savings
router.get('/savings',          savingsCtrl.getSavings)
router.post('/savings',         savingsCtrl.createGoal)
router.patch('/savings/:id',    savingsCtrl.updateGoal)
router.delete('/savings/:id',   savingsCtrl.deleteGoal)
router.post('/savings/:id/add', savingsCtrl.addToGoal)

// Donations
router.get('/donations',          donationsCtrl.getDonations)
router.post('/donations',         donationsCtrl.createDonation)
router.delete('/donations/:id',   donationsCtrl.deleteDonation)
router.post('/donations/:id/pay', donationsCtrl.payDonation)

// Profile
router.patch('/profile',          profileCtrl.updateProfile)
router.post('/profile/password',  profileCtrl.changePassword)

// Invitations — protected
router.get('/invitations',         invitationsCtrl.list)
router.post('/invitations',        invitationsCtrl.invite)
router.delete('/invitations/:id',  invitationsCtrl.cancel)

module.exports = router

// Test email — admin only, dev only
router.post('/test-email', async (req, res) => {
  if (process.env.NODE_ENV !== 'development') return res.status(404).end()
  const { sendInvitation } = require('../utils/email')
  try {
    await sendInvitation({
      to: req.body.to || req.user?.email,
      name: req.body.name || 'Test',
      familyName: 'Test',
      invitedBy: 'Manna Dev',
      token: 'test-token-123',
    })
    return res.json({ ok: true, message: 'Email sent' })
  } catch(err) {
    return res.status(500).json({ error: err.message })
  }
})
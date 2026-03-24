-- ============================================================
-- Manna DB Schema — generado desde schema_actual.sql
-- Versión: producción VPS
-- Uso: psql -U manna_user -d manna_db -f schema_final.sql
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at() RETURNS trigger
  LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ── FAMILIES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.families (
  id                    uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  name                  varchar(100) NOT NULL,
  tithe_percent         numeric(5,2)  DEFAULT 10.00,
  fast_offering_percent numeric(5,2)  DEFAULT 2.00,
  fast_offering_fixed   numeric(10,2),
  church_bank_reference varchar(50),
  church_bank_name      varchar(100)  DEFAULT 'IGLESIA JESUCRISTO',
  currency              varchar(3)    DEFAULT 'EUR',
  month_start_day       integer       DEFAULT 1 CHECK (month_start_day BETWEEN 1 AND 28),
  created_at            timestamptz   DEFAULT now(),
  updated_at            timestamptz   DEFAULT now()
);
CREATE TRIGGER trg_families_updated
  BEFORE UPDATE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  family_id     uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name          varchar(100) NOT NULL,
  email         varchar(255) NOT NULL UNIQUE,
  password_hash varchar(255) NOT NULL,
  role          varchar(20)  DEFAULT 'member' CHECK (role IN ('admin','member')),
  avatar_color  varchar(7)   DEFAULT '#4a9fd4',
  phone         varchar(30),
  active        boolean      DEFAULT true,
  created_at    timestamptz  DEFAULT now(),
  updated_at    timestamptz  DEFAULT now(),
  CONSTRAINT users_role_check CHECK (role IN ('admin','member'))
);
CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── REFRESH TOKENS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id         uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token      varchar(500) NOT NULL UNIQUE,
  expires_at timestamptz  NOT NULL,
  created_at timestamptz  DEFAULT now()
);

-- ── INVITATIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invitations (
  id         uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  family_id  uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  email      varchar(255) NOT NULL,
  name       varchar(100),
  token      varchar(100) NOT NULL,
  invited_by uuid REFERENCES public.users(id),
  status     varchar(20)  DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired')),
  expires_at timestamptz  NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_at timestamptz  DEFAULT now()
);

-- ── INCOMES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.incomes (
  id          uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  family_id   uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.users(id),
  source      varchar(200) NOT NULL,
  category    varchar(50)  DEFAULT 'salary',
  amount      numeric(10,2) NOT NULL,
  computable  boolean      DEFAULT true,
  date        date         NOT NULL,
  description varchar(500),
  member_name varchar(100),
  bank_tx_id  varchar(200),
  verified    boolean      DEFAULT false,
  created_at  timestamptz  DEFAULT now()
);

-- ── RECURRING INCOMES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recurring_incomes (
  id               uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  family_id        uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id          uuid REFERENCES public.users(id),
  name             varchar(100) NOT NULL,
  category         varchar(50)  DEFAULT 'salary',
  estimated_amount numeric(10,2),
  day_of_month     integer CHECK (day_of_month BETWEEN 1 AND 31),
  computable       boolean  DEFAULT true,
  bank_pattern     varchar(200),
  active           boolean  DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

-- ── EXPENSES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id                uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  family_id         uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES public.users(id),
  description       varchar(200) NOT NULL,
  amount            numeric(10,2) NOT NULL,
  category_id       integer NOT NULL,
  date              date    NOT NULL,
  member_name       varchar(100),
  bank_tx_id        varchar(200),
  auto_from_payment uuid,
  is_donation       boolean DEFAULT false,
  source            varchar(20) DEFAULT 'manual',
  created_at        timestamptz DEFAULT now()
);

-- ── TITHE PAYMENTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tithe_payments (
  id           uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  family_id    uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES public.users(id),
  amount       numeric(10,2) NOT NULL,
  note         varchar(500),
  receipt_data text,
  receipt_name varchar(200),
  date         date NOT NULL,
  source       varchar(20) DEFAULT 'manual',
  bank_tx_id   varchar(200),
  created_at   timestamptz DEFAULT now()
);

-- ── FAST OFFERING PAYMENTS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fast_offering_payments (
  id           uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  family_id    uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES public.users(id),
  amount       numeric(10,2) NOT NULL,
  note         varchar(500),
  receipt_data text,
  receipt_name varchar(200),
  date         date NOT NULL,
  source       varchar(20) DEFAULT 'manual',
  bank_tx_id   varchar(200),
  created_at   timestamptz DEFAULT now()
);

-- ── BUDGET CATEGORIES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.budget_categories (
  id          serial PRIMARY KEY,
  family_id   uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  category_id integer NOT NULL,
  budgeted    numeric(10,2) DEFAULT 0,
  month       varchar(7) NOT NULL,
  UNIQUE(family_id, category_id, month)
);

-- ── SUBCATEGORY BUDGETS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subcategory_budgets (
  id             serial PRIMARY KEY,
  family_id      uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  subcategory_id integer NOT NULL,
  budgeted       numeric(10,2) DEFAULT 0,
  month          varchar(7) NOT NULL,
  UNIQUE(family_id, subcategory_id, month)
);

-- ── CUSTOM SUBCATEGORIES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.custom_subcategories (
  id           uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  family_id    uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name         varchar(100) NOT NULL,
  color        varchar(7)   DEFAULT '#4a9fd4',
  parent_id    integer NOT NULL,
  pillar       integer NOT NULL,
  bank_channel varchar(20)  DEFAULT 'manual',
  bank_pattern varchar(200),
  budgeted     numeric(10,2) DEFAULT 0,
  created_at   timestamptz  DEFAULT now()
);

-- ── CATEGORIZATION RULES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categorization_rules (
  id          uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  family_id   uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  pattern     varchar(200) NOT NULL,
  category_id integer NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- ── DEBTS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.debts (
  id              uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  family_id       uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name            varchar(100) NOT NULL,
  total_amount    numeric(10,2) NOT NULL,
  remaining       numeric(10,2) NOT NULL,
  monthly_payment numeric(10,2),
  interest_rate   numeric(5,2),
  type            varchar(20) DEFAULT 'other',
  active          boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);

-- ── SAVINGS GOALS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id         uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  family_id  uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name       varchar(100) NOT NULL,
  target     numeric(10,2) NOT NULL,
  saved      numeric(10,2) DEFAULT 0,
  deadline   date,
  color      varchar(7) DEFAULT '#2d9b8a',
  created_at timestamptz DEFAULT now()
);

-- ── DONATIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.donations (
  id           uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  family_id    uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  name         varchar(100) NOT NULL,
  color        varchar(7)   DEFAULT '#e05c9e',
  bank_channel varchar(20)  DEFAULT 'manual',
  bank_pattern varchar(200),
  budgeted     numeric(10,2) DEFAULT 0,
  active       boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

-- ── DONATION PAYMENTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.donation_payments (
  id          uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  family_id   uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  donation_id uuid NOT NULL REFERENCES public.donations(id) ON DELETE CASCADE,
  amount      numeric(10,2) NOT NULL,
  note        varchar(500),
  date        date NOT NULL,
  source      varchar(20) DEFAULT 'manual',
  bank_tx_id  varchar(200),
  created_at  timestamptz DEFAULT now()
);

-- ── BANK CONNECTIONS (preparado para Fase 2) ─────────────────
CREATE TABLE IF NOT EXISTS public.bank_connections (
  id               uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  family_id        uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES public.users(id),
  provider         varchar(20)  DEFAULT 'nordigen',
  institution_id   varchar(100),
  institution_name varchar(100),
  requisition_id   varchar(200),
  access_token     text,
  refresh_token    text,
  token_expires    timestamptz,
  status           varchar(20) DEFAULT 'pending',
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);
CREATE TRIGGER trg_bank_connections_updated
  BEFORE UPDATE ON public.bank_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── BANK ACCOUNTS (preparado para Fase 2) ────────────────────
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id            uuid DEFAULT public.uuid_generate_v4() PRIMARY KEY,
  connection_id uuid NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  family_id     uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES public.users(id),
  account_id    varchar(200) NOT NULL,
  iban          varchar(34),
  name          varchar(100),
  currency      varchar(3)   DEFAULT 'EUR',
  balance       numeric(10,2),
  last_synced   timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- ── INDEXES ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_expenses_family_date   ON public.expenses(family_id, date);
CREATE INDEX IF NOT EXISTS idx_incomes_family_date    ON public.incomes(family_id, date);
CREATE INDEX IF NOT EXISTS idx_tithe_family_date      ON public.tithe_payments(family_id, date);
CREATE INDEX IF NOT EXISTS idx_fast_family_date       ON public.fast_offering_payments(family_id, date);
CREATE INDEX IF NOT EXISTS idx_budget_family_month    ON public.budget_categories(family_id, month);
CREATE INDEX IF NOT EXISTS idx_subbudget_family_month ON public.subcategory_budgets(family_id, month);
CREATE INDEX IF NOT EXISTS idx_refresh_token          ON public.refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invitations_token      ON public.invitations(token);
CREATE INDEX IF NOT EXISTS idx_users_email            ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_family           ON public.users(family_id);

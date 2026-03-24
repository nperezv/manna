--
-- PostgreSQL database dump
--

\restrict uQk8YC2yB5BKEyAAgfBrk0Y6Nz8AffWInO7dmQ2osHlpUJfx4KZ61VOEyIyayTb

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;


ALTER FUNCTION public.update_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_accounts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    connection_id uuid NOT NULL,
    family_id uuid NOT NULL,
    user_id uuid,
    account_id character varying(200) NOT NULL,
    iban character varying(34),
    name character varying(100),
    currency character varying(3) DEFAULT 'EUR'::character varying,
    balance numeric(10,2),
    last_synced timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.bank_accounts OWNER TO postgres;

--
-- Name: bank_connections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bank_connections (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    family_id uuid NOT NULL,
    user_id uuid NOT NULL,
    provider character varying(20) DEFAULT 'nordigen'::character varying,
    institution_id character varying(100),
    institution_name character varying(100),
    requisition_id character varying(200),
    access_token text,
    refresh_token text,
    token_expires timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.bank_connections OWNER TO postgres;

--
-- Name: budget_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.budget_categories (
    id integer NOT NULL,
    family_id uuid NOT NULL,
    category_id integer NOT NULL,
    budgeted numeric(10,2) DEFAULT 0,
    month character varying(7) NOT NULL
);


ALTER TABLE public.budget_categories OWNER TO postgres;

--
-- Name: budget_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.budget_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.budget_categories_id_seq OWNER TO postgres;

--
-- Name: budget_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.budget_categories_id_seq OWNED BY public.budget_categories.id;


--
-- Name: categorization_rules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categorization_rules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    family_id uuid NOT NULL,
    pattern character varying(200) NOT NULL,
    category_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.categorization_rules OWNER TO postgres;

--
-- Name: custom_subcategories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.custom_subcategories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    family_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(7) DEFAULT '#4a9fd4'::character varying,
    parent_id integer NOT NULL,
    pillar integer NOT NULL,
    bank_channel character varying(20) DEFAULT 'manual'::character varying,
    bank_pattern character varying(200),
    budgeted numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.custom_subcategories OWNER TO postgres;

--
-- Name: debts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.debts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    family_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    total_amount numeric(10,2) NOT NULL,
    remaining numeric(10,2) NOT NULL,
    monthly_payment numeric(10,2),
    interest_rate numeric(5,2),
    type character varying(20) DEFAULT 'other'::character varying,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.debts OWNER TO postgres;

--
-- Name: donation_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.donation_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    family_id uuid NOT NULL,
    donation_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    note character varying(500),
    date date NOT NULL,
    source character varying(20) DEFAULT 'manual'::character varying,
    bank_tx_id character varying(200),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.donation_payments OWNER TO postgres;

--
-- Name: donations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.donations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    family_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(7) DEFAULT '#e05c9e'::character varying,
    bank_channel character varying(20) DEFAULT 'manual'::character varying,
    bank_pattern character varying(200),
    budgeted numeric(10,2) DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.donations OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    family_id uuid NOT NULL,
    user_id uuid,
    description character varying(200) NOT NULL,
    amount numeric(10,2) NOT NULL,
    category_id integer NOT NULL,
    date date NOT NULL,
    member_name character varying(100),
    bank_tx_id character varying(200),
    auto_from_payment uuid,
    is_donation boolean DEFAULT false,
    source character varying(20) DEFAULT 'manual'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: families; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.families (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    tithe_percent numeric(5,2) DEFAULT 10.00,
    fast_offering_percent numeric(5,2) DEFAULT 2.00,
    fast_offering_fixed numeric(10,2),
    church_bank_reference character varying(50),
    church_bank_name character varying(100) DEFAULT 'IGLESIA JESUCRISTO'::character varying,
    currency character varying(3) DEFAULT 'EUR'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    month_start_day integer DEFAULT 1,
    CONSTRAINT families_month_start_day_check CHECK (((month_start_day >= 1) AND (month_start_day <= 28)))
);


ALTER TABLE public.families OWNER TO postgres;

--
-- Name: fast_offering_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fast_offering_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    family_id uuid NOT NULL,
    user_id uuid,
    amount numeric(10,2) NOT NULL,
    note character varying(500),
    receipt_data text,
    receipt_name character varying(200),
    date date NOT NULL,
    source character varying(20) DEFAULT 'manual'::character varying,
    bank_tx_id character varying(200),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.fast_offering_payments OWNER TO postgres;

--
-- Name: incomes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.incomes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    family_id uuid NOT NULL,
    user_id uuid,
    source character varying(200) NOT NULL,
    category character varying(50) DEFAULT 'salary'::character varying,
    amount numeric(10,2) NOT NULL,
    computable boolean DEFAULT true,
    date date NOT NULL,
    description character varying(500),
    member_name character varying(100),
    bank_tx_id character varying(200),
    verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.incomes OWNER TO postgres;

--
-- Name: invitations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invitations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    family_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    token character varying(100) NOT NULL,
    invited_by uuid,
    status character varying(20) DEFAULT 'pending'::character varying,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    name character varying(100),
    CONSTRAINT invitations_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'expired'::character varying])::text[])))
);


ALTER TABLE public.invitations OWNER TO postgres;

--
-- Name: recurring_incomes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recurring_incomes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    family_id uuid NOT NULL,
    user_id uuid,
    name character varying(100) NOT NULL,
    category character varying(50) DEFAULT 'salary'::character varying,
    estimated_amount numeric(10,2),
    day_of_month integer,
    computable boolean DEFAULT true,
    bank_pattern character varying(200),
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT recurring_incomes_day_of_month_check CHECK (((day_of_month >= 1) AND (day_of_month <= 31)))
);


ALTER TABLE public.recurring_incomes OWNER TO postgres;

--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    token character varying(500) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: savings_goals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.savings_goals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    family_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    target numeric(10,2) NOT NULL,
    saved numeric(10,2) DEFAULT 0,
    deadline date,
    color character varying(7) DEFAULT '#2d9b8a'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.savings_goals OWNER TO postgres;

--
-- Name: subcategory_budgets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subcategory_budgets (
    id integer NOT NULL,
    family_id uuid NOT NULL,
    subcategory_id integer NOT NULL,
    budgeted numeric(10,2) DEFAULT 0,
    month character varying(7) NOT NULL
);


ALTER TABLE public.subcategory_budgets OWNER TO postgres;

--
-- Name: subcategory_budgets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subcategory_budgets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subcategory_budgets_id_seq OWNER TO postgres;

--
-- Name: subcategory_budgets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subcategory_budgets_id_seq OWNED BY public.subcategory_budgets.id;


--
-- Name: tithe_payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tithe_payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    family_id uuid NOT NULL,
    user_id uuid,
    amount numeric(10,2) NOT NULL,
    note character varying(500),
    receipt_data text,
    receipt_name character varying(200),
    date date NOT NULL,
    source character varying(20) DEFAULT 'manual'::character varying,
    bank_tx_id character varying(200),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tithe_payments OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    family_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying,
    avatar_color character varying(7) DEFAULT '#4a9fd4'::character varying,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'member'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: budget_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_categories ALTER COLUMN id SET DEFAULT nextval('public.budget_categories_id_seq'::regclass);


--
-- Name: subcategory_budgets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategory_budgets ALTER COLUMN id SET DEFAULT nextval('public.subcategory_budgets_id_seq'::regclass);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_connections bank_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_connections
    ADD CONSTRAINT bank_connections_pkey PRIMARY KEY (id);


--
-- Name: budget_categories budget_categories_family_id_category_id_month_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_categories
    ADD CONSTRAINT budget_categories_family_id_category_id_month_key UNIQUE (family_id, category_id, month);


--
-- Name: budget_categories budget_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_categories
    ADD CONSTRAINT budget_categories_pkey PRIMARY KEY (id);


--
-- Name: categorization_rules categorization_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorization_rules
    ADD CONSTRAINT categorization_rules_pkey PRIMARY KEY (id);


--
-- Name: custom_subcategories custom_subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_subcategories
    ADD CONSTRAINT custom_subcategories_pkey PRIMARY KEY (id);


--
-- Name: debts debts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debts
    ADD CONSTRAINT debts_pkey PRIMARY KEY (id);


--
-- Name: donation_payments donation_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.donation_payments
    ADD CONSTRAINT donation_payments_pkey PRIMARY KEY (id);


--
-- Name: donations donations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: families families_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.families
    ADD CONSTRAINT families_pkey PRIMARY KEY (id);


--
-- Name: fast_offering_payments fast_offering_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fast_offering_payments
    ADD CONSTRAINT fast_offering_payments_pkey PRIMARY KEY (id);


--
-- Name: incomes incomes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incomes
    ADD CONSTRAINT incomes_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_token_key UNIQUE (token);


--
-- Name: recurring_incomes recurring_incomes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_incomes
    ADD CONSTRAINT recurring_incomes_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_key UNIQUE (token);


--
-- Name: savings_goals savings_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.savings_goals
    ADD CONSTRAINT savings_goals_pkey PRIMARY KEY (id);


--
-- Name: subcategory_budgets subcategory_budgets_family_id_subcategory_id_month_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategory_budgets
    ADD CONSTRAINT subcategory_budgets_family_id_subcategory_id_month_key UNIQUE (family_id, subcategory_id, month);


--
-- Name: subcategory_budgets subcategory_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategory_budgets
    ADD CONSTRAINT subcategory_budgets_pkey PRIMARY KEY (id);


--
-- Name: tithe_payments tithe_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tithe_payments
    ADD CONSTRAINT tithe_payments_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_budget_family_month; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_budget_family_month ON public.budget_categories USING btree (family_id, month);


--
-- Name: idx_expenses_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_category ON public.expenses USING btree (family_id, category_id);


--
-- Name: idx_expenses_family_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_family_date ON public.expenses USING btree (family_id, date);


--
-- Name: idx_incomes_family_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_incomes_family_date ON public.incomes USING btree (family_id, date);


--
-- Name: idx_invitations_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invitations_email ON public.invitations USING btree (email);


--
-- Name: idx_invitations_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invitations_token ON public.invitations USING btree (token);


--
-- Name: idx_tithe_family_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tithe_family_date ON public.tithe_payments USING btree (family_id, date);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_family; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_family ON public.users USING btree (family_id);


--
-- Name: bank_connections trg_bank_connections_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_bank_connections_updated BEFORE UPDATE ON public.bank_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: families trg_families_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_families_updated BEFORE UPDATE ON public.families FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: users trg_users_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: bank_accounts bank_accounts_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.bank_connections(id) ON DELETE CASCADE;


--
-- Name: bank_accounts bank_accounts_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: bank_accounts bank_accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bank_connections bank_connections_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_connections
    ADD CONSTRAINT bank_connections_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: bank_connections bank_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bank_connections
    ADD CONSTRAINT bank_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: budget_categories budget_categories_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.budget_categories
    ADD CONSTRAINT budget_categories_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: categorization_rules categorization_rules_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categorization_rules
    ADD CONSTRAINT categorization_rules_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: custom_subcategories custom_subcategories_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.custom_subcategories
    ADD CONSTRAINT custom_subcategories_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: debts debts_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.debts
    ADD CONSTRAINT debts_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: donation_payments donation_payments_donation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.donation_payments
    ADD CONSTRAINT donation_payments_donation_id_fkey FOREIGN KEY (donation_id) REFERENCES public.donations(id) ON DELETE CASCADE;


--
-- Name: donation_payments donation_payments_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.donation_payments
    ADD CONSTRAINT donation_payments_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: donations donations_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.donations
    ADD CONSTRAINT donations_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: fast_offering_payments fast_offering_payments_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fast_offering_payments
    ADD CONSTRAINT fast_offering_payments_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: fast_offering_payments fast_offering_payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fast_offering_payments
    ADD CONSTRAINT fast_offering_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: incomes incomes_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incomes
    ADD CONSTRAINT incomes_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: incomes incomes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.incomes
    ADD CONSTRAINT incomes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: invitations invitations_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: invitations invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: recurring_incomes recurring_incomes_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_incomes
    ADD CONSTRAINT recurring_incomes_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: recurring_incomes recurring_incomes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recurring_incomes
    ADD CONSTRAINT recurring_incomes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: savings_goals savings_goals_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.savings_goals
    ADD CONSTRAINT savings_goals_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: subcategory_budgets subcategory_budgets_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategory_budgets
    ADD CONSTRAINT subcategory_budgets_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: tithe_payments tithe_payments_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tithe_payments
    ADD CONSTRAINT tithe_payments_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- Name: tithe_payments tithe_payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tithe_payments
    ADD CONSTRAINT tithe_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_family_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_family_id_fkey FOREIGN KEY (family_id) REFERENCES public.families(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict uQk8YC2yB5BKEyAAgfBrk0Y6Nz8AffWInO7dmQ2osHlpUJfx4KZ61VOEyIyayTb


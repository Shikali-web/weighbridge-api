--
-- PostgreSQL database dump
--

\restrict MXPKbTMstw69efucWcQbQlni4MhEmY79ZHfeF0AwJARHispArA7Csyl8O1USpzT

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

-- Started on 2026-03-27 10:49:54

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
-- TOC entry 258 (class 1255 OID 16846)
-- Name: compute_harvest_financials(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.compute_harvest_financials(p_assignment_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    r_assign        harvest_assignments%ROWTYPE;
    v_target        NUMERIC := (SELECT config_value FROM rate_config WHERE config_key = 'target_tons_per_cutter');
    v_fac_cutter    NUMERIC := (SELECT config_value FROM rate_config WHERE config_key = 'factory_pays_harvest_per_cutter');
    v_fac_ton       NUMERIC := (SELECT config_value FROM rate_config WHERE config_key = 'factory_pays_harvest_per_ton');
    v_sag_cutter    NUMERIC := (SELECT config_value FROM rate_config WHERE config_key = 'sagib_pays_cutter_per_ton');
    v_txn_cost      NUMERIC := (SELECT config_value FROM rate_config WHERE config_key = 'transaction_cost_per_ton');
    v_hm_pct        NUMERIC := (SELECT config_value FROM rate_config WHERE config_key = 'headman_commission_pct');
    v_hm_profit_pct NUMERIC := (SELECT config_value FROM rate_config WHERE config_key = 'headman_profit_share_pct');

    v_fac_rev_cut   NUMERIC;
    v_fac_rev_ton   NUMERIC;
    v_total_fac_rev NUMERIC;
    v_cutter_pay    NUMERIC;
    v_txn           NUMERIC;
    v_gross         NUMERIC;
    v_diff_val      NUMERIC;
    v_hm_comm       NUMERIC;
    v_sag_comm      NUMERIC;
    v_hm_harvest    NUMERIC;
    v_sag_net       NUMERIC;
BEGIN
    SELECT * INTO r_assign FROM harvest_assignments WHERE id = p_assignment_id;

    IF r_assign.actual_tonnage IS NULL THEN
        RAISE EXCEPTION 'actual_tonnage not recorded for assignment %', p_assignment_id;
    END IF;

    v_fac_rev_cut   := r_assign.turnup * v_fac_cutter;
    v_fac_rev_ton   := r_assign.actual_tonnage * v_fac_ton;
    v_total_fac_rev := v_fac_rev_cut + v_fac_rev_ton;
    v_cutter_pay    := r_assign.actual_tonnage * v_sag_cutter;
    v_txn           := r_assign.actual_tonnage * v_txn_cost;
    v_gross         := v_total_fac_rev - v_cutter_pay - v_txn;
    v_diff_val      := r_assign.tonnage_diff * v_sag_cutter;  -- value of diff at cutter rate
    v_hm_comm       := v_hm_pct * v_diff_val;                 -- positive = bonus, negative = penalty
    v_sag_comm      := (1 - v_hm_pct) * v_diff_val;
    v_hm_harvest    := (v_hm_profit_pct * v_gross) + v_hm_comm;
    v_sag_net       := v_gross - (v_hm_profit_pct * v_gross);

    INSERT INTO harvest_financials (
        assignment_id, week_number, year,
        factory_revenue_cutters, factory_revenue_tonnage, total_factory_revenue,
        cutter_payment, transaction_costs, gross_profit,
        diff_value, headman_commission, sagib_commission,
        headman_harvest_share, sagib_net_harvest
    ) VALUES (
        p_assignment_id, r_assign.week_number, r_assign.year,
        v_fac_rev_cut, v_fac_rev_ton, v_total_fac_rev,
        v_cutter_pay, v_txn, v_gross,
        v_diff_val, v_hm_comm, v_sag_comm,
        v_hm_harvest, v_sag_net
    )
    ON CONFLICT (assignment_id) DO UPDATE SET
        factory_revenue_cutters = EXCLUDED.factory_revenue_cutters,
        factory_revenue_tonnage = EXCLUDED.factory_revenue_tonnage,
        total_factory_revenue   = EXCLUDED.total_factory_revenue,
        cutter_payment          = EXCLUDED.cutter_payment,
        transaction_costs       = EXCLUDED.transaction_costs,
        gross_profit            = EXCLUDED.gross_profit,
        diff_value              = EXCLUDED.diff_value,
        headman_commission      = EXCLUDED.headman_commission,
        sagib_commission        = EXCLUDED.sagib_commission,
        headman_harvest_share   = EXCLUDED.headman_harvest_share,
        sagib_net_harvest       = EXCLUDED.sagib_net_harvest,
        computed_at             = NOW();
END;
$$;


ALTER FUNCTION public.compute_harvest_financials(p_assignment_id integer) OWNER TO postgres;

--
-- TOC entry 270 (class 1255 OID 16847)
-- Name: compute_loading_financials(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.compute_loading_financials(p_loading_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    r       loading_records%ROWTYPE;
    v_fac   NUMERIC := (SELECT config_value FROM rate_config WHERE config_key = 'factory_pays_loading_per_ton');
    v_ldr   NUMERIC := (SELECT config_value FROM rate_config WHERE config_key = 'sagib_pays_loader_per_ton');
    v_sup   NUMERIC := (SELECT config_value FROM rate_config WHERE config_key = 'supervisor_pay_per_trip');
    v_hm_p  NUMERIC := (SELECT config_value FROM rate_config WHERE config_key = 'headman_profit_share_pct');
    v_fac_rev   NUMERIC;
    v_ldr_pay   NUMERIC;
    v_sup_pay   NUMERIC;
    v_gross     NUMERIC;
    v_sag_net   NUMERIC;
BEGIN
    SELECT * INTO r FROM loading_records WHERE id = p_loading_id;

    v_fac_rev := r.tons_loaded * v_fac;
    v_ldr_pay := r.tons_loaded * v_ldr;
    v_sup_pay := r.trip_count  * v_sup;
    v_gross   := v_fac_rev - v_ldr_pay - v_sup_pay;
    v_sag_net := v_gross * (1 - v_hm_p);

    INSERT INTO loading_financials (
        loading_record_id, week_number, year,
        factory_revenue, loader_payment, supervisor_payment,
        gross_profit, sagib_net_loading
    ) VALUES (
        p_loading_id, r.week_number, r.year,
        v_fac_rev, v_ldr_pay, v_sup_pay, v_gross, v_sag_net
    )
    ON CONFLICT (loading_record_id) DO UPDATE SET
        factory_revenue    = EXCLUDED.factory_revenue,
        loader_payment     = EXCLUDED.loader_payment,
        supervisor_payment = EXCLUDED.supervisor_payment,
        gross_profit       = EXCLUDED.gross_profit,
        sagib_net_loading  = EXCLUDED.sagib_net_loading,
        computed_at        = NOW();
END;
$$;


ALTER FUNCTION public.compute_loading_financials(p_loading_id integer) OWNER TO postgres;

--
-- TOC entry 271 (class 1255 OID 16848)
-- Name: generate_weekly_headman_payroll(integer, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_weekly_headman_payroll(p_week integer, p_year integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_week_start DATE;
    v_week_end   DATE;
BEGIN
    v_week_start := DATE_TRUNC('week', (p_year::TEXT || '-W' || LPAD(p_week::TEXT,2,'0') || '-1')::DATE);
    v_week_end   := v_week_start + INTERVAL '6 days';

    INSERT INTO weekly_headman_payroll (
        headman_id, week_number, year, week_start, week_end,
        total_expected_tonnage, total_actual_tonnage, total_tonnage_diff,
        harvest_profit_share, harvest_commission, loading_profit_share,
        total_payable, penalty_amount, net_payable
    )
    SELECT
        ha.headman_id,
        p_week, p_year, v_week_start, v_week_end,
        COALESCE(SUM(ha.expected_tonnage), 0),
        COALESCE(SUM(ha.actual_tonnage), 0),
        COALESCE(SUM(ha.tonnage_diff), 0),
        COALESCE(SUM(hf.headman_harvest_share) FILTER (WHERE hf.headman_harvest_share > 0), 0),
        COALESCE(SUM(hf.headman_commission), 0),
        COALESCE(SUM(lf.gross_profit * 0.4), 0),
        COALESCE(SUM(hf.headman_harvest_share) FILTER (WHERE hf.headman_harvest_share > 0), 0)
            + COALESCE(SUM(lf.gross_profit * 0.4), 0),
        ABS(COALESCE(SUM(hf.headman_commission) FILTER (WHERE hf.headman_commission < 0), 0)),
        COALESCE(SUM(hf.headman_harvest_share), 0)
            + COALESCE(SUM(lf.gross_profit * 0.4), 0)
    FROM harvest_assignments ha
    LEFT JOIN harvest_financials hf ON hf.assignment_id = ha.id
    LEFT JOIN loading_records lr    ON lr.assignment_id  = ha.id
    LEFT JOIN loading_financials lf ON lf.loading_record_id = lr.id
    WHERE ha.week_number = p_week AND ha.year = p_year
    GROUP BY ha.headman_id
    ON CONFLICT (headman_id, week_number, year) DO UPDATE SET
        total_expected_tonnage = EXCLUDED.total_expected_tonnage,
        total_actual_tonnage   = EXCLUDED.total_actual_tonnage,
        total_tonnage_diff     = EXCLUDED.total_tonnage_diff,
        harvest_profit_share   = EXCLUDED.harvest_profit_share,
        harvest_commission     = EXCLUDED.harvest_commission,
        loading_profit_share   = EXCLUDED.loading_profit_share,
        total_payable          = EXCLUDED.total_payable,
        penalty_amount         = EXCLUDED.penalty_amount,
        net_payable            = EXCLUDED.net_payable,
        generated_at           = NOW();
END;
$$;


ALTER FUNCTION public.generate_weekly_headman_payroll(p_week integer, p_year integer) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 16402)
-- Name: distance_bands; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.distance_bands (
    id integer NOT NULL,
    band_code character(1) NOT NULL,
    min_km numeric(6,2) NOT NULL,
    max_km numeric(6,2) NOT NULL,
    transport_rate_per_ton numeric(10,2) NOT NULL,
    driver_rate_per_ton numeric(10,2) NOT NULL,
    sagib_retention_per_ton numeric(10,2) NOT NULL,
    CONSTRAINT chk_band_range CHECK ((max_km > min_km))
);


ALTER TABLE public.distance_bands OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16401)
-- Name: distance_bands_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.distance_bands_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.distance_bands_id_seq OWNER TO postgres;

--
-- TOC entry 5326 (class 0 OID 0)
-- Dependencies: 221
-- Name: distance_bands_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.distance_bands_id_seq OWNED BY public.distance_bands.id;


--
-- TOC entry 230 (class 1259 OID 16471)
-- Name: drivers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.drivers (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    license_no character varying(50),
    phone character varying(20),
    national_id character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.drivers OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16470)
-- Name: drivers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.drivers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.drivers_id_seq OWNER TO postgres;

--
-- TOC entry 5327 (class 0 OID 0)
-- Dependencies: 229
-- Name: drivers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.drivers_id_seq OWNED BY public.drivers.id;


--
-- TOC entry 236 (class 1259 OID 16537)
-- Name: harvest_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.harvest_assignments (
    id integer NOT NULL,
    headman_id integer NOT NULL,
    outgrower_id integer NOT NULL,
    assignment_date date NOT NULL,
    week_number integer NOT NULL,
    year integer NOT NULL,
    turnup integer NOT NULL,
    expected_tonnage numeric(12,3) NOT NULL,
    actual_tonnage numeric(12,3),
    tonnage_diff numeric(12,3) GENERATED ALWAYS AS ((actual_tonnage - expected_tonnage)) STORED,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT harvest_assignments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT harvest_assignments_turnup_check CHECK ((turnup > 0))
);


ALTER TABLE public.harvest_assignments OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16536)
-- Name: harvest_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.harvest_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.harvest_assignments_id_seq OWNER TO postgres;

--
-- TOC entry 5328 (class 0 OID 0)
-- Dependencies: 235
-- Name: harvest_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.harvest_assignments_id_seq OWNED BY public.harvest_assignments.id;


--
-- TOC entry 238 (class 1259 OID 16571)
-- Name: harvest_financials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.harvest_financials (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    week_number integer NOT NULL,
    year integer NOT NULL,
    factory_revenue_cutters numeric(12,2),
    factory_revenue_tonnage numeric(12,2),
    total_factory_revenue numeric(12,2),
    cutter_payment numeric(12,2),
    transaction_costs numeric(12,2),
    gross_profit numeric(12,2),
    diff_value numeric(12,2),
    headman_commission numeric(12,2),
    sagib_commission numeric(12,2),
    headman_harvest_share numeric(12,2),
    sagib_net_harvest numeric(12,2),
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.harvest_financials OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16570)
-- Name: harvest_financials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.harvest_financials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.harvest_financials_id_seq OWNER TO postgres;

--
-- TOC entry 5329 (class 0 OID 0)
-- Dependencies: 237
-- Name: harvest_financials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.harvest_financials_id_seq OWNED BY public.harvest_financials.id;


--
-- TOC entry 228 (class 1259 OID 16450)
-- Name: headmen; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.headmen (
    id integer NOT NULL,
    supervisor_id integer NOT NULL,
    name character varying(150) NOT NULL,
    phone character varying(20),
    national_id character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.headmen OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16449)
-- Name: headmen_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.headmen_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.headmen_id_seq OWNER TO postgres;

--
-- TOC entry 5330 (class 0 OID 0)
-- Dependencies: 227
-- Name: headmen_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.headmen_id_seq OWNED BY public.headmen.id;


--
-- TOC entry 242 (class 1259 OID 16632)
-- Name: loading_financials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loading_financials (
    id integer NOT NULL,
    loading_record_id integer NOT NULL,
    week_number integer NOT NULL,
    year integer NOT NULL,
    factory_revenue numeric(12,2),
    loader_payment numeric(12,2),
    supervisor_payment numeric(12,2),
    gross_profit numeric(12,2),
    sagib_net_loading numeric(12,2),
    computed_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.loading_financials OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16631)
-- Name: loading_financials_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.loading_financials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.loading_financials_id_seq OWNER TO postgres;

--
-- TOC entry 5331 (class 0 OID 0)
-- Dependencies: 241
-- Name: loading_financials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.loading_financials_id_seq OWNED BY public.loading_financials.id;


--
-- TOC entry 240 (class 1259 OID 16591)
-- Name: loading_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loading_records (
    id integer NOT NULL,
    assignment_id integer NOT NULL,
    weighbridge_id integer NOT NULL,
    supervisor_id integer NOT NULL,
    load_date date NOT NULL,
    week_number integer NOT NULL,
    year integer NOT NULL,
    tons_loaded numeric(12,3) NOT NULL,
    trip_count integer DEFAULT 1 NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT loading_records_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT loading_records_tons_loaded_check CHECK ((tons_loaded > (0)::numeric)),
    CONSTRAINT loading_records_trip_count_check CHECK ((trip_count > 0))
);


ALTER TABLE public.loading_records OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16590)
-- Name: loading_records_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.loading_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.loading_records_id_seq OWNER TO postgres;

--
-- TOC entry 5332 (class 0 OID 0)
-- Dependencies: 239
-- Name: loading_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.loading_records_id_seq OWNED BY public.loading_records.id;


--
-- TOC entry 234 (class 1259 OID 16508)
-- Name: outgrowers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.outgrowers (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    field_code character varying(50),
    field_size_ha numeric(10,2),
    distance_band_id integer NOT NULL,
    weighbridge_id integer NOT NULL,
    location_notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.outgrowers OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16507)
-- Name: outgrowers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.outgrowers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.outgrowers_id_seq OWNER TO postgres;

--
-- TOC entry 5333 (class 0 OID 0)
-- Dependencies: 233
-- Name: outgrowers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.outgrowers_id_seq OWNED BY public.outgrowers.id;


--
-- TOC entry 224 (class 1259 OID 16419)
-- Name: rate_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rate_config (
    id integer NOT NULL,
    config_key character varying(100) NOT NULL,
    config_value numeric(10,4) NOT NULL,
    description text,
    effective_from date DEFAULT CURRENT_DATE NOT NULL
);


ALTER TABLE public.rate_config OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16418)
-- Name: rate_config_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rate_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rate_config_id_seq OWNER TO postgres;

--
-- TOC entry 5334 (class 0 OID 0)
-- Dependencies: 223
-- Name: rate_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rate_config_id_seq OWNED BY public.rate_config.id;


--
-- TOC entry 226 (class 1259 OID 16435)
-- Name: supervisors; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.supervisors (
    id integer NOT NULL,
    name character varying(150) NOT NULL,
    phone character varying(20),
    national_id character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.supervisors OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16434)
-- Name: supervisors_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.supervisors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.supervisors_id_seq OWNER TO postgres;

--
-- TOC entry 5335 (class 0 OID 0)
-- Dependencies: 225
-- Name: supervisors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.supervisors_id_seq OWNED BY public.supervisors.id;


--
-- TOC entry 244 (class 1259 OID 16652)
-- Name: transport_trips; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transport_trips (
    id integer NOT NULL,
    truck_id integer NOT NULL,
    driver_id integer NOT NULL,
    outgrower_id integer NOT NULL,
    weighbridge_id integer NOT NULL,
    distance_band_id integer NOT NULL,
    trip_date date NOT NULL,
    week_number integer NOT NULL,
    year integer NOT NULL,
    tons_transported numeric(12,3) NOT NULL,
    transport_rate numeric(10,2) NOT NULL,
    total_revenue numeric(12,2) NOT NULL,
    driver_payment numeric(12,2) NOT NULL,
    sagib_retention numeric(12,2) NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT transport_trips_tons_transported_check CHECK ((tons_transported > (0)::numeric))
);


ALTER TABLE public.transport_trips OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16651)
-- Name: transport_trips_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transport_trips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transport_trips_id_seq OWNER TO postgres;

--
-- TOC entry 5336 (class 0 OID 0)
-- Dependencies: 243
-- Name: transport_trips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transport_trips_id_seq OWNED BY public.transport_trips.id;


--
-- TOC entry 232 (class 1259 OID 16488)
-- Name: trucks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.trucks (
    id integer NOT NULL,
    plate_no character varying(20) NOT NULL,
    model character varying(100),
    capacity_tons numeric(8,2),
    driver_id integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.trucks OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16487)
-- Name: trucks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.trucks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.trucks_id_seq OWNER TO postgres;

--
-- TOC entry 5337 (class 0 OID 0)
-- Dependencies: 231
-- Name: trucks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.trucks_id_seq OWNED BY public.trucks.id;


--
-- TOC entry 256 (class 1259 OID 16837)
-- Name: v_daily_returns; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_daily_returns AS
 SELECT day_date,
    sum(harvest_revenue) AS harvest_revenue,
    sum(loading_revenue) AS loading_revenue,
    sum(transport_revenue) AS transport_revenue,
    sum(((harvest_revenue + loading_revenue) + transport_revenue)) AS total_revenue
   FROM ( SELECT (hf.computed_at)::date AS day_date,
            hf.total_factory_revenue AS harvest_revenue,
            0 AS loading_revenue,
            0 AS transport_revenue
           FROM public.harvest_financials hf
        UNION ALL
         SELECT (lf.computed_at)::date AS day_date,
            0,
            lf.factory_revenue AS loading_revenue,
            0
           FROM public.loading_financials lf
        UNION ALL
         SELECT tt.trip_date AS day_date,
            0,
            0,
            tt.total_revenue AS transport_revenue
           FROM public.transport_trips tt) sub
  GROUP BY day_date
  ORDER BY day_date DESC;


ALTER VIEW public.v_daily_returns OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 16763)
-- Name: weekly_driver_payroll; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weekly_driver_payroll (
    id integer NOT NULL,
    driver_id integer NOT NULL,
    week_number integer NOT NULL,
    year integer NOT NULL,
    week_start date NOT NULL,
    week_end date NOT NULL,
    total_trips integer DEFAULT 0,
    total_tons numeric(14,3) DEFAULT 0,
    total_payable numeric(12,2) DEFAULT 0,
    is_paid boolean DEFAULT false NOT NULL,
    paid_date date,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.weekly_driver_payroll OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 16832)
-- Name: v_driver_weekly_performance; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_driver_weekly_performance AS
 SELECT d.id AS driver_id,
    d.name AS driver_name,
    t.plate_no AS truck,
    p.week_number,
    p.year,
    p.week_start,
    p.week_end,
    p.total_trips,
    p.total_tons,
    p.total_payable AS weekly_pay,
    p.is_paid
   FROM ((public.weekly_driver_payroll p
     JOIN public.drivers d ON ((d.id = p.driver_id)))
     LEFT JOIN public.trucks t ON (((t.driver_id = d.id) AND (t.is_active = true))));


ALTER VIEW public.v_driver_weekly_performance OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 16703)
-- Name: weekly_headman_payroll; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weekly_headman_payroll (
    id integer NOT NULL,
    headman_id integer NOT NULL,
    week_number integer NOT NULL,
    year integer NOT NULL,
    week_start date NOT NULL,
    week_end date NOT NULL,
    total_expected_tonnage numeric(14,3) DEFAULT 0,
    total_actual_tonnage numeric(14,3) DEFAULT 0,
    total_tonnage_diff numeric(14,3) DEFAULT 0,
    harvest_profit_share numeric(12,2) DEFAULT 0,
    harvest_commission numeric(12,2) DEFAULT 0,
    loading_profit_share numeric(12,2) DEFAULT 0,
    total_payable numeric(12,2) DEFAULT 0,
    penalty_amount numeric(12,2) DEFAULT 0,
    net_payable numeric(12,2) DEFAULT 0,
    is_paid boolean DEFAULT false NOT NULL,
    paid_date date,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.weekly_headman_payroll OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 16822)
-- Name: v_headman_weekly_performance; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_headman_weekly_performance AS
 SELECT h.id AS headman_id,
    h.name AS headman_name,
    s.name AS supervisor_name,
    p.week_number,
    p.year,
    p.week_start,
    p.week_end,
    p.total_expected_tonnage,
    p.total_actual_tonnage,
    p.total_tonnage_diff,
        CASE
            WHEN (p.total_expected_tonnage > (0)::numeric) THEN round(((p.total_actual_tonnage / p.total_expected_tonnage) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS performance_pct,
    p.harvest_profit_share,
    p.harvest_commission,
    p.loading_profit_share,
    p.net_payable AS weekly_net_pay,
    p.is_paid
   FROM ((public.weekly_headman_payroll p
     JOIN public.headmen h ON ((h.id = p.headman_id)))
     JOIN public.supervisors s ON ((s.id = h.supervisor_id)));


ALTER VIEW public.v_headman_weekly_performance OWNER TO postgres;

--
-- TOC entry 252 (class 1259 OID 16790)
-- Name: weekly_company_summary; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weekly_company_summary (
    id integer NOT NULL,
    week_number integer NOT NULL,
    year integer NOT NULL,
    week_start date NOT NULL,
    week_end date NOT NULL,
    harvest_factory_revenue numeric(14,2) DEFAULT 0,
    harvest_cutter_cost numeric(14,2) DEFAULT 0,
    harvest_gross_profit numeric(14,2) DEFAULT 0,
    harvest_headman_share numeric(14,2) DEFAULT 0,
    harvest_sagib_net numeric(14,2) DEFAULT 0,
    loading_factory_revenue numeric(14,2) DEFAULT 0,
    loading_loader_cost numeric(14,2) DEFAULT 0,
    loading_supervisor_cost numeric(14,2) DEFAULT 0,
    loading_gross_profit numeric(14,2) DEFAULT 0,
    loading_headman_share numeric(14,2) DEFAULT 0,
    loading_sagib_net numeric(14,2) DEFAULT 0,
    transport_revenue numeric(14,2) DEFAULT 0,
    transport_driver_cost numeric(14,2) DEFAULT 0,
    transport_sagib_net numeric(14,2) DEFAULT 0,
    total_sagib_revenue numeric(14,2) DEFAULT 0,
    total_sagib_costs numeric(14,2) DEFAULT 0,
    total_sagib_net numeric(14,2) DEFAULT 0,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.weekly_company_summary OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 16842)
-- Name: v_sagib_weekly_returns; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_sagib_weekly_returns AS
 SELECT week_number,
    year,
    week_start,
    week_end,
    harvest_sagib_net,
    loading_sagib_net,
    transport_sagib_net,
    total_sagib_net
   FROM public.weekly_company_summary
  ORDER BY year DESC, week_number DESC;


ALTER VIEW public.v_sagib_weekly_returns OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 16736)
-- Name: weekly_supervisor_payroll; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weekly_supervisor_payroll (
    id integer NOT NULL,
    supervisor_id integer NOT NULL,
    week_number integer NOT NULL,
    year integer NOT NULL,
    week_start date NOT NULL,
    week_end date NOT NULL,
    total_trips integer DEFAULT 0,
    total_tons numeric(14,3) DEFAULT 0,
    total_payable numeric(12,2) DEFAULT 0,
    is_paid boolean DEFAULT false NOT NULL,
    paid_date date,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.weekly_supervisor_payroll OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 16827)
-- Name: v_supervisor_weekly_performance; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.v_supervisor_weekly_performance AS
 SELECT s.id AS supervisor_id,
    s.name AS supervisor_name,
    p.week_number,
    p.year,
    p.week_start,
    p.week_end,
    p.total_trips,
    p.total_tons,
    p.total_payable AS weekly_pay,
    p.is_paid
   FROM (public.weekly_supervisor_payroll p
     JOIN public.supervisors s ON ((s.id = p.supervisor_id)));


ALTER VIEW public.v_supervisor_weekly_performance OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 16789)
-- Name: weekly_company_summary_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.weekly_company_summary_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weekly_company_summary_id_seq OWNER TO postgres;

--
-- TOC entry 5338 (class 0 OID 0)
-- Dependencies: 251
-- Name: weekly_company_summary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.weekly_company_summary_id_seq OWNED BY public.weekly_company_summary.id;


--
-- TOC entry 249 (class 1259 OID 16762)
-- Name: weekly_driver_payroll_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.weekly_driver_payroll_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weekly_driver_payroll_id_seq OWNER TO postgres;

--
-- TOC entry 5339 (class 0 OID 0)
-- Dependencies: 249
-- Name: weekly_driver_payroll_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.weekly_driver_payroll_id_seq OWNED BY public.weekly_driver_payroll.id;


--
-- TOC entry 245 (class 1259 OID 16702)
-- Name: weekly_headman_payroll_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.weekly_headman_payroll_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weekly_headman_payroll_id_seq OWNER TO postgres;

--
-- TOC entry 5340 (class 0 OID 0)
-- Dependencies: 245
-- Name: weekly_headman_payroll_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.weekly_headman_payroll_id_seq OWNED BY public.weekly_headman_payroll.id;


--
-- TOC entry 247 (class 1259 OID 16735)
-- Name: weekly_supervisor_payroll_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.weekly_supervisor_payroll_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weekly_supervisor_payroll_id_seq OWNER TO postgres;

--
-- TOC entry 5341 (class 0 OID 0)
-- Dependencies: 247
-- Name: weekly_supervisor_payroll_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.weekly_supervisor_payroll_id_seq OWNED BY public.weekly_supervisor_payroll.id;


--
-- TOC entry 220 (class 1259 OID 16389)
-- Name: weighbridges; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.weighbridges (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    location character varying(200),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.weighbridges OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16388)
-- Name: weighbridges_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.weighbridges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.weighbridges_id_seq OWNER TO postgres;

--
-- TOC entry 5342 (class 0 OID 0)
-- Dependencies: 219
-- Name: weighbridges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.weighbridges_id_seq OWNED BY public.weighbridges.id;


--
-- TOC entry 4962 (class 2604 OID 16405)
-- Name: distance_bands id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distance_bands ALTER COLUMN id SET DEFAULT nextval('public.distance_bands_id_seq'::regclass);


--
-- TOC entry 4971 (class 2604 OID 16474)
-- Name: drivers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers ALTER COLUMN id SET DEFAULT nextval('public.drivers_id_seq'::regclass);


--
-- TOC entry 4980 (class 2604 OID 16540)
-- Name: harvest_assignments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.harvest_assignments ALTER COLUMN id SET DEFAULT nextval('public.harvest_assignments_id_seq'::regclass);


--
-- TOC entry 4984 (class 2604 OID 16574)
-- Name: harvest_financials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.harvest_financials ALTER COLUMN id SET DEFAULT nextval('public.harvest_financials_id_seq'::regclass);


--
-- TOC entry 4968 (class 2604 OID 16453)
-- Name: headmen id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.headmen ALTER COLUMN id SET DEFAULT nextval('public.headmen_id_seq'::regclass);


--
-- TOC entry 4990 (class 2604 OID 16635)
-- Name: loading_financials id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loading_financials ALTER COLUMN id SET DEFAULT nextval('public.loading_financials_id_seq'::regclass);


--
-- TOC entry 4986 (class 2604 OID 16594)
-- Name: loading_records id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loading_records ALTER COLUMN id SET DEFAULT nextval('public.loading_records_id_seq'::regclass);


--
-- TOC entry 4977 (class 2604 OID 16511)
-- Name: outgrowers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outgrowers ALTER COLUMN id SET DEFAULT nextval('public.outgrowers_id_seq'::regclass);


--
-- TOC entry 4963 (class 2604 OID 16422)
-- Name: rate_config id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rate_config ALTER COLUMN id SET DEFAULT nextval('public.rate_config_id_seq'::regclass);


--
-- TOC entry 4965 (class 2604 OID 16438)
-- Name: supervisors id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supervisors ALTER COLUMN id SET DEFAULT nextval('public.supervisors_id_seq'::regclass);


--
-- TOC entry 4992 (class 2604 OID 16655)
-- Name: transport_trips id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_trips ALTER COLUMN id SET DEFAULT nextval('public.transport_trips_id_seq'::regclass);


--
-- TOC entry 4974 (class 2604 OID 16491)
-- Name: trucks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks ALTER COLUMN id SET DEFAULT nextval('public.trucks_id_seq'::regclass);


--
-- TOC entry 5018 (class 2604 OID 16793)
-- Name: weekly_company_summary id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_company_summary ALTER COLUMN id SET DEFAULT nextval('public.weekly_company_summary_id_seq'::regclass);


--
-- TOC entry 5012 (class 2604 OID 16766)
-- Name: weekly_driver_payroll id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_driver_payroll ALTER COLUMN id SET DEFAULT nextval('public.weekly_driver_payroll_id_seq'::regclass);


--
-- TOC entry 4994 (class 2604 OID 16706)
-- Name: weekly_headman_payroll id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_headman_payroll ALTER COLUMN id SET DEFAULT nextval('public.weekly_headman_payroll_id_seq'::regclass);


--
-- TOC entry 5006 (class 2604 OID 16739)
-- Name: weekly_supervisor_payroll id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_supervisor_payroll ALTER COLUMN id SET DEFAULT nextval('public.weekly_supervisor_payroll_id_seq'::regclass);


--
-- TOC entry 4959 (class 2604 OID 16392)
-- Name: weighbridges id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weighbridges ALTER COLUMN id SET DEFAULT nextval('public.weighbridges_id_seq'::regclass);


--
-- TOC entry 5290 (class 0 OID 16402)
-- Dependencies: 222
-- Data for Name: distance_bands; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.distance_bands (id, band_code, min_km, max_km, transport_rate_per_ton, driver_rate_per_ton, sagib_retention_per_ton) FROM stdin;
1	A	0.00	5.00	0.00	0.00	0.00
2	B	5.10	10.00	0.00	0.00	0.00
3	C	10.10	15.00	0.00	0.00	0.00
4	D	15.10	20.00	0.00	0.00	0.00
5	E	20.10	25.00	0.00	0.00	0.00
6	F	25.10	30.00	0.00	0.00	0.00
\.


--
-- TOC entry 5298 (class 0 OID 16471)
-- Dependencies: 230
-- Data for Name: drivers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.drivers (id, name, license_no, phone, national_id, is_active, created_at) FROM stdin;
1	Kenneth Tali	K001100001	0713981310	28572359	t	2026-03-25 16:53:31.508572+03
2	Raymond Muhanji	1001104	0727796907	27869781	t	2026-03-25 16:55:51.828721+03
\.


--
-- TOC entry 5304 (class 0 OID 16537)
-- Dependencies: 236
-- Data for Name: harvest_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.harvest_assignments (id, headman_id, outgrower_id, assignment_date, week_number, year, turnup, expected_tonnage, actual_tonnage, status, notes, created_at) FROM stdin;
1	1	1	2026-03-22	13	2026	20	45.000	54.000	completed		2026-03-25 18:25:02.120762+03
\.


--
-- TOC entry 5306 (class 0 OID 16571)
-- Dependencies: 238
-- Data for Name: harvest_financials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.harvest_financials (id, assignment_id, week_number, year, factory_revenue_cutters, factory_revenue_tonnage, total_factory_revenue, cutter_payment, transaction_costs, gross_profit, diff_value, headman_commission, sagib_commission, headman_harvest_share, sagib_net_harvest, computed_at) FROM stdin;
1	1	13	2026	10000.00	54000.00	64000.00	10000.00	50.00	63950.00	9.00	25580.00	38370.00	25580.00	38370.00	2026-03-26 18:40:46.146183+03
\.


--
-- TOC entry 5296 (class 0 OID 16450)
-- Dependencies: 228
-- Data for Name: headmen; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.headmen (id, supervisor_id, name, phone, national_id, is_active, created_at) FROM stdin;
1	1	Gregory Shitsukane	0759174310	23454543	t	2026-03-25 17:25:49.045029+03
3	3	Headman 1	0713981310	234545437	t	2026-03-26 13:19:11.766073+03
\.


--
-- TOC entry 5310 (class 0 OID 16632)
-- Dependencies: 242
-- Data for Name: loading_financials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loading_financials (id, loading_record_id, week_number, year, factory_revenue, loader_payment, supervisor_payment, gross_profit, sagib_net_loading, computed_at) FROM stdin;
\.


--
-- TOC entry 5308 (class 0 OID 16591)
-- Dependencies: 240
-- Data for Name: loading_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loading_records (id, assignment_id, weighbridge_id, supervisor_id, load_date, week_number, year, tons_loaded, trip_count, status, notes, created_at) FROM stdin;
\.


--
-- TOC entry 5302 (class 0 OID 16508)
-- Dependencies: 234
-- Data for Name: outgrowers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.outgrowers (id, name, field_code, field_size_ha, distance_band_id, weighbridge_id, location_notes, is_active, created_at) FROM stdin;
1	David Egesa	1001	10.00	1	1	Bad road and hilly	t	2026-03-25 17:29:21.011335+03
2	OGR 2	1002	5.00	2	1	Accessible road 2km from main tarmac road	t	2026-03-27 10:02:48.779095+03
\.


--
-- TOC entry 5292 (class 0 OID 16419)
-- Dependencies: 224
-- Data for Name: rate_config; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.rate_config (id, config_key, config_value, description, effective_from) FROM stdin;
3	sagib_pays_cutter_per_ton	225.0000	KES sagib pays cane cutter per ton	2026-03-25
4	factory_pays_harvest_per_ton	300.0000	KES factory pays sagib per ton harvested	2026-03-25
5	headman_commission_pct	0.4000	Headman share of tonnage diff commission	2026-03-25
6	sagib_commission_pct	0.6000	Sagib share of tonnage diff commission	2026-03-25
7	headman_profit_share_pct	0.4000	Headman share of harvest+loading profit	2026-03-25
8	factory_pays_loading_per_ton	150.0000	KES factory pays sagib per ton loaded	2026-03-25
9	sagib_pays_loader_per_ton	120.0000	KES sagib pays loader per ton	2026-03-25
10	supervisor_pay_per_trip	100.0000	KES paid to supervisor per trip/load	2026-03-25
11	transaction_cost_per_ton	1.0000	KES transaction cost per ton to cutter	2026-03-25
12	driver_share_pct	0.4000	Driver share of transport revenue	2026-03-25
13	sagib_transport_retention_pct	0.6000	Sagib retention from transport revenue	2026-03-25
1	target_tons_per_cutter	2.2500	Expected tonnage per cane cutter per day	2026-03-25
2	factory_pays_harvest_per_cutter	500.0000	KES factory pays sagib per cutter per day	2026-03-25
14	factory_rate_cutters	500.0000	Rate per cane bundle for cutters (KES per bundle)	2026-03-26
15	factory_rate_tonnage	1000.0000	Rate per ton for harvested cane (KES per ton)	2026-03-26
16	transaction_costs	50.0000	Transaction costs per assignment (KES)	2026-03-26
\.


--
-- TOC entry 5294 (class 0 OID 16435)
-- Dependencies: 226
-- Data for Name: supervisors; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.supervisors (id, name, phone, national_id, is_active, created_at) FROM stdin;
1	Kenneth Shikali	0713981310	28572359	t	2026-03-25 17:24:49.438585+03
2	Raymond Mondy	0720000002	23232323	t	2026-03-25 17:25:16.555383+03
3	Supervisor 1	0713981310	27869781	t	2026-03-26 13:18:35.595203+03
\.


--
-- TOC entry 5312 (class 0 OID 16652)
-- Dependencies: 244
-- Data for Name: transport_trips; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transport_trips (id, truck_id, driver_id, outgrower_id, weighbridge_id, distance_band_id, trip_date, week_number, year, tons_transported, transport_rate, total_revenue, driver_payment, sagib_retention, notes, created_at) FROM stdin;
\.


--
-- TOC entry 5300 (class 0 OID 16488)
-- Dependencies: 232
-- Data for Name: trucks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.trucks (id, plate_no, model, capacity_tons, driver_id, is_active, created_at) FROM stdin;
\.


--
-- TOC entry 5320 (class 0 OID 16790)
-- Dependencies: 252
-- Data for Name: weekly_company_summary; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weekly_company_summary (id, week_number, year, week_start, week_end, harvest_factory_revenue, harvest_cutter_cost, harvest_gross_profit, harvest_headman_share, harvest_sagib_net, loading_factory_revenue, loading_loader_cost, loading_supervisor_cost, loading_gross_profit, loading_headman_share, loading_sagib_net, transport_revenue, transport_driver_cost, transport_sagib_net, total_sagib_revenue, total_sagib_costs, total_sagib_net, generated_at) FROM stdin;
\.


--
-- TOC entry 5318 (class 0 OID 16763)
-- Dependencies: 250
-- Data for Name: weekly_driver_payroll; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weekly_driver_payroll (id, driver_id, week_number, year, week_start, week_end, total_trips, total_tons, total_payable, is_paid, paid_date, generated_at) FROM stdin;
\.


--
-- TOC entry 5314 (class 0 OID 16703)
-- Dependencies: 246
-- Data for Name: weekly_headman_payroll; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weekly_headman_payroll (id, headman_id, week_number, year, week_start, week_end, total_expected_tonnage, total_actual_tonnage, total_tonnage_diff, harvest_profit_share, harvest_commission, loading_profit_share, total_payable, penalty_amount, net_payable, is_paid, paid_date, generated_at) FROM stdin;
\.


--
-- TOC entry 5316 (class 0 OID 16736)
-- Dependencies: 248
-- Data for Name: weekly_supervisor_payroll; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weekly_supervisor_payroll (id, supervisor_id, week_number, year, week_start, week_end, total_trips, total_tons, total_payable, is_paid, paid_date, generated_at) FROM stdin;
\.


--
-- TOC entry 5288 (class 0 OID 16389)
-- Dependencies: 220
-- Data for Name: weighbridges; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.weighbridges (id, name, location, is_active, created_at) FROM stdin;
1	Bumula	Bumula	t	2026-03-25 17:27:13.743106+03
\.


--
-- TOC entry 5343 (class 0 OID 0)
-- Dependencies: 221
-- Name: distance_bands_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.distance_bands_id_seq', 6, true);


--
-- TOC entry 5344 (class 0 OID 0)
-- Dependencies: 229
-- Name: drivers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.drivers_id_seq', 2, true);


--
-- TOC entry 5345 (class 0 OID 0)
-- Dependencies: 235
-- Name: harvest_assignments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.harvest_assignments_id_seq', 1, true);


--
-- TOC entry 5346 (class 0 OID 0)
-- Dependencies: 237
-- Name: harvest_financials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.harvest_financials_id_seq', 4, true);


--
-- TOC entry 5347 (class 0 OID 0)
-- Dependencies: 227
-- Name: headmen_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.headmen_id_seq', 3, true);


--
-- TOC entry 5348 (class 0 OID 0)
-- Dependencies: 241
-- Name: loading_financials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loading_financials_id_seq', 1, false);


--
-- TOC entry 5349 (class 0 OID 0)
-- Dependencies: 239
-- Name: loading_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.loading_records_id_seq', 1, false);


--
-- TOC entry 5350 (class 0 OID 0)
-- Dependencies: 233
-- Name: outgrowers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.outgrowers_id_seq', 2, true);


--
-- TOC entry 5351 (class 0 OID 0)
-- Dependencies: 223
-- Name: rate_config_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.rate_config_id_seq', 16, true);


--
-- TOC entry 5352 (class 0 OID 0)
-- Dependencies: 225
-- Name: supervisors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.supervisors_id_seq', 3, true);


--
-- TOC entry 5353 (class 0 OID 0)
-- Dependencies: 243
-- Name: transport_trips_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transport_trips_id_seq', 1, false);


--
-- TOC entry 5354 (class 0 OID 0)
-- Dependencies: 231
-- Name: trucks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.trucks_id_seq', 1, false);


--
-- TOC entry 5355 (class 0 OID 0)
-- Dependencies: 251
-- Name: weekly_company_summary_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.weekly_company_summary_id_seq', 1, false);


--
-- TOC entry 5356 (class 0 OID 0)
-- Dependencies: 249
-- Name: weekly_driver_payroll_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.weekly_driver_payroll_id_seq', 1, false);


--
-- TOC entry 5357 (class 0 OID 0)
-- Dependencies: 245
-- Name: weekly_headman_payroll_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.weekly_headman_payroll_id_seq', 1, false);


--
-- TOC entry 5358 (class 0 OID 0)
-- Dependencies: 247
-- Name: weekly_supervisor_payroll_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.weekly_supervisor_payroll_id_seq', 1, false);


--
-- TOC entry 5359 (class 0 OID 0)
-- Dependencies: 219
-- Name: weighbridges_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.weighbridges_id_seq', 1, true);


--
-- TOC entry 5047 (class 2606 OID 16417)
-- Name: distance_bands distance_bands_band_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distance_bands
    ADD CONSTRAINT distance_bands_band_code_key UNIQUE (band_code);


--
-- TOC entry 5049 (class 2606 OID 16415)
-- Name: distance_bands distance_bands_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distance_bands
    ADD CONSTRAINT distance_bands_pkey PRIMARY KEY (id);


--
-- TOC entry 5063 (class 2606 OID 16484)
-- Name: drivers drivers_license_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_license_no_key UNIQUE (license_no);


--
-- TOC entry 5065 (class 2606 OID 16486)
-- Name: drivers drivers_national_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_national_id_key UNIQUE (national_id);


--
-- TOC entry 5067 (class 2606 OID 16482)
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- TOC entry 5077 (class 2606 OID 16559)
-- Name: harvest_assignments harvest_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.harvest_assignments
    ADD CONSTRAINT harvest_assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 5082 (class 2606 OID 16584)
-- Name: harvest_financials harvest_financials_assignment_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.harvest_financials
    ADD CONSTRAINT harvest_financials_assignment_id_key UNIQUE (assignment_id);


--
-- TOC entry 5084 (class 2606 OID 16582)
-- Name: harvest_financials harvest_financials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.harvest_financials
    ADD CONSTRAINT harvest_financials_pkey PRIMARY KEY (id);


--
-- TOC entry 5059 (class 2606 OID 16464)
-- Name: headmen headmen_national_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.headmen
    ADD CONSTRAINT headmen_national_id_key UNIQUE (national_id);


--
-- TOC entry 5061 (class 2606 OID 16462)
-- Name: headmen headmen_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.headmen
    ADD CONSTRAINT headmen_pkey PRIMARY KEY (id);


--
-- TOC entry 5090 (class 2606 OID 16645)
-- Name: loading_financials loading_financials_loading_record_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loading_financials
    ADD CONSTRAINT loading_financials_loading_record_id_key UNIQUE (loading_record_id);


--
-- TOC entry 5092 (class 2606 OID 16643)
-- Name: loading_financials loading_financials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loading_financials
    ADD CONSTRAINT loading_financials_pkey PRIMARY KEY (id);


--
-- TOC entry 5088 (class 2606 OID 16615)
-- Name: loading_records loading_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loading_records
    ADD CONSTRAINT loading_records_pkey PRIMARY KEY (id);


--
-- TOC entry 5073 (class 2606 OID 16525)
-- Name: outgrowers outgrowers_field_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outgrowers
    ADD CONSTRAINT outgrowers_field_code_key UNIQUE (field_code);


--
-- TOC entry 5075 (class 2606 OID 16523)
-- Name: outgrowers outgrowers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outgrowers
    ADD CONSTRAINT outgrowers_pkey PRIMARY KEY (id);


--
-- TOC entry 5051 (class 2606 OID 16433)
-- Name: rate_config rate_config_config_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rate_config
    ADD CONSTRAINT rate_config_config_key_key UNIQUE (config_key);


--
-- TOC entry 5053 (class 2606 OID 16431)
-- Name: rate_config rate_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rate_config
    ADD CONSTRAINT rate_config_pkey PRIMARY KEY (id);


--
-- TOC entry 5055 (class 2606 OID 16448)
-- Name: supervisors supervisors_national_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supervisors
    ADD CONSTRAINT supervisors_national_id_key UNIQUE (national_id);


--
-- TOC entry 5057 (class 2606 OID 16446)
-- Name: supervisors supervisors_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.supervisors
    ADD CONSTRAINT supervisors_pkey PRIMARY KEY (id);


--
-- TOC entry 5096 (class 2606 OID 16676)
-- Name: transport_trips transport_trips_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_trips
    ADD CONSTRAINT transport_trips_pkey PRIMARY KEY (id);


--
-- TOC entry 5069 (class 2606 OID 16499)
-- Name: trucks trucks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_pkey PRIMARY KEY (id);


--
-- TOC entry 5071 (class 2606 OID 16501)
-- Name: trucks trucks_plate_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_plate_no_key UNIQUE (plate_no);


--
-- TOC entry 5113 (class 2606 OID 16819)
-- Name: weekly_company_summary weekly_company_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_company_summary
    ADD CONSTRAINT weekly_company_summary_pkey PRIMARY KEY (id);


--
-- TOC entry 5115 (class 2606 OID 16821)
-- Name: weekly_company_summary weekly_company_summary_week_number_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_company_summary
    ADD CONSTRAINT weekly_company_summary_week_number_year_key UNIQUE (week_number, year);


--
-- TOC entry 5109 (class 2606 OID 16783)
-- Name: weekly_driver_payroll weekly_driver_payroll_driver_id_week_number_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_driver_payroll
    ADD CONSTRAINT weekly_driver_payroll_driver_id_week_number_year_key UNIQUE (driver_id, week_number, year);


--
-- TOC entry 5111 (class 2606 OID 16781)
-- Name: weekly_driver_payroll weekly_driver_payroll_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_driver_payroll
    ADD CONSTRAINT weekly_driver_payroll_pkey PRIMARY KEY (id);


--
-- TOC entry 5099 (class 2606 OID 16729)
-- Name: weekly_headman_payroll weekly_headman_payroll_headman_id_week_number_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_headman_payroll
    ADD CONSTRAINT weekly_headman_payroll_headman_id_week_number_year_key UNIQUE (headman_id, week_number, year);


--
-- TOC entry 5101 (class 2606 OID 16727)
-- Name: weekly_headman_payroll weekly_headman_payroll_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_headman_payroll
    ADD CONSTRAINT weekly_headman_payroll_pkey PRIMARY KEY (id);


--
-- TOC entry 5104 (class 2606 OID 16754)
-- Name: weekly_supervisor_payroll weekly_supervisor_payroll_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_supervisor_payroll
    ADD CONSTRAINT weekly_supervisor_payroll_pkey PRIMARY KEY (id);


--
-- TOC entry 5106 (class 2606 OID 16756)
-- Name: weekly_supervisor_payroll weekly_supervisor_payroll_supervisor_id_week_number_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_supervisor_payroll
    ADD CONSTRAINT weekly_supervisor_payroll_supervisor_id_week_number_year_key UNIQUE (supervisor_id, week_number, year);


--
-- TOC entry 5045 (class 2606 OID 16400)
-- Name: weighbridges weighbridges_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weighbridges
    ADD CONSTRAINT weighbridges_pkey PRIMARY KEY (id);


--
-- TOC entry 5107 (class 1259 OID 16858)
-- Name: idx_drv_payroll; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_drv_payroll ON public.weekly_driver_payroll USING btree (week_number, year);


--
-- TOC entry 5078 (class 1259 OID 16850)
-- Name: idx_harvest_hm; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_harvest_hm ON public.harvest_assignments USING btree (headman_id);


--
-- TOC entry 5079 (class 1259 OID 16851)
-- Name: idx_harvest_ogr; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_harvest_ogr ON public.harvest_assignments USING btree (outgrower_id);


--
-- TOC entry 5080 (class 1259 OID 16849)
-- Name: idx_harvest_week; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_harvest_week ON public.harvest_assignments USING btree (week_number, year);


--
-- TOC entry 5097 (class 1259 OID 16856)
-- Name: idx_hm_payroll; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_hm_payroll ON public.weekly_headman_payroll USING btree (week_number, year);


--
-- TOC entry 5085 (class 1259 OID 16853)
-- Name: idx_loading_sup; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loading_sup ON public.loading_records USING btree (supervisor_id);


--
-- TOC entry 5086 (class 1259 OID 16852)
-- Name: idx_loading_week; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loading_week ON public.loading_records USING btree (week_number, year);


--
-- TOC entry 5102 (class 1259 OID 16857)
-- Name: idx_sup_payroll; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sup_payroll ON public.weekly_supervisor_payroll USING btree (week_number, year);


--
-- TOC entry 5093 (class 1259 OID 16855)
-- Name: idx_transport_drv; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transport_drv ON public.transport_trips USING btree (driver_id);


--
-- TOC entry 5094 (class 1259 OID 16854)
-- Name: idx_transport_week; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_transport_week ON public.transport_trips USING btree (week_number, year);


--
-- TOC entry 5120 (class 2606 OID 16560)
-- Name: harvest_assignments harvest_assignments_headman_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.harvest_assignments
    ADD CONSTRAINT harvest_assignments_headman_id_fkey FOREIGN KEY (headman_id) REFERENCES public.headmen(id);


--
-- TOC entry 5121 (class 2606 OID 16565)
-- Name: harvest_assignments harvest_assignments_outgrower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.harvest_assignments
    ADD CONSTRAINT harvest_assignments_outgrower_id_fkey FOREIGN KEY (outgrower_id) REFERENCES public.outgrowers(id);


--
-- TOC entry 5122 (class 2606 OID 16585)
-- Name: harvest_financials harvest_financials_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.harvest_financials
    ADD CONSTRAINT harvest_financials_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.harvest_assignments(id);


--
-- TOC entry 5116 (class 2606 OID 16465)
-- Name: headmen headmen_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.headmen
    ADD CONSTRAINT headmen_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.supervisors(id);


--
-- TOC entry 5126 (class 2606 OID 16646)
-- Name: loading_financials loading_financials_loading_record_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loading_financials
    ADD CONSTRAINT loading_financials_loading_record_id_fkey FOREIGN KEY (loading_record_id) REFERENCES public.loading_records(id);


--
-- TOC entry 5123 (class 2606 OID 16616)
-- Name: loading_records loading_records_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loading_records
    ADD CONSTRAINT loading_records_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.harvest_assignments(id);


--
-- TOC entry 5124 (class 2606 OID 16626)
-- Name: loading_records loading_records_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loading_records
    ADD CONSTRAINT loading_records_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.supervisors(id);


--
-- TOC entry 5125 (class 2606 OID 16621)
-- Name: loading_records loading_records_weighbridge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loading_records
    ADD CONSTRAINT loading_records_weighbridge_id_fkey FOREIGN KEY (weighbridge_id) REFERENCES public.weighbridges(id);


--
-- TOC entry 5118 (class 2606 OID 16526)
-- Name: outgrowers outgrowers_distance_band_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outgrowers
    ADD CONSTRAINT outgrowers_distance_band_id_fkey FOREIGN KEY (distance_band_id) REFERENCES public.distance_bands(id);


--
-- TOC entry 5119 (class 2606 OID 16531)
-- Name: outgrowers outgrowers_weighbridge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.outgrowers
    ADD CONSTRAINT outgrowers_weighbridge_id_fkey FOREIGN KEY (weighbridge_id) REFERENCES public.weighbridges(id);


--
-- TOC entry 5127 (class 2606 OID 16697)
-- Name: transport_trips transport_trips_distance_band_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_trips
    ADD CONSTRAINT transport_trips_distance_band_id_fkey FOREIGN KEY (distance_band_id) REFERENCES public.distance_bands(id);


--
-- TOC entry 5128 (class 2606 OID 16682)
-- Name: transport_trips transport_trips_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_trips
    ADD CONSTRAINT transport_trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id);


--
-- TOC entry 5129 (class 2606 OID 16687)
-- Name: transport_trips transport_trips_outgrower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_trips
    ADD CONSTRAINT transport_trips_outgrower_id_fkey FOREIGN KEY (outgrower_id) REFERENCES public.outgrowers(id);


--
-- TOC entry 5130 (class 2606 OID 16677)
-- Name: transport_trips transport_trips_truck_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_trips
    ADD CONSTRAINT transport_trips_truck_id_fkey FOREIGN KEY (truck_id) REFERENCES public.trucks(id);


--
-- TOC entry 5131 (class 2606 OID 16692)
-- Name: transport_trips transport_trips_weighbridge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transport_trips
    ADD CONSTRAINT transport_trips_weighbridge_id_fkey FOREIGN KEY (weighbridge_id) REFERENCES public.weighbridges(id);


--
-- TOC entry 5117 (class 2606 OID 16502)
-- Name: trucks trucks_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.trucks
    ADD CONSTRAINT trucks_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id);


--
-- TOC entry 5134 (class 2606 OID 16784)
-- Name: weekly_driver_payroll weekly_driver_payroll_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_driver_payroll
    ADD CONSTRAINT weekly_driver_payroll_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id);


--
-- TOC entry 5132 (class 2606 OID 16730)
-- Name: weekly_headman_payroll weekly_headman_payroll_headman_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_headman_payroll
    ADD CONSTRAINT weekly_headman_payroll_headman_id_fkey FOREIGN KEY (headman_id) REFERENCES public.headmen(id);


--
-- TOC entry 5133 (class 2606 OID 16757)
-- Name: weekly_supervisor_payroll weekly_supervisor_payroll_supervisor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.weekly_supervisor_payroll
    ADD CONSTRAINT weekly_supervisor_payroll_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES public.supervisors(id);


-- Completed on 2026-03-27 10:49:55

--
-- PostgreSQL database dump complete
--

\unrestrict MXPKbTMstw69efucWcQbQlni4MhEmY79ZHfeF0AwJARHispArA7Csyl8O1USpzT


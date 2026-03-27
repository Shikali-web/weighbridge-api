-- ============================================
-- SAGIB ENTERPRISES DATABASE SCHEMA
-- ============================================

-- 1. Setup Tables
-- ============================================

-- Supervisors table
CREATE TABLE IF NOT EXISTS supervisors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    national_id VARCHAR(20) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Headmen table
CREATE TABLE IF NOT EXISTS headmen (
    id SERIAL PRIMARY KEY,
    supervisor_id INTEGER REFERENCES supervisors(id),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    national_id VARCHAR(20) UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Outgrowers table
CREATE TABLE IF NOT EXISTS outgrowers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    field_code VARCHAR(50) UNIQUE NOT NULL,
    field_size_ha DECIMAL(10,2),
    distance_band_id INTEGER,
    weighbridge_id INTEGER,
    location_notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Distance Bands table
CREATE TABLE IF NOT EXISTS distance_bands (
    id SERIAL PRIMARY KEY,
    band_code VARCHAR(10) UNIQUE NOT NULL,
    min_km DECIMAL(5,2) NOT NULL,
    max_km DECIMAL(5,2) NOT NULL,
    transport_rate_per_ton DECIMAL(10,2) NOT NULL,
    driver_rate_per_ton DECIMAL(10,2) GENERATED ALWAYS AS (transport_rate_per_ton * 0.4) STORED,
    sagib_rate_per_ton DECIMAL(10,2) GENERATED ALWAYS AS (transport_rate_per_ton * 0.6) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weighbridges table
CREATE TABLE IF NOT EXISTS weighbridges (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drivers table
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    license_no VARCHAR(50) UNIQUE NOT NULL,
    phone VARCHAR(20),
    national_id VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trucks table
CREATE TABLE IF NOT EXISTS trucks (
    id SERIAL PRIMARY KEY,
    plate_no VARCHAR(20) UNIQUE NOT NULL,
    model VARCHAR(50),
    capacity_tons DECIMAL(10,2),
    driver_id INTEGER REFERENCES drivers(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rate Configuration Table
-- ============================================

CREATE TABLE IF NOT EXISTS rate_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value DECIMAL(15,2) NOT NULL,
    description TEXT,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default rates
INSERT INTO rate_config (config_key, config_value, description, effective_from) VALUES
('cutter_daily_rate', 500, 'Daily payment per cane cutter (KES)', CURRENT_DATE),
('cutter_per_ton_rate', 225, 'Alternative payment per ton (KES)', CURRENT_DATE),
('factory_payment_per_ton', 300, 'Factory pays Sagib per ton harvested (KES)', CURRENT_DATE),
('loading_factory_rate', 150, 'Factory pays Sagib per ton loaded (KES)', CURRENT_DATE),
('loading_sagib_rate', 120, 'Sagib pays loaders per ton (KES)', CURRENT_DATE),
('supervisor_per_trip', 100, 'Supervisor payment per trip/load (KES)', CURRENT_DATE)
ON CONFLICT (config_key) DO NOTHING;

-- 3. Harvesting Tables
-- ============================================

-- Harvest Assignments
CREATE TABLE IF NOT EXISTS harvest_assignments (
    id SERIAL PRIMARY KEY,
    headman_id INTEGER REFERENCES headmen(id),
    outgrower_id INTEGER REFERENCES outgrowers(id),
    assignment_date DATE NOT NULL,
    week_start DATE,
    week_end DATE,
    week_number INTEGER,
    year INTEGER,
    turnup INTEGER NOT NULL, -- Number of cane bundles/cutters
    expected_tonnage DECIMAL(15,3) GENERATED ALWAYS AS (turnup * 2.25) STORED,
    actual_tonnage DECIMAL(15,3),
    tonnage_diff DECIMAL(15,3),
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Harvest Financials
CREATE TABLE IF NOT EXISTS harvest_financials (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER UNIQUE REFERENCES harvest_assignments(id),
    week_start DATE,
    week_end DATE,
    week_number INTEGER,
    year INTEGER,
    -- Revenue
    factory_revenue DECIMAL(15,2),
    -- Costs
    cutter_payment DECIMAL(15,2),
    -- Profit
    gross_profit DECIMAL(15,2),
    -- Profit Share
    headman_share_40 DECIMAL(15,2),
    sagib_share_60 DECIMAL(15,2),
    -- Performance Adjustment
    tonnage_diff DECIMAL(15,3),
    performance_adjustment DECIMAL(15,2),
    final_headman_payment DECIMAL(15,2),
    final_sagib_net DECIMAL(15,2),
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Loading Tables
-- ============================================

-- Loading Records
CREATE TABLE IF NOT EXISTS loading_records (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES harvest_assignments(id),
    weighbridge_id INTEGER REFERENCES weighbridges(id),
    supervisor_id INTEGER REFERENCES supervisors(id),
    load_date DATE NOT NULL,
    week_start DATE,
    week_end DATE,
    week_number INTEGER,
    year INTEGER,
    tons_loaded DECIMAL(15,3) NOT NULL,
    trip_count INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loading Financials
CREATE TABLE IF NOT EXISTS loading_financials (
    id SERIAL PRIMARY KEY,
    loading_record_id INTEGER UNIQUE REFERENCES loading_records(id),
    week_start DATE,
    week_end DATE,
    week_number INTEGER,
    year INTEGER,
    -- Revenue
    factory_revenue DECIMAL(15,2),
    sagib_revenue DECIMAL(15,2),
    -- Costs
    loader_payment DECIMAL(15,2),
    supervisor_payment DECIMAL(15,2),
    -- Profit
    gross_profit DECIMAL(15,2),
    final_sagib_net DECIMAL(15,2),
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Transport Tables
-- ============================================

-- Transport Trips
CREATE TABLE IF NOT EXISTS transport_trips (
    id SERIAL PRIMARY KEY,
    truck_id INTEGER REFERENCES trucks(id),
    driver_id INTEGER REFERENCES drivers(id),
    outgrower_id INTEGER REFERENCES outgrowers(id),
    weighbridge_id INTEGER REFERENCES weighbridges(id),
    distance_band_id INTEGER REFERENCES distance_bands(id),
    trip_date DATE NOT NULL,
    week_start DATE,
    week_end DATE,
    week_number INTEGER,
    year INTEGER,
    tons_transported DECIMAL(15,3) NOT NULL,
    transport_rate DECIMAL(10,2),
    total_revenue DECIMAL(15,2),
    driver_payment DECIMAL(15,2),
    sagib_retention DECIMAL(15,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Payroll Tables
-- ============================================

-- Weekly Headman Payroll
CREATE TABLE IF NOT EXISTS weekly_headman_payroll (
    id SERIAL PRIMARY KEY,
    headman_id INTEGER REFERENCES headmen(id),
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    week_number INTEGER,
    year INTEGER,
    total_expected_tonnage DECIMAL(15,3),
    total_actual_tonnage DECIMAL(15,3),
    total_tonnage_diff DECIMAL(15,3),
    harvest_profit_share DECIMAL(15,2),
    loading_profit_share DECIMAL(15,2),
    total_payable DECIMAL(15,2),
    is_paid BOOLEAN DEFAULT false,
    paid_date DATE,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weekly Supervisor Payroll
CREATE TABLE IF NOT EXISTS weekly_supervisor_payroll (
    id SERIAL PRIMARY KEY,
    supervisor_id INTEGER REFERENCES supervisors(id),
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    week_number INTEGER,
    year INTEGER,
    total_trips INTEGER,
    total_tons DECIMAL(15,3),
    total_payable DECIMAL(15,2),
    is_paid BOOLEAN DEFAULT false,
    paid_date DATE,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Weekly Driver Payroll
CREATE TABLE IF NOT EXISTS weekly_driver_payroll (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES drivers(id),
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    week_number INTEGER,
    year INTEGER,
    total_trips INTEGER,
    total_tons DECIMAL(15,3),
    total_payable DECIMAL(15,2),
    is_paid BOOLEAN DEFAULT false,
    paid_date DATE,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Company Summary
-- ============================================

CREATE TABLE IF NOT EXISTS weekly_company_summary (
    id SERIAL PRIMARY KEY,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,
    week_number INTEGER,
    year INTEGER,
    -- Harvest Summary
    harvest_factory_revenue DECIMAL(15,2),
    harvest_cutter_cost DECIMAL(15,2),
    harvest_gross_profit DECIMAL(15,2),
    harvest_headman_payment DECIMAL(15,2),
    harvest_sagib_net DECIMAL(15,2),
    harvest_total_tons DECIMAL(15,3),
    -- Loading Summary
    loading_factory_revenue DECIMAL(15,2),
    loading_loader_cost DECIMAL(15,2),
    loading_supervisor_cost DECIMAL(15,2),
    loading_gross_profit DECIMAL(15,2),
    loading_sagib_net DECIMAL(15,2),
    loading_total_tons DECIMAL(15,3),
    -- Transport Summary
    transport_revenue DECIMAL(15,2),
    transport_driver_cost DECIMAL(15,2),
    transport_sagib_net DECIMAL(15,2),
    transport_total_tons DECIMAL(15,3),
    -- Total Company
    total_revenue DECIMAL(15,2),
    total_costs DECIMAL(15,2),
    total_sagib_net DECIMAL(15,2),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Create Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_harvest_assignments_date ON harvest_assignments(assignment_date);
CREATE INDEX IF NOT EXISTS idx_harvest_assignments_week ON harvest_assignments(week_start, week_end);
CREATE INDEX IF NOT EXISTS idx_loading_records_date ON loading_records(load_date);
CREATE INDEX IF NOT EXISTS idx_transport_trips_date ON transport_trips(trip_date);
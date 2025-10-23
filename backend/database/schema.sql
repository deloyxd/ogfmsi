-- OGFMSI Database Schema for SQL (Offline/Internal) Modules
-- This schema handles all internal data that doesn't need real-time customer access
-- pwede pa kayo mag dagdag ng mga table dito kung sa tingin niyo is yung module na yon is pang offline

-- Roles table (used by demo.route.js)
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL,
    role_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- E-Commerce Products (Enhanced Store Management) - used by ecommerce.route.js
CREATE TABLE IF NOT EXISTS ecommerce_products_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_name_encoded TEXT,
    price DECIMAL(10,2) NOT NULL,
    price_encoded TEXT,
    quantity INT NOT NULL DEFAULT 0,
    stock_status ENUM('In Stock', 'Low Stock', 'Out of Stock') DEFAULT 'In Stock',
    measurement_value VARCHAR(100),
    measurement_unit VARCHAR(50),
    purchase_type VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    image_url LONGTEXT,
    expiration_date DATE NULL,
    disposal_status ENUM('Active', 'Disposed') DEFAULT 'Active',
    disposal_reason VARCHAR(100),
    disposal_notes TEXT,
    disposed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- E-Commerce Cart Items (Session-based) - used by ecommerce.route.js
CREATE TABLE IF NOT EXISTS ecommerce_cart_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id VARCHAR(50) UNIQUE NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    product_name TEXT,
    product_image LONGTEXT,
    price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    measurement VARCHAR(100),
    measurement_unit VARCHAR(50),
    purchase_type VARCHAR(100),
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES ecommerce_products_tbl(product_id) ON DELETE CASCADE
);

-- E-Commerce Orders (Completed Transactions) - used by ecommerce.route.js
CREATE TABLE IF NOT EXISTS ecommerce_orders_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) UNIQUE NOT NULL,
    session_id VARCHAR(100) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'cashless') DEFAULT 'cash',
    customer_payment DECIMAL(10,2),
    change_amount DECIMAL(10,2),
    status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending',
    processed_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- E-Commerce Order Items (Order Details) - used by ecommerce.route.js
CREATE TABLE IF NOT EXISTS ecommerce_order_items_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_item_id VARCHAR(50) UNIQUE NOT NULL,
    order_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50),
    product_name TEXT,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES ecommerce_orders_tbl(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES ecommerce_products_tbl(product_id) ON DELETE SET NULL
);

-- Gym Equipment Inventory (Internal Management) - used by maintenance.route.js
-- Main equipment table - shows only main equipment entries
CREATE TABLE IF NOT EXISTS gym_equipment_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id VARCHAR(50) UNIQUE NOT NULL,
    equipment_name VARCHAR(255) NOT NULL,
    equipment_type ENUM('machine', 'non-machine', 'plates', 'weights') NOT NULL,
    total_quantity INT NOT NULL DEFAULT 1,
    image_url LONGTEXT,
    general_status VARCHAR(100) NOT NULL DEFAULT 'All Available',
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Individual equipment items table - stores individual items (001, 002, 003, etc.)
CREATE TABLE IF NOT EXISTS gym_equipment_items_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id VARCHAR(50) UNIQUE NOT NULL,
    equipment_id VARCHAR(50) NOT NULL,
    item_code VARCHAR(20) NOT NULL, -- e.g., CABCRO001, CABCRO002
    individual_status ENUM('Available', 'Unavailable', 'For Disposal', 'Disposed') DEFAULT 'Available',
    disposed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_id) REFERENCES gym_equipment_tbl(equipment_id) ON DELETE CASCADE
);

-- Equipment Maintenance (Internal) - used by maintenance.route.js
CREATE TABLE IF NOT EXISTS equipment_maintenance_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    maintenance_id VARCHAR(50) UNIQUE NOT NULL,
    equipment_name VARCHAR(255) NOT NULL,
    maintenance_type ENUM('routine', 'repair', 'inspection') NOT NULL,
    description TEXT,
    scheduled_date DATE,
    completed_date DATE,
    status ENUM('scheduled', 'in_progress', 'completed', 'overdue') DEFAULT 'scheduled',
    assigned_to INT,
    cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS customer_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(50) UNIQUE NOT NULL,
    customer_image_url LONGTEXT NOT NULL,
    customer_first_name VARCHAR(255) NOT NULL,
    customer_last_name VARCHAR(255) NOT NULL,
    customer_contact VARCHAR(50),
    customer_type ENUM('daily', 'monthly', 'archived') DEFAULT 'daily',
    customer_tid VARCHAR(255),
    customer_pending INT,
    customer_rate ENUM('regular', 'student') DEFAULT 'regular',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_monthly_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id VARCHAR(50) NOT NULL,
    customer_start_date DATE,
    customer_end_date DATE,
    customer_months INT,
    customer_tid VARCHAR(255),
    customer_pending INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id VARCHAR(50) UNIQUE NOT NULL,
    payment_customer_id VARCHAR(50) NOT NULL,
    payment_purpose VARCHAR(255),
    payment_amount_to_pay VARCHAR(255),
    payment_amount_paid_cash VARCHAR(255),
    payment_amount_paid_cashless VARCHAR(255),
    payment_amount_change VARCHAR(255),
    payment_amount_refund VARCHAR(255),
    payment_method VARCHAR(255),
    payment_ref VARCHAR(50) NULL,
    payment_rate VARCHAR(255),
    payment_type ENUM('pending', 'canceled', 'service', 'sales', 'refund') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Inquiry: Regular Check-Ins Logbook
CREATE TABLE IF NOT EXISTS inquiry_checkins_regular_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    checkin_id VARCHAR(50) NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    customer_name_encoded LONGTEXT,
    customer_contact VARCHAR(50),
    customer_image_url LONGTEXT,
    transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inquiry: Monthly Check-Ins Logbook
CREATE TABLE IF NOT EXISTS inquiry_checkins_monthly_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    checkin_id VARCHAR(50) NOT NULL,
    customer_id VARCHAR(50) NOT NULL,
    customer_name_encoded LONGTEXT,
    customer_contact VARCHAR(50),
    customer_image_url LONGTEXT,
    transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Inquiry: Archived Check-Ins Logbook
-- CREATE TABLE IF NOT EXISTS inquiry_checkins_archived_tbl (
--     id INT AUTO_INCREMENT PRIMARY KEY,
--     archive_id VARCHAR(50) UNIQUE NOT NULL,
--     source_type ENUM('regular','monthly') NOT NULL,
--     checkin_id VARCHAR(50) NOT NULL,
--     customer_id VARCHAR(50) NOT NULL,
--     customer_name_encoded LONGTEXT,
--     customer_contact VARCHAR(50),
--     customer_image_url LONGTEXT,
--     transaction_id VARCHAR(255),
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- ===============================================
-- Performance indexes for production traffic
-- Date: 2025-10-09
-- These ALTERs are intended for fresh setups. On existing databases, run the migration runner (npm run migrate)
-- which checks information_schema to avoid duplicate indexes and handles missing tables/columns gracefully.
-- ===============================================

ALTER TABLE ecommerce_products_tbl ADD INDEX idx_products_created_at (created_at);
ALTER TABLE ecommerce_products_tbl ADD INDEX idx_products_category_created (category, created_at);
ALTER TABLE ecommerce_products_tbl ADD INDEX idx_products_stock_status (stock_status);
ALTER TABLE ecommerce_products_tbl ADD INDEX idx_products_expiration_date (expiration_date);

ALTER TABLE ecommerce_cart_tbl ADD INDEX idx_cart_session_created (session_id, created_at);

ALTER TABLE ecommerce_orders_tbl ADD INDEX idx_orders_created (created_at);
ALTER TABLE ecommerce_orders_tbl ADD INDEX idx_orders_status_created (status, created_at);

ALTER TABLE ecommerce_order_items_tbl ADD INDEX idx_order_items_order_id (order_id);
ALTER TABLE ecommerce_order_items_tbl ADD INDEX idx_order_items_product (product_id);

ALTER TABLE gym_equipment_tbl ADD INDEX idx_equipment_created (created_at);

ALTER TABLE gym_equipment_items_tbl ADD INDEX idx_items_equipment_itemcode (equipment_id, item_code);
ALTER TABLE gym_equipment_items_tbl ADD INDEX idx_items_equipment_status (equipment_id, individual_status);

ALTER TABLE equipment_maintenance_tbl ADD INDEX idx_maint_scheduled (scheduled_date);
ALTER TABLE equipment_maintenance_tbl ADD INDEX idx_maint_status_sched (status, scheduled_date);
ALTER TABLE equipment_maintenance_tbl ADD INDEX idx_maint_created (created_at);

ALTER TABLE customer_tbl ADD INDEX idx_customer_created (created_at);

ALTER TABLE customer_monthly_tbl ADD INDEX idx_cust_monthly_enddate (customer_end_date);
ALTER TABLE customer_monthly_tbl ADD INDEX idx_cust_monthly_customer (customer_id);

ALTER TABLE inquiry_checkins_regular_tbl ADD INDEX idx_checkins_regular_created (created_at);

ALTER TABLE inquiry_checkins_monthly_tbl ADD INDEX idx_checkins_monthly_created (created_at);

ALTER TABLE payment_tbl ADD INDEX idx_payment_type_created (payment_type, created_at);
ALTER TABLE payment_tbl ADD INDEX idx_payment_customer (payment_customer_id);
ALTER TABLE payment_tbl ADD UNIQUE INDEX uniq_payment_ref (payment_ref);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id VARCHAR(50) UNIQUE NOT NULL,
    admin_image_url LONGTEXT,
    admin_full_name VARCHAR(255) NOT NULL,
    admin_username VARCHAR(100) UNIQUE NOT NULL,
    admin_role ENUM('admin','staff') NOT NULL DEFAULT 'staff',
    admin_status ENUM('active','disabled') NOT NULL DEFAULT 'active',
    admin_password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
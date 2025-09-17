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
    customer_type ENUM('daily', 'monthly') DEFAULT 'daily',
    customer_pending INT,
    customer_rate ENUM('regular', 'student') DEFAULT 'regular',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_monthly_tbl (
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
    payment_id VARCHAR(50) UNIQUE NOT NULL,
    payment_customer_id VARCHAR(50) NOT NULL,
    payment_purpose VARCHAR(255),
    payment_amount_to_pay VARCHAR(255),
    payment_amount_paid_cash VARCHAR(255),
    payment_amount_paid_cashless VARCHAR(255),
    payment_amount_change VARCHAR(255),
    payment_amount_refund VARCHAR(255),
    payment_method VARCHAR(255),
    payment_rate VARCHAR(255),
    payment_type ENUM('pending', 'canceled', 'complete', 'refund') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
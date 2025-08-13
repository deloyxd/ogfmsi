-- OGFMSI Database Schema for SQL (Offline/Internal) Modules
-- This schema handles all internal data that doesn't need real-time customer access
-- pwede pa kayo mag dagdag ng mga table dito kung sa tingin niyo is yung module na yon is pang offline

-- Sales Data (Internal/Staff Only)
CREATE TABLE IF NOT EXISTS admin_sales_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purpose VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    time_stamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Store Inventory & Products (Internal Management)
CREATE TABLE IF NOT EXISTS store_products_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_type ENUM('supplement', 'food', 'merchandise', 'beverages') NOT NULL,
    quantity INT NOT NULL DEFAULT 0,
    price DECIMAL(10,2) NOT NULL,
    status ENUM('In Stock', 'Low Stock', 'Out of Stock') DEFAULT 'In Stock',
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Store Transactions (Internal)
CREATE TABLE IF NOT EXISTS store_transactions_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity_sold INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'cashless') NOT NULL,
    status ENUM('pending', 'completed', 'voided') DEFAULT 'pending',
    processed_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES store_products_tbl(product_id)
);

-- System Roles (Internal Access Control)
CREATE TABLE IF NOT EXISTS system_roles_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    role_description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- System Permissions (Internal Access Control)
CREATE TABLE IF NOT EXISTS system_permissions_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    permission_id VARCHAR(50) UNIQUE NOT NULL,
    permission_name VARCHAR(100) NOT NULL,
    permission_description TEXT,
    module VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Role-Permission Mapping (Internal Access Control)
CREATE TABLE IF NOT EXISTS role_permissions_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id VARCHAR(50) NOT NULL,
    permission_id VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES system_roles_tbl(role_id),
    FOREIGN KEY (permission_id) REFERENCES system_permissions_tbl(permission_id),
    UNIQUE KEY unique_role_permission (role_id, permission_id)
);

-- System Users (Internal Access Control)
CREATE TABLE IF NOT EXISTS system_users_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role_id VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES system_roles_tbl(role_id)
);

-- System Logs (Internal Audit)
CREATE TABLE IF NOT EXISTS system_logs_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    log_id VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(50),
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES system_users_tbl(user_id)
);

-- Daily Check-ins (Internal Staff Management)
CREATE TABLE IF NOT EXISTS daily_checkins_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    checkin_id VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    checkin_date DATE NOT NULL,
    checkin_time TIME NOT NULL,
    checkin_type ENUM('daily', 'monthly') DEFAULT 'daily',
    amount_paid DECIMAL(10,2),
    processed_by INT,
    status ENUM('active', 'voided') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Monthly Pass Users (Internal Management)
CREATE TABLE IF NOT EXISTS monthly_passes_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pass_id VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    pass_type ENUM('monthly', 'student') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    renewal_amount DECIMAL(10,2),
    status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Equipment Maintenance (Internal)
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

-- Gym Equipment Inventory (Internal Management)
CREATE TABLE IF NOT EXISTS gym_equipment_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_id VARCHAR(50) UNIQUE NOT NULL,
    equipment_name VARCHAR(255) NOT NULL,
    equipment_type ENUM('machine', 'non-machine') NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    image_url VARCHAR(500),
    condition_status ENUM('excellent', 'good', 'fair', 'poor', 'needs_replacement') DEFAULT 'good',
    last_maintenance_date DATE,
    next_maintenance_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE gym_equipment_tbl 
MODIFY COLUMN image_url LONGTEXT;

-- Admin Dashboard Stats (Internal)
CREATE TABLE IF NOT EXISTS dashboard_stats_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_id VARCHAR(50) UNIQUE NOT NULL,
    stat_type VARCHAR(100) NOT NULL,
    stat_value DECIMAL(15,2) NOT NULL,
    stat_date DATE NOT NULL,
    stat_period ENUM('daily', 'weekly', 'monthly') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data Sync Queue (Internal - for syncing to Firebase later)
CREATE TABLE IF NOT EXISTS data_sync_queue_tbl (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sync_id VARCHAR(50) UNIQUE NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(50) NOT NULL,
    action ENUM('create', 'update', 'delete') NOT NULL,
    data JSON,
    status ENUM('pending', 'synced', 'failed') DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP NULL
);

-- Insert default roles
INSERT IGNORE INTO system_roles_tbl (role_id, role_name, role_description) VALUES
('ROLE_ADMIN', 'Administrator', 'Full system access'),
('ROLE_MANAGER', 'Manager', 'Limited administrative access'),
('ROLE_STAFF', 'Staff', 'Basic operational access'),
('ROLE_CASHIER', 'Cashier', 'Sales and billing access');

-- Insert default permissions
INSERT IGNORE INTO system_permissions_tbl (permission_id, permission_name, permission_description, module) VALUES
('PERM_DASHBOARD_VIEW', 'View Dashboard', 'View admin dashboard', 'dashboard'),
('PERM_SALES_VIEW', 'View Sales', 'View sales data', 'sales'),
('PERM_SALES_CREATE', 'Create Sales', 'Create sales records', 'sales'),
('PERM_STORE_VIEW', 'View Store', 'View store inventory', 'store'),
('PERM_STORE_MANAGE', 'Manage Store', 'Manage store products', 'store'),
('PERM_USERS_VIEW', 'View Users', 'View user data', 'users'),
('PERM_USERS_MANAGE', 'Manage Users', 'Manage user accounts', 'users'),
('PERM_REPORTS_VIEW', 'View Reports', 'View system reports', 'reports'),
('PERM_MAINTENANCE_VIEW', 'View Maintenance', 'View equipment maintenance', 'maintenance'),
('PERM_MAINTENANCE_MANAGE', 'Manage Maintenance', 'Manage equipment maintenance', 'maintenance'),
('PERM_ACCESS_CONTROL', 'Access Control', 'Manage roles and permissions', 'access_control');

-- Assign permissions to roles
INSERT IGNORE INTO role_permissions_tbl (role_id, permission_id) VALUES
-- Admin gets all permissions
('ROLE_ADMIN', 'PERM_DASHBOARD_VIEW'),
('ROLE_ADMIN', 'PERM_SALES_VIEW'),
('ROLE_ADMIN', 'PERM_SALES_CREATE'),
('ROLE_ADMIN', 'PERM_STORE_VIEW'),
('ROLE_ADMIN', 'PERM_STORE_MANAGE'),
('ROLE_ADMIN', 'PERM_USERS_VIEW'),
('ROLE_ADMIN', 'PERM_USERS_MANAGE'),
('ROLE_ADMIN', 'PERM_REPORTS_VIEW'),
('ROLE_ADMIN', 'PERM_MAINTENANCE_VIEW'),
('ROLE_ADMIN', 'PERM_MAINTENANCE_MANAGE'),
('ROLE_ADMIN', 'PERM_ACCESS_CONTROL'),
-- Manager gets most permissions except access control
('ROLE_MANAGER', 'PERM_DASHBOARD_VIEW'),
('ROLE_MANAGER', 'PERM_SALES_VIEW'),
('ROLE_MANAGER', 'PERM_SALES_CREATE'),
('ROLE_MANAGER', 'PERM_STORE_VIEW'),
('ROLE_MANAGER', 'PERM_STORE_MANAGE'),
('ROLE_MANAGER', 'PERM_USERS_VIEW'),
('ROLE_MANAGER', 'PERM_REPORTS_VIEW'),
('ROLE_MANAGER', 'PERM_MAINTENANCE_VIEW'),
('ROLE_MANAGER', 'PERM_MAINTENANCE_MANAGE'),
-- Staff gets basic permissions
('ROLE_STAFF', 'PERM_DASHBOARD_VIEW'),
('ROLE_STAFF', 'PERM_SALES_VIEW'),
('ROLE_STAFF', 'PERM_STORE_VIEW'),
('ROLE_STAFF', 'PERM_USERS_VIEW'),
-- Cashier gets sales and store permissions
('ROLE_CASHIER', 'PERM_SALES_VIEW'),
('ROLE_CASHIER', 'PERM_SALES_CREATE'),
('ROLE_CASHIER', 'PERM_STORE_VIEW'),
('ROLE_CASHIER', 'PERM_STORE_MANAGE');

CREATE DATABASE IF NOT EXISTS pitch_futebol CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pitch_futebol;

-- =============================================
-- TABELAS
-- =============================================

-- Users (cliente + admin)
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  username VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  cpf_hash CHAR(64) NULL,
  phone VARCHAR(30) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email),
  INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- Categorias
CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(80) NOT NULL,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(255) NULL,
  image_url VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_categories_slug (slug),
  INDEX idx_categories_name (name)
) ENGINE=InnoDB;

-- Produtos
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT UNSIGNED NOT NULL,
  brand VARCHAR(80) NOT NULL,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(220) NULL,

  price DECIMAL(10,2) NOT NULL,
  old_price DECIMAL(10,2) NULL,
  currency CHAR(3) NOT NULL DEFAULT 'BRL',

  image_url VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,

  sizes_json JSON NOT NULL,
  stock_qty INT UNSIGNED NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories(id)
    ON DELETE RESTRICT,

  INDEX idx_products_category_id (category_id),
  INDEX idx_products_is_featured (is_featured),
  INDEX idx_products_is_active (is_active),
  INDEX idx_products_brand (brand)
) ENGINE=InnoDB;

-- Cupons
CREATE TABLE IF NOT EXISTS coupons (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(60) NOT NULL,
  discount_type ENUM('percent','fixed') NOT NULL,
  discount_value DECIMAL(10,2) NOT NULL,

  min_subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  max_discount_amount DECIMAL(10,2) NULL,

  expires_at DATETIME NULL,
  usage_limit INT UNSIGNED NOT NULL DEFAULT 0,
  used_count INT UNSIGNED NOT NULL DEFAULT 0,

  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uk_coupons_code (code),
  INDEX idx_coupons_active (is_active)
) ENGINE=InnoDB;

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,

  customer_name VARCHAR(120) NOT NULL,
  customer_cpf_hash CHAR(64) NULL,
  email VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NULL,

  cep VARCHAR(9) NOT NULL,
  street VARCHAR(160) NOT NULL,
  number VARCHAR(20) NOT NULL,
  complement VARCHAR(80) NULL,
  bairro VARCHAR(120) NOT NULL,
  city VARCHAR(120) NOT NULL,
  state CHAR(2) NOT NULL,

  payment_method ENUM('pix','cartao','boleto') NOT NULL,

  subtotal_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,

  coupon_id INT UNSIGNED NULL,
  coupon_code_snapshot VARCHAR(60) NULL,

  status ENUM('pending','paid','cancelled','refunded') NOT NULL DEFAULT 'pending',

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_orders_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL,

  CONSTRAINT fk_orders_coupon
    FOREIGN KEY (coupon_id) REFERENCES coupons(id)
    ON DELETE SET NULL,

  INDEX idx_orders_created_at (created_at),
  INDEX idx_orders_user_id (user_id),
  INDEX idx_orders_status (status)
) ENGINE=InnoDB;

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id INT NOT NULL,
  product_name_snapshot VARCHAR(200) NOT NULL,
  product_brand_snapshot VARCHAR(80) NOT NULL,
  size VARCHAR(10) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  qty INT UNSIGNED NOT NULL,
  line_total DECIMAL(10,2) NOT NULL,

  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE CASCADE,

  INDEX idx_order_items_order_id (order_id),
  INDEX idx_order_items_product_id (product_id)
) ENGINE=InnoDB;

-- Stock movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  qty_change INT NOT NULL,
  movement_type ENUM('in','out','adjust') NOT NULL,
  reason VARCHAR(200) NULL,

  order_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_stock_movements_order
    FOREIGN KEY (order_id) REFERENCES orders(id)
    ON DELETE SET NULL,

  INDEX idx_stock_movements_product_id (product_id),
  INDEX idx_stock_movements_created_at (created_at)
) ENGINE=InnoDB;

-- =============================================
-- REVIEW (necessário para avaliações)
-- (você pediu avaliações; incluo aqui para o sistema ficar completo)
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  name_snapshot VARCHAR(120) NULL,

  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NULL,

  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

  UNIQUE KEY uk_reviews_product_user (product_id, user_id),
  INDEX idx_reviews_product_id (product_id)
) ENGINE=InnoDB;

-- =============================================
-- Constraints de estoque (opcional)
-- =============================================
-- (We keep it simple; stock validations happen in services/transactions)


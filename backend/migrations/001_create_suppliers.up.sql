CREATE TABLE suppliers (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(100) NOT NULL,
    description    VARCHAR(255),
    endpoint_url   VARCHAR(500) NOT NULL,
    auth_type      VARCHAR(20)  NOT NULL DEFAULT 'none',
    auth_token     TEXT,
    timeout_ms     INTEGER      NOT NULL DEFAULT 2000 CHECK (timeout_ms BETWEEN 500 AND 10000),
    is_active      BOOLEAN      NOT NULL DEFAULT true,
    mock_behavior  VARCHAR(20)  NOT NULL DEFAULT 'success',
    display_order  INTEGER      NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    deleted_at     TIMESTAMPTZ  -- [BARU] Kolom untuk Soft Deletes
);

CREATE UNIQUE INDEX uq_supplier_name ON suppliers (LOWER(name));

CREATE INDEX idx_suppliers_active ON suppliers (is_active, display_order)
    WHERE is_active = true AND deleted_at IS NULL;

-- Masukkan Data Seed
INSERT INTO suppliers 
    (name, description, endpoint_url, auth_type, timeout_ms, mock_behavior, display_order)
VALUES
    ('Tokopedia Store', 'Official store di Tokopedia', 'https://mock.tokopedia.com/stock', 'none', 2000, 'success', 1),
    ('Shopee Official', 'Official store di Shopee', 'https://mock.shopee.com/stock', 'none', 2000, 'random_error', 2),
    ('Gudang Jakarta', 'Gudang utama Jakarta Pusat', 'https://mock.warehouse-jkt.internal/stock', 'none', 2000, 'timeout', 3),
    ('Lazada Partner', 'Authorized reseller di Lazada', 'https://mock.lazada.com/stock', 'none', 2000, 'success', 4);
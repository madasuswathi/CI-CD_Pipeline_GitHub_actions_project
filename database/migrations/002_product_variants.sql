-- FarmFresh product variants migration
-- PREPARATION ONLY: DO NOT EXECUTE IN PRODUCTION YET.
--
-- Creates the variant table.
-- Existing product prices and stock remain unchanged.
-- Every new variant must initially have stock = 0.
-- Variants must be deactivated, not hard-deleted.

CREATE TABLE IF NOT EXISTS product_variants (
    id INT NOT NULL AUTO_INCREMENT,
    product_id INT NOT NULL,
    variant_label VARCHAR(50) NOT NULL,
    quantity_value DECIMAL(10,2) NOT NULL,
    unit VARCHAR(10) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY unique_product_variant (product_id, variant_label),
    KEY idx_variant_product (product_id),
    CONSTRAINT fk_variant_product
        FOREIGN KEY (product_id)
        REFERENCES products(id)
        ON DELETE RESTRICT
) ENGINE=InnoDB;

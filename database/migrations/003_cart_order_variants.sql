-- FarmFresh cart and order variant support
-- PREPARATION ONLY: DO NOT EXECUTE IN PRODUCTION YET.
--
-- Prerequisites:
-- 1. product_variants table exists.
-- 2. All 219 product variants have been created.
-- 3. Cart is empty, verified immediately before migration.
-- 4. Application is in maintenance mode.
-- 5. A verified database backup exists.
--
-- Historical order items retain NULL variant_id and variant_label.
-- Never infer historical product sizes.
-- DDL statements may auto-commit in MySQL.

ALTER TABLE carts
    DROP INDEX unique_cart_item,
    ADD COLUMN variant_id INT NOT NULL AFTER product_id,
    ADD UNIQUE KEY unique_cart_variant
        (user_id, product_id, variant_id),
    ADD KEY idx_cart_variant_id (variant_id),
    ADD CONSTRAINT fk_cart_variant
        FOREIGN KEY (variant_id)
        REFERENCES product_variants(id)
        ON DELETE RESTRICT;

ALTER TABLE order_items
    ADD COLUMN variant_id INT NULL AFTER product_id,
    ADD COLUMN variant_label VARCHAR(50) NULL AFTER variant_id,
    ADD KEY idx_order_item_variant (variant_id),
    ADD CONSTRAINT fk_order_item_variant
        FOREIGN KEY (variant_id)
        REFERENCES product_variants(id)
        ON DELETE RESTRICT;

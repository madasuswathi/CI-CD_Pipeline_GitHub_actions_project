
USE farmfresh_db;

INSERT INTO categories (name, slug) VALUES
('Honey', 'honey'),
('Ghee', 'ghee'),
('Pickles', 'pickles'),
('Oils', 'oils'),
('Spices', 'spices'),
('Snacks', 'snacks');

INSERT INTO products
(name, description, category_id, price, image, stock, featured)
VALUES
(
    'Pure Forest Honey',
    'Natural forest honey with rich flavor.',
    1,
    499,
    'https://placehold.co/500x500/f5ead6/4b3621?text=Forest+Honey',
    50,
    TRUE
),
(
    'Traditional A2 Cow Ghee',
    'Traditional style ghee for everyday cooking.',
    2,
    899,
    'https://placehold.co/500x500/f5ead6/4b3621?text=Cow+Ghee',
    40,
    TRUE
),
(
    'Homemade Mango Pickle',
    'Traditional mango pickle with authentic spices.',
    3,
    299,
    'https://placehold.co/500x500/f5ead6/4b3621?text=Mango+Pickle',
    60,
    TRUE
),
(
    'Cold Pressed Groundnut Oil',
    'Cold pressed groundnut oil for cooking.',
    4,
    599,
    'https://placehold.co/500x500/f5ead6/4b3621?text=Groundnut+Oil',
    35,
    TRUE
),
(
    'Organic Turmeric Powder',
    'Aromatic turmeric powder for daily use.',
    5,
    199,
    'https://placehold.co/500x500/f5ead6/4b3621?text=Turmeric',
    100,
    FALSE
),
(
    'Millet Snack Mix',
    'Crunchy snack made with millet.',
    6,
    249,
    'https://placehold.co/500x500/f5ead6/4b3621?text=Millet+Snacks',
    45,
    FALSE
);

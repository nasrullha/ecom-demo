-- =============================================================================
-- OPTIONAL demo data so the shop is not empty while you try it out.
-- Run in the Supabase SQL Editor AFTER schema.sql.
-- You can delete all of it later from Admin -> Products / Categories.
-- Demo products have no photos: open Admin -> Products -> Edit to add some.
-- =============================================================================

insert into public.categories (name, slug, description, sort_order) values
  ('Apparel',     'apparel',     'T-shirts, hoodies and everyday wear.', 1),
  ('Accessories', 'accessories', 'Bags, caps and small things you carry.', 2),
  ('Home',        'home',        'Mugs, prints and things for your space.', 3)
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, brand, description, price, compare_at_price, option_names, is_featured)
select c.id, v.name, v.slug, v.brand, v.description, v.price, v.compare_at_price, v.option_names, v.is_featured
from (values
  ('apparel',     'Everyday Cotton Tee',  'everyday-cotton-tee',  'Studio', 'Heavyweight 100% cotton t-shirt with a relaxed fit. Pre-washed so it keeps its shape.', 24.00::numeric, 30.00::numeric, array['Color','Size'], true),
  ('apparel',     'Fleece Hoodie',        'fleece-hoodie',        'Studio', 'Soft brushed fleece inside, durable outer knit, kangaroo pocket.',                     58.00::numeric, null::numeric,  array['Size'],          true),
  ('accessories', 'Canvas Tote Bag',      'canvas-tote-bag',      'Studio', 'Sturdy 12 oz canvas tote with an inside pocket. Holds a laptop and groceries.',          18.00::numeric, null::numeric,  array['Color'],         false),
  ('accessories', 'Wool Cap',             'wool-cap',             'Studio', 'Warm knitted cap, one size fits most.',                                                 16.00::numeric, 20.00::numeric, array[]::text[],        false),
  ('home',        'Ceramic Mug',          'ceramic-mug',          'Studio', 'Hand-glazed 350 ml mug. Dishwasher and microwave safe.',                                14.00::numeric, null::numeric,  array['Color'],         true),
  ('home',        'Framed Art Print',     'framed-art-print',     'Studio', 'Archival print in a solid wood frame, ready to hang.',                                  45.00::numeric, null::numeric,  array['Size'],          false)
) as v(cat, name, slug, brand, description, price, compare_at_price, option_names, is_featured)
join public.categories c on c.slug = v.cat
on conflict (slug) do nothing;

insert into public.product_variants (product_id, sku, name, options, price, stock, sort_order)
select p.id, v.sku, v.name, v.options::jsonb, v.price, v.stock, v.sort_order
from (values
  ('everyday-cotton-tee', 'TEE-BLK-S', 'Black / S', '{"Color":"Black","Size":"S"}', null::numeric, 12, 1),
  ('everyday-cotton-tee', 'TEE-BLK-M', 'Black / M', '{"Color":"Black","Size":"M"}', null::numeric, 20, 2),
  ('everyday-cotton-tee', 'TEE-BLK-L', 'Black / L', '{"Color":"Black","Size":"L"}', null::numeric, 3,  3),
  ('everyday-cotton-tee', 'TEE-WHT-S', 'White / S', '{"Color":"White","Size":"S"}', null::numeric, 8,  4),
  ('everyday-cotton-tee', 'TEE-WHT-M', 'White / M', '{"Color":"White","Size":"M"}', null::numeric, 0,  5),
  ('everyday-cotton-tee', 'TEE-WHT-L', 'White / L', '{"Color":"White","Size":"L"}', null::numeric, 10, 6),
  ('fleece-hoodie', 'HOOD-S', 'S', '{"Size":"S"}', null::numeric, 6, 1),
  ('fleece-hoodie', 'HOOD-M', 'M', '{"Size":"M"}', null::numeric, 9, 2),
  ('fleece-hoodie', 'HOOD-L', 'L', '{"Size":"L"}', 62.00::numeric, 4, 3),
  ('canvas-tote-bag', 'TOTE-NAT', 'Natural', '{"Color":"Natural"}', null::numeric, 30, 1),
  ('canvas-tote-bag', 'TOTE-BLK', 'Black',   '{"Color":"Black"}',   null::numeric, 25, 2),
  ('wool-cap', 'CAP-1', 'Default', '{}', null::numeric, 15, 1),
  ('ceramic-mug', 'MUG-WHT', 'White', '{"Color":"White"}', null::numeric, 40, 1),
  ('ceramic-mug', 'MUG-SGE', 'Sage',  '{"Color":"Sage"}',  null::numeric, 22, 2),
  ('framed-art-print', 'PRINT-A4', 'A4', '{"Size":"A4"}', null::numeric, 10, 1),
  ('framed-art-print', 'PRINT-A3', 'A3', '{"Size":"A3"}', 65.00::numeric, 5, 2)
) as v(slug, sku, name, options, price, stock, sort_order)
join public.products p on p.slug = v.slug
on conflict (sku) do nothing;

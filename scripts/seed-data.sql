-- SEED DATA for eRiders MVP
-- Run after main schema migration

-- Insert sample admin
INSERT INTO admin (name, whatsapp, email, auth_token) VALUES
('Admin User', '+254768677516', 'admin@eriders.app', 'eriders_admin_token_2025');

-- Insert sample riders
INSERT INTO riders (name, whatsapp, active, last_lat, last_lng) VALUES
('John Kamau', '+254723456789', true, -1.286389, 36.817223),
('Mary Wanjiku', '+254734567890', true, -1.292066, 36.821946),
('Peter Ochieng', '+254745678901', false, -1.300000, 36.830000);

-- Insert sample order
INSERT INTO orders (
    order_id,
    client_name,
    client_whatsapp,
    preferred_shop,
    order_desc,
    delivery_location_text,
    pickup_lat,
    pickup_lng,
    delivery_lat,
    delivery_lng,
    status
) VALUES (
    'ER-2025-001',
    'Alice Muthoni',
    '+254756789012',
    'Naivas Westlands',
    '2kg rice, 1L milk, bread',
    'Kilimani, Argwings Kodhek Road, opposite Yaya Centre',
    -1.292066,
    36.821946,
    -1.290270,
    36.782610,
    'pending'
);

-- Log the sample order creation
SELECT log_event(
    (SELECT id FROM orders WHERE order_id = 'ER-2025-001'),
    'client',
    'order_created',
    '{"source": "web", "test_data": true}'::jsonb
);

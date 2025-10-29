-- eRiders MVP - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE order_status AS ENUM ('pending', 'assigned', 'on_route', 'delivered', 'cancelled');
CREATE TYPE event_actor AS ENUM ('client', 'admin', 'rider', 'system');

-- RIDERS TABLE
CREATE TABLE riders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    last_lat DECIMAL(10, 8),
    last_lng DECIMAL(11, 8),
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ADMIN TABLE
CREATE TABLE admin (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    email TEXT UNIQUE,
    auth_token TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDERS TABLE
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id TEXT UNIQUE NOT NULL,
    
    -- Client info
    client_name TEXT NOT NULL,
    client_whatsapp TEXT NOT NULL,
    
    -- Order details
    preferred_shop TEXT,
    order_desc TEXT NOT NULL,
    delivery_location_text TEXT NOT NULL,
    
    -- Coordinates
    pickup_lat DECIMAL(10, 8),
    pickup_lng DECIMAL(11, 8),
    delivery_lat DECIMAL(10, 8),
    delivery_lng DECIMAL(11, 8),
    
    -- Rider assignment
    rider_id UUID REFERENCES riders(id),
    rider_name TEXT,
    rider_whatsapp TEXT,
    rider_lat DECIMAL(10, 8),
    rider_lng DECIMAL(11, 8),
    
    -- Tracking
    tracking_link TEXT,
    google_maps_link TEXT,
    
    -- Status
    status order_status DEFAULT 'pending',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_at TIMESTAMPTZ,
    on_route_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ
);

-- EVENTS TABLE (for logging and future ML)
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    actor event_actor NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    ts TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES for performance
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_id ON orders(order_id);
CREATE INDEX idx_events_order_id ON events(order_id);
CREATE INDEX idx_events_ts ON events(ts DESC);
CREATE INDEX idx_riders_active ON riders(active);

-- AUTO UPDATE updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- FUNCTION: Generate Order ID
CREATE OR REPLACE FUNCTION generate_order_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    year TEXT;
    seq INT;
BEGIN
    year := TO_CHAR(NOW(), 'YYYY');
    
    -- Get the next sequence number for this year
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(order_id FROM 'ER-' || year || '-(.*)') AS INT)
    ), 0) + 1 INTO seq
    FROM orders
    WHERE order_id LIKE 'ER-' || year || '-%';
    
    new_id := 'ER-' || year || '-' || LPAD(seq::TEXT, 3, '0');
    RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- FUNCTION: Log event
CREATE OR REPLACE FUNCTION log_event(
    p_order_id UUID,
    p_actor event_actor,
    p_event_type TEXT,
    p_payload JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO events (order_id, actor, event_type, payload)
    VALUES (p_order_id, p_actor, p_event_type, p_payload)
    RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert orders (public order form)
CREATE POLICY "Public can insert orders"
    ON orders FOR INSERT
    WITH CHECK (true);

-- Policy: Anyone can read orders (for tracking)
CREATE POLICY "Public can read orders"
    ON orders FOR SELECT
    USING (true);

-- Policy: Only authenticated users can update orders
CREATE POLICY "Authenticated can update orders"
    ON orders FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Policy: Public can read active riders
CREATE POLICY "Public can read active riders"
    ON riders FOR SELECT
    USING (active = true);

-- Policy: Anyone can insert events (logging)
CREATE POLICY "Public can insert events"
    ON events FOR INSERT
    WITH CHECK (true);

-- Policy: Public can read events
CREATE POLICY "Public can read events"
    ON events FOR SELECT
    USING (true);

-- TRIGGER: Auto-log order creation
CREATE OR REPLACE FUNCTION log_order_creation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM log_event(
        NEW.id,
        'client',
        'order_created',
        jsonb_build_object(
            'order_id', NEW.order_id,
            'client_name', NEW.client_name,
            'delivery_location', NEW.delivery_location_text
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_order_creation
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_order_creation();

-- TRIGGER: Auto-log status changes
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM log_event(
            NEW.id,
            'system',
            'status_changed',
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'rider_name', NEW.rider_name
            )
        );
        
        -- Update timestamp fields based on status
        IF NEW.status = 'assigned' THEN
            NEW.assigned_at = NOW();
        ELSIF NEW.status = 'on_route' THEN
            NEW.on_route_at = NOW();
        ELSIF NEW.status = 'delivered' THEN
            NEW.delivered_at = NOW();
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_status_change
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_status_change();

-- COMMENTS for documentation
COMMENT ON TABLE orders IS 'Main orders table storing all delivery requests';
COMMENT ON TABLE riders IS 'Active delivery riders with real-time location tracking';
COMMENT ON TABLE events IS 'Event sourcing log for all system actions - used for analytics and ML';
COMMENT ON COLUMN orders.order_id IS 'Human-readable order ID in format ER-YYYY-XXX';
COMMENT ON COLUMN orders.tracking_link IS 'Branded eRiders tracking URL shared with client';
COMMENT ON COLUMN events.payload IS 'JSON data specific to each event type for future analysis';

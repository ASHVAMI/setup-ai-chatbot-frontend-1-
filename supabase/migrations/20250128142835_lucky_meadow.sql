/*
  # Initial Schema Setup

  1. New Tables
    - products
      - id (uuid, primary key)
      - name (text)
      - brand (text)
      - price (numeric)
      - category (text)
      - description (text)
      - supplier_id (uuid, foreign key)
      - created_at (timestamp)
    
    - suppliers
      - id (uuid, primary key)
      - name (text)
      - email (text)
      - phone (text)
      - categories (text[])
      - created_at (timestamp)
    
    - chat_messages
      - id (uuid, primary key)
      - role (text)
      - content (text)
      - created_at (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL,
  price numeric NOT NULL,
  category text NOT NULL,
  description text,
  supplier_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  categories text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE products
ADD CONSTRAINT fk_supplier
FOREIGN KEY (supplier_id)
REFERENCES suppliers(id);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to all users"
ON products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access to all users"
ON suppliers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access to all users"
ON chat_messages FOR SELECT
TO authenticated
USING (true);

-- Insert sample data
INSERT INTO suppliers (name, email, phone, categories) VALUES
('TechCorp', 'contact@techcorp.com', '+1-555-0123', ARRAY['Electronics', 'Computers']),
('Office Solutions', 'sales@officesolutions.com', '+1-555-0124', ARRAY['Office Supplies', 'Furniture']);

INSERT INTO products (name, brand, price, category, description, supplier_id) VALUES
('Gaming Laptop', 'TechPro', 1299.99, 'Electronics', 'High-performance gaming laptop', (SELECT id FROM suppliers WHERE name = 'TechCorp')),
('Office Chair', 'ComfortPlus', 299.99, 'Furniture', 'Ergonomic office chair', (SELECT id FROM suppliers WHERE name = 'Office Solutions'));
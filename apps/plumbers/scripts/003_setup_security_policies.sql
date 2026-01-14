-- Enable Row Level Security on the plumbers table
ALTER TABLE plumbers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to all plumber data
-- This allows anyone to view the plumber directory without authentication
CREATE POLICY "Allow public read access to plumbers" ON plumbers
    FOR SELECT
    USING (true);

-- Policy: Allow service role to perform all operations
-- This allows the application to manage plumber data via service role key
CREATE POLICY "Allow service role full access to plumbers" ON plumbers
    FOR ALL
    USING (auth.role() = 'service_role');

-- Policy: Restrict public write access
-- Only authenticated users with proper permissions can modify plumber data
CREATE POLICY "Restrict public write access to plumbers" ON plumbers
    FOR INSERT
    WITH CHECK (false);

CREATE POLICY "Restrict public update access to plumbers" ON plumbers
    FOR UPDATE
    USING (false);

CREATE POLICY "Restrict public delete access to plumbers" ON plumbers
    FOR DELETE
    USING (false);

-- Grant necessary permissions
GRANT SELECT ON plumbers TO anon;
GRANT SELECT ON plumbers TO authenticated;
GRANT ALL ON plumbers TO service_role;

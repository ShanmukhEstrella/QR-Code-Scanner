/*
  # QR Code Attendance System Schema

  1. New Tables
    - `attendees`
      - `id` (uuid, primary key)
      - `name` (text, required) - Attendee name
      - `entry_gate` (text, required) - Entry gate assignment
      - `seating_position` (text, required) - Seating position
      - `qr_code` (text, unique, required) - Unique QR code identifier
      - `created_by` (uuid, references auth.users) - User who created this entry
      - `created_at` (timestamptz) - Creation timestamp

    - `scans`
      - `id` (uuid, primary key)
      - `attendee_id` (uuid, references attendees) - Reference to attendee
      - `scanned_at` (timestamptz, default now) - Time of scan
      - `scanned_by` (uuid, references auth.users) - User who scanned the QR
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on both tables
    - Authenticated users can manage their own attendees
    - Authenticated users can create scans
    - Authenticated users can view all scans (for verification)
*/

-- Create attendees table
CREATE TABLE IF NOT EXISTS attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  entry_gate text NOT NULL,
  seating_position text NOT NULL,
  qr_code text UNIQUE NOT NULL,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create scans table
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id uuid REFERENCES attendees(id) ON DELETE CASCADE NOT NULL,
  scanned_at timestamptz DEFAULT now(),
  scanned_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Attendees policies
CREATE POLICY "Users can view all attendees"
  ON attendees FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own attendees"
  ON attendees FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own attendees"
  ON attendees FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete their own attendees"
  ON attendees FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Scans policies
CREATE POLICY "Users can view all scans"
  ON scans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create scans"
  ON scans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = scanned_by);

-- Create index for faster QR code lookups
CREATE INDEX IF NOT EXISTS idx_attendees_qr_code ON attendees(qr_code);
CREATE INDEX IF NOT EXISTS idx_scans_attendee_id ON scans(attendee_id);

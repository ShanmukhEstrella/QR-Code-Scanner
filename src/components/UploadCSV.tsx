import { useState } from 'react';
import { Upload, Download, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import QRCodeDisplay from './QRCodeDisplay';

type AttendeeData = {
  name: string;
  entry_gate: string;
  seating_position: string;
  qr_code?: string;
  id?: string;
};

export default function UploadCSV() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const { user } = useAuth();

  const generateQRCode = () => {
    return `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const parseCSV = (text: string): AttendeeData[] => {
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

    const nameIndex = headers.findIndex(h => h.includes('name'));
    const gateIndex = headers.findIndex(h => h.includes('entry') || h.includes('gate'));
    const seatIndex = headers.findIndex(h => h.includes('seat'));

    if (nameIndex === -1 || gateIndex === -1 || seatIndex === -1) {
      throw new Error('CSV must contain columns: name, entry_gate, seating_position');
    }

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      return {
        name: values[nameIndex],
        entry_gate: values[gateIndex],
        seating_position: values[seatIndex],
      };
    }).filter(attendee => attendee.name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid CSV file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const text = await file.text();
      const parsedAttendees = parseCSV(text);

      const attendeesWithQR = parsedAttendees.map(attendee => ({
        ...attendee,
        qr_code: generateQRCode(),
        created_by: user.id,
      }));

      const { data, error: insertError } = await supabase
        .from('attendees')
        .insert(attendeesWithQR)
        .select();

      if (insertError) throw insertError;

      setAttendees(data || []);
      setSuccess(`Successfully uploaded ${data?.length || 0} attendees with QR codes!`);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleCSV = () => {
    const csv = 'name,entry_gate,seating_position\nJohn Doe,Gate A,A-101\nJane Smith,Gate B,B-205';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_attendees.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Upload Attendees</h2>
          <button
            onClick={downloadSampleCSV}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
          >
            <Download className="w-4 h-4" />
            Download Sample CSV
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center justify-between">
            <span>{success}</span>
            <button onClick={() => setSuccess('')}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
          >
            Choose CSV file
          </label>
          <p className="text-sm text-gray-500 mt-2">
            CSV should contain: name, entry_gate, seating_position
          </p>
          {file && (
            <p className="text-sm text-gray-700 mt-3 font-medium">
              Selected: {file.name}
            </p>
          )}
        </div>

        {file && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload and Generate QR Codes'}
          </button>
        )}
      </div>

      {attendees.length > 0 && (
        <QRCodeDisplay attendees={attendees} />
      )}
    </div>
  );
}

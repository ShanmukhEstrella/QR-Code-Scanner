import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, CheckCircle, Clock, Download } from 'lucide-react';
import QRCode from 'qrcode';

type AttendeeWithScan = {
  id: string;
  name: string;
  entry_gate: string;
  seating_position: string;
  qr_code: string;
  created_at: string;
  scan?: {
    scanned_at: string;
  };
};

export default function AttendeesList() {
  const [attendees, setAttendees] = useState<AttendeeWithScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAttendees();
  }, []);

  const loadAttendees = async () => {
    setLoading(true);
    try {
      const { data: attendeesData, error: attendeesError } = await supabase
        .from('attendees')
        .select('*')
        .order('created_at', { ascending: false });

      if (attendeesError) throw attendeesError;

      const { data: scansData, error: scansError } = await supabase
        .from('scans')
        .select('*');

      if (scansError) throw scansError;

      const attendeesWithScans = (attendeesData || []).map((attendee) => {
        const scan = scansData?.find((s) => s.attendee_id === attendee.id);
        return {
          ...attendee,
          scan: scan ? { scanned_at: scan.scanned_at } : undefined,
        };
      });

      setAttendees(attendeesWithScans);
    } catch (error) {
      console.error('Error loading attendees:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = async (attendee: AttendeeWithScan) => {
    const canvas = document.createElement('canvas');
    await QRCode.toCanvas(canvas, attendee.qr_code, {
      width: 400,
      margin: 2,
    });
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${attendee.name.replace(/\s+/g, '-')}.png`;
    a.click();
  };

  const filteredAttendees = attendees.filter((attendee) =>
    attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendee.entry_gate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendee.seating_position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scannedCount = attendees.filter((a) => a.scan).length;
  const totalCount = attendees.length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">All Attendees</h2>
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-gray-600">Scanned: </span>
              <span className="font-semibold text-green-600">{scannedCount}</span>
              <span className="text-gray-600"> / {totalCount}</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search by name, gate, or seat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading attendees...</p>
        </div>
      ) : filteredAttendees.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm ? 'No attendees found matching your search' : 'No attendees yet'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Entry Gate
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Seating Position
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Scan Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAttendees.map((attendee) => (
                <tr key={attendee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {attendee.scan ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400" />
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {attendee.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {attendee.entry_gate}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {attendee.seating_position}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {attendee.scan ? (
                      <span className="text-sm">
                        {new Date(attendee.scan.scanned_at).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">Not scanned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => downloadQR(attendee)}
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
                    >
                      <Download className="w-4 h-4" />
                      QR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

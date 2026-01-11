import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Search, CheckCircle, Clock, Download, Users } from "lucide-react";
import QRCode from "qrcode";

type AttendeeWithScan = {
  id: string;
  Name: string;
  Gate: string;
  Passtype: string;
  Quantity: number;
  Email: string;
  qr_code: string;
  created_at: string;
  scan?: {
    scanned_at: string;
  };
};

export default function AttendeesList() {
  const [attendees, setAttendees] = useState<AttendeeWithScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadAttendees();
  }, []);

  const loadAttendees = async () => {
    setLoading(true);
    try {
      const { data: attendeesData, error: attendeesError } = await supabase
        .from("attendees")
        .select("*")
        .order("created_at", { ascending: false });

      if (attendeesError) throw attendeesError;

      const { data: scansData, error: scansError } = await supabase
        .from("scans")
        .select("*");

      if (scansError) throw scansError;

      const attendeesWithScans = (attendeesData || []).map((a) => {
        const scan = scansData?.find((s) => s.attendee_id === a.id);
        return {
          ...a,
          scan: scan ? { scanned_at: scan.scanned_at } : undefined
        };
      });

      setAttendees(attendeesWithScans);
    } catch (err) {
      console.error("Failed to load attendees:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = async (attendee: AttendeeWithScan) => {
    const canvas = document.createElement("canvas");
    await QRCode.toCanvas(canvas, attendee.qr_code, { width: 400 });
    const url = canvas.toDataURL("image/png");

    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${attendee.Name.replace(/\s+/g, "-")}.png`;
    a.click();
  };

  const filteredAttendees = attendees.filter((a) =>
    a.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.Gate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.Passtype || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scannedCount = attendees.filter((a) => a.scan).length;

  return (
    <div className="bg-white rounded-xl shadow border p-6">
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold">Attendees</h2>
        <div>
          <span className="text-gray-600">Scanned:</span>{" "}
          <span className="font-bold text-green-600">{scannedCount}</span> /{" "}
          {attendees.length}
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input
          className="w-full pl-9 py-2 border rounded"
          placeholder="Search by name, gate, pass..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <p className="text-center">Loading...</p>
      ) : filteredAttendees.length === 0 ? (
        <div className="text-center text-gray-500">
          <Users className="mx-auto mb-2" />
          No attendees
        </div>
      ) : (
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th>Status</th>
              <th>Name</th>
              <th>Gate</th>
              <th>Pass</th>
              <th>Scan Time</th>
              <th>QR</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendees.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="text-center">
                  {a.scan ? (
                    <CheckCircle className="text-green-500" />
                  ) : (
                    <Clock className="text-gray-400" />
                  )}
                </td>
                <td>{a.Name}</td>
                <td>{a.Gate}</td>
                <td>{a.Passtype}</td>
                <td>
                  {a.scan
                    ? new Date(a.scan.scanned_at).toLocaleString()
                    : "Not scanned"}
                </td>
                <td>
                  <button
                    onClick={() => downloadQR(a)}
                    className="text-blue-600"
                  >
                    <Download />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

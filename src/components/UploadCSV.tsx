import { useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import QRCodeDisplay from "./QRCodeDisplay";

type AttendeeData = {
  Name: string;
  Passtype: string;
  Quantity: number;
  Email: string;
  Gate: string;
  qr_code?: string;
};

export default function UploadCSV() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const { user } = useAuth();

  const generateUUID = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });

  const parseCSV = (text: string): AttendeeData[] => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

    const idx = (name: string) => headers.indexOf(name);

    const nameI = idx("name");
    const passI = idx("passtype");
    const qtyI = idx("quantity");
    const emailI = idx("email");
    const gateI = idx("gate");

    if (nameI === -1 || gateI === -1) {
      throw new Error("CSV must contain Name and Gate columns");
    }

    return lines.slice(1).map(line => {
      const v = line.split(",").map(x => x.trim());
      return {
        Name: v[nameI],
        Passtype: passI !== -1 ? v[passI] : "Regular",
        Quantity: qtyI !== -1 ? Number(v[qtyI]) || 1 : 1,
        Email: emailI !== -1 ? v[emailI] : "",
        Gate: v[gateI]
      };
    }).filter(a => a.Name && a.Gate);
  };

  const handleUpload = async () => {
    if (!file || !user) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const text = await file.text();
      const parsed = parseCSV(text);

      const rows = parsed.map(a => ({
        ...a,
        qr_code: generateUUID(),
        created_by: user.id
      }));

      const { data, error } = await supabase
        .from("attendees")
        .insert(rows)
        .select();

      if (error) throw error;

      setAttendees(data || []);
      setSuccess(`Uploaded ${data?.length} records`);
      setFile(null);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleCSV = () => {
    const csv =
      "Name,Passtype,Quantity,Email,Gate\n" +
      "John Doe,VIP,1,john@gmail.com,Gate A\n" +
      "Jane Smith,Regular,2,jane@gmail.com,Gate B";

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border shadow">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">Upload Attendees</h2>
          <button onClick={downloadSampleCSV} className="text-blue-600 flex gap-2">
            <Download size={16} /> Sample CSV
          </button>
        </div>

        {error && <div className="bg-red-100 p-3">{error}</div>}
        {success && <div className="bg-green-100 p-3">{success}</div>}

        <input
          type="file"
          accept=".csv"
          onChange={e => setFile(e.target.files?.[0] || null)}
        />

        {file && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
          >
            {uploading ? "Uploading..." : "Upload CSV"}
          </button>
        )}
      </div>

      {attendees.length > 0 && <QRCodeDisplay attendees={attendees} />}
    </div>
  );
}

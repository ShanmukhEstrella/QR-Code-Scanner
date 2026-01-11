import { useState } from "react";
import { Upload, Download, X } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import QRCodeDisplay from "./QRCodeDisplay";

type AttendeeData = {
  Name: string;
  Gate: string;
  Passtype?: string;
  Quantity?: number;
  Email?: string;
  qr_code?: string;
  id?: string;
};

export default function UploadCSV() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);
  const { user } = useAuth();

  const parseCSV = (text: string): AttendeeData[] => {
    const lines = text.split("\n").filter(l => l.trim());
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

    const get = (row: string[], name: string) =>
      row[headers.indexOf(name)] || "";

    return lines.slice(1).map(line => {
      const v = line.split(",").map(x => x.trim());
      return {
        Name: get(v, "name"),
        Gate: get(v, "gate"),
        Passtype: get(v, "passtype"),
        Quantity: Number(get(v, "quantity")) || 1,
        Email: get(v, "email")
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
        Name: a.Name,
        Gate: a.Gate,
        Passtype: a.Passtype || "Regular",
        Quantity: a.Quantity || 1,
        Email: a.Email || "",
        qr_code: crypto.randomUUID(),
        created_by: user.id
      }));

      const { data, error } = await supabase
        .from("attendees")
        .insert(rows)
        .select();

      if (error) throw error;

      setAttendees(data || []);
      setSuccess(`Uploaded ${data?.length} attendees successfully`);
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

        <input type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0] || null)} />

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

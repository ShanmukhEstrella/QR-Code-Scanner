import { useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "../lib/supabase";
import QRCodeDisplay from "./QRCodeDisplay";

type AttendeeData = {
  id: string;
  Name: string;
  Email: string;
  Gate: string;
  Passtype: string;
  ticket_label: string;
  qr_code: string;
  email_batch: number;
};

export default function UploadCSV() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [attendees, setAttendees] = useState<AttendeeData[]>([]);

  const parseCSV = (text: string) => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    const idx = (n: string) => headers.indexOf(n);

    return lines.slice(1).map(l => {
      const v = l.split(",").map(x => x.trim());
      return {
        Name: v[idx("name")],
        Email: v[idx("email")],
        Gate: v[idx("gate")],
        Passtype: v[idx("passtype")] || "Regular",
        Quantity: Number(v[idx("quantity")]) || 1
      };
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const text = await file.text();
      const parsed = parseCSV(text);

      // Counters
      const emailBatch: Record<string, number> = {};
      const emailTicketCounter: Record<string, number> = {};

      const rows: any[] = [];

      parsed.forEach(row => {
        // Folder number
        emailBatch[row.Email] = (emailBatch[row.Email] || 0) + 1;
        const batch = emailBatch[row.Email];

        // Ticket numbering (global per email)
        if (!emailTicketCounter[row.Email]) {
          emailTicketCounter[row.Email] = 0;
        }

        for (let i = 0; i < row.Quantity; i++) {
          emailTicketCounter[row.Email]++;

          rows.push({
            Name: row.Name,
            Email: row.Email,
            Gate: row.Gate,
            Passtype: row.Passtype,
            Quantity: 1,
            ticket_label: `${row.Email}-${emailTicketCounter[row.Email]}`, // ✅ UNIQUE
            email_batch: batch,                                           // ✅ Folder number
            qr_code: crypto.randomUUID(),
            created_by: user.id
          });
        }
      });

      const { data, error } = await supabase.from("attendees").insert(rows).select();
      if (error) throw error;

      setAttendees(data || []);
      setSuccess(`Generated ${data?.length} QR tickets`);
      setFile(null);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleCSV = () => {
    const csv =
      "Name,Email,Passtype,Quantity,Gate\n" +
      "John Doe,john@gmail.com,VIP,3,Gate A\n" +
      "John Doe,john@gmail.com,Regular,2,Gate B\n" +
      "Jane Smith,jane@gmail.com,VIP,2,Gate C";

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sample.csv";
    a.click();
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

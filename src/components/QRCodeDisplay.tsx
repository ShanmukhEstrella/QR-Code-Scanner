import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, ChevronDown, ChevronUp } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

type Attendee = {
  id: string;
  Name: string;
  Email: string;
  Gate: string;
  Passtype: string;
  ticket_label: string; // email-1, email-2
};

type Props = {
  attendees: Attendee[];
};

function QRCodeCard({ attendee }: { attendee: Attendee }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, attendee.ticket_label, {
        width: 200,
        margin: 2
      });
    }
  }, [attendee.ticket_label]);

  const downloadQR = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${attendee.ticket_label}.png`;
    a.click();
  };

  return (
    <div className="bg-white border rounded-lg p-4 hover:shadow transition">
      <canvas ref={canvasRef} className="mx-auto mb-3" />

      <div className="text-center text-sm space-y-1">
        <p className="font-semibold">{attendee.Name}</p>
        <p>{attendee.ticket_label}</p>
        <p>Gate: {attendee.Gate}</p>
      </div>

      <button
        onClick={downloadQR}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        <Download size={16} /> Download QR
      </button>
    </div>
  );
}

export default function QRCodeDisplay({ attendees }: Props) {
  const [expanded, setExpanded] = useState(true);

  const downloadAllQR = async () => {
    const zip = new JSZip();

    for (const a of attendees) {
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, a.ticket_label, { width: 400, margin: 2 });

      const base64 = canvas.toDataURL("image/png").split(",")[1];

      // create folder for email
      const folder = zip.folder(a.Email);
      folder?.file(`${a.ticket_label}.png`, base64, { base64: true });
    }

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "QR_Tickets.zip");
  };

  return (
    <div className="bg-white rounded-xl shadow border p-6">
      <div className="flex justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">
            Generated QR Codes ({attendees.length})
          </h2>
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>

        <button
          onClick={downloadAllQR}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"
        >
          <Download size={16} /> Download All
        </button>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {attendees.map(a => (
            <QRCodeCard key={a.id} attendee={a} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, ChevronDown, ChevronUp } from "lucide-react";

type Attendee = {
  id: string;
  Name: string;
  Email: string;
  Gate: string;
  Passtype: string;
  ticket_label: string;   // SINGLE source of truth
};

type Props = {
  attendees: Attendee[];
};

function QRCodeCard({ attendee }: { attendee: Attendee }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Hard reset canvas
    const ctx = canvasRef.current.getContext("2d");
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    QRCode.toCanvas(canvasRef.current, attendee.ticket_label, {
      width: 200,
      margin: 2
    });
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
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <canvas ref={canvasRef} className="mx-auto mb-3" />
      <div className="text-center space-y-1">
        <h3 className="font-semibold text-gray-900">{attendee.ticket_label}</h3>
        <p className="text-sm text-gray-600">Gate: {attendee.Gate}</p>
        <p className="text-sm text-gray-500">{attendee.Email}</p>
      </div>

      <button
        onClick={downloadQR}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
      >
        <Download className="w-4 h-4" />
        Download QR
      </button>
    </div>
  );
}

export default function QRCodeDisplay({ attendees }: Props) {
  const [expanded, setExpanded] = useState(true);

  const downloadAllQR = async () => {
    for (const attendee of attendees) {
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, attendee.ticket_label, {
        width: 400,
        margin: 2
      });

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${attendee.ticket_label}.png`;
      a.click();

      await new Promise(r => setTimeout(r, 150));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">
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
          <Download size={16} />
          Download All
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

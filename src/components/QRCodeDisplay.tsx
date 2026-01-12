import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, ChevronDown, ChevronUp } from "lucide-react";

type Attendee = {
  id: string;
  Name: string;
  Email: string;
  Gate: string;
  Passtype: string;
  ticket_label: string;
};

type Props = {
  attendees: Attendee[];
};

function QRCodeCard({ attendee }: { attendee: Attendee }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, attendee.ticket_label, { width: 200, margin: 2 });
  }, [attendee.ticket_label]);

  const downloadQR = () => {
    const url = canvasRef.current!.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${attendee.ticket_label}.png`;
    a.click();
  };

  return (
    <div className="bg-white border rounded p-4">
      <canvas ref={canvasRef} className="mx-auto mb-2" />
      <p className="text-center font-bold">{attendee.ticket_label}</p>
      <p className="text-center text-sm">{attendee.Email}</p>
      <button onClick={downloadQR} className="mt-2 w-full bg-blue-600 text-white py-2 rounded">
        <Download size={16} /> Download
      </button>
    </div>
  );
}

export default function QRCodeDisplay({ attendees }: Props) {
  const [expanded, setExpanded] = useState(true);

  const downloadAllQR = async () => {
    for (const a of attendees) {
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, a.ticket_label, { width: 400 });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `${a.ticket_label}.png`;
      link.click();
      await new Promise(r => setTimeout(r, 150));
    }
  };

  return (
    <div className="bg-white p-6 border rounded">
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-xl">QR Codes ({attendees.length})</h2>
        <button onClick={downloadAllQR} className="bg-blue-600 text-white px-4 py-2 rounded">
          Download All
        </button>
      </div>

      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {attendees.map(a => <QRCodeCard key={a.id} attendee={a} />)}
        </div>
      )}
    </div>
  );
}

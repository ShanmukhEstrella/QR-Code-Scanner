import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';

type Attendee = {
  id: string;
  name: string;
  entry_gate: string;
  seating_position: string;
  qr_code: string;
};

type Props = {
  attendees: Attendee[];
};

function QRCodeCard({ attendee }: { attendee: Attendee }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, attendee.qr_code, {
        width: 200,
        margin: 2,
      });
    }
  }, [attendee.qr_code]);

  const downloadQR = () => {
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `qr-${attendee.name.replace(/\s+/g, '-')}.png`;
      a.click();
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <canvas ref={canvasRef} className="mx-auto mb-3" />
      <div className="text-center space-y-1">
        <h3 className="font-semibold text-gray-900">{attendee.name}</h3>
        <p className="text-sm text-gray-600">Gate: {attendee.entry_gate}</p>
        <p className="text-sm text-gray-600">Seat: {attendee.seating_position}</p>
        <p className="text-xs text-gray-400 font-mono">{attendee.qr_code}</p>
      </div>
      <button
        onClick={downloadQR}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
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
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-900">
            Generated QR Codes ({attendees.length})
          </h2>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-gray-700"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
        {attendees.length > 0 && (
          <button
            onClick={downloadAllQR}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Download All
          </button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {attendees.map((attendee) => (
            <QRCodeCard key={attendee.id} attendee={attendee} />
          ))}
        </div>
      )}
    </div>
  );
}

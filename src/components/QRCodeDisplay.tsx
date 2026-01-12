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
    <div className="bg-white border rounded p-4">
      <canvas ref={canvasRef} className="mx-auto mb-3" />
      <p className="text-center">{attendee.ticket_label}</p>
      <button onClick={downloadQR} className="w-full bg-blue-600 text-white py-2 mt-2 rounded">
        <Download size={16}/> Download
      </button>
    </div>
  );
}

export default function QRCodeDisplay({ attendees }: Props) {
  const [expanded, setExpanded] = useState(true);

  const downloadAllQR = async () => {
    const files: { name: string; data: Uint8Array }[] = [];

    for (const a of attendees) {
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, a.ticket_label, { width: 400 });
      const blob = await (await fetch(canvas.toDataURL())).blob();
      const buf = new Uint8Array(await blob.arrayBuffer());

      files.push({
        name: `${a.Email}/${a.ticket_label}.png`,
        data: buf
      });
    }

    // Build ZIP manually (no libs)
    const zipParts: Uint8Array[] = [];
    let offset = 0;
    const centralDir: Uint8Array[] = [];

    const textEncoder = new TextEncoder();

    const pushUint32 = (v: number) => new Uint8Array([v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >> 24) & 255]);
    const pushUint16 = (v: number) => new Uint8Array([v & 255, (v >> 8) & 255]);

    for (const f of files) {
      const nameBytes = textEncoder.encode(f.name);

      const header = new Uint8Array([
        0x50,0x4b,0x03,0x04, 20,0, 0,0, 0,0,
        ...pushUint16(0), ...pushUint16(0),
        ...pushUint32(0), ...pushUint32(f.data.length), ...pushUint32(f.data.length),
        ...pushUint16(nameBytes.length),0,0
      ]);

      zipParts.push(header, nameBytes, f.data);

      const central = new Uint8Array([
        0x50,0x4b,0x01,0x02, 20,0,20,0,0,0,0,0,
        ...pushUint16(0),...pushUint16(0),
        ...pushUint32(0),...pushUint32(f.data.length),...pushUint32(f.data.length),
        ...pushUint16(nameBytes.length),0,0,0,0,0,0,
        ...pushUint32(offset)
      ]);

      centralDir.push(central, nameBytes);
      offset += header.length + nameBytes.length + f.data.length;
    }

    const centralSize = centralDir.reduce((s,b)=>s+b.length,0);

    const end = new Uint8Array([
      0x50,0x4b,0x05,0x06,0,0,
      ...pushUint16(files.length),
      ...pushUint16(files.length),
      ...pushUint32(centralSize),
      ...pushUint32(offset),0,0
    ]);

    const zip = new Blob([...zipParts, ...centralDir, end], { type: "application/zip" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(zip);
    a.download = "QR_Tickets.zip";
    a.click();
  };

  return (
    <div className="p-6 border rounded">
      <button onClick={downloadAllQR} className="bg-blue-600 text-white px-4 py-2 rounded">
        Download All (ZIP)
      </button>

      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {attendees.map(a => <QRCodeCard key={a.id} attendee={a} />)}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";

type Attendee = {
  id: string;
  Name: string;
  Email: string;
  Gate: string;
  Passtype: string;
  ticket_label: string;
  email_batch: number;
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
  const downloadAllQR = async () => {
    const files: { path: string; data: Uint8Array }[] = [];

    for (const a of attendees) {
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, a.ticket_label, { width: 400 });

      const blob = await (await fetch(canvas.toDataURL())).blob();
      const buf = new Uint8Array(await blob.arrayBuffer());

      const folder = `${a.Email}-${a.email_batch}`;
      files.push({
        path: `${folder}/${a.ticket_label}.png`,
        data: buf
      });
    }

    // --- ZIP builder ---
    const zipParts: Uint8Array[] = [];
    const centralDir: Uint8Array[] = [];
    let offset = 0;

    const encoder = new TextEncoder();
    const u16 = (v:number)=>new Uint8Array([v&255,(v>>8)&255]);
    const u32 = (v:number)=>new Uint8Array([v&255,(v>>8)&255,(v>>16)&255,(v>>24)&255]);

    for (const f of files) {
      const name = encoder.encode(f.path);

      const header = new Uint8Array([
        0x50,0x4b,0x03,0x04,20,0,0,0,0,0,
        ...u16(0),...u16(0),
        ...u32(0),...u32(f.data.length),...u32(f.data.length),
        ...u16(name.length),0,0
      ]);

      zipParts.push(header,name,f.data);

      const central = new Uint8Array([
        0x50,0x4b,0x01,0x02,20,0,20,0,0,0,0,0,
        ...u16(0),...u16(0),
        ...u32(0),...u32(f.data.length),...u32(f.data.length),
        ...u16(name.length),0,0,0,0,0,0,
        ...u32(offset)
      ]);

      centralDir.push(central,name);
      offset += header.length + name.length + f.data.length;
    }

    const centralSize = centralDir.reduce((s,b)=>s+b.length,0);

    const end = new Uint8Array([
      0x50,0x4b,0x05,0x06,0,0,
      ...u16(files.length),...u16(files.length),
      ...u32(centralSize),...u32(offset),0,0
    ]);

    const zip = new Blob([...zipParts,...centralDir,end],{type:"application/zip"});
    const link = document.createElement("a");
    link.href = URL.createObjectURL(zip);
    link.download = "QR_Tickets.zip";
    link.click();
  };

  return (
    <div className="p-6 border rounded">
      <button onClick={downloadAllQR} className="bg-blue-600 text-white px-4 py-2 rounded">
        Download All (ZIP)
      </button>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {attendees.map(a => <QRCodeCard key={a.id} attendee={a} />)}
      </div>
    </div>
  );
}

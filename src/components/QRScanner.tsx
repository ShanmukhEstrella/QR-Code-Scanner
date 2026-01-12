import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Camera, CheckCircle, XCircle, AlertCircle } from "lucide-react";

type ScanResult = {
  status: "success" | "already_scanned" | "not_found" | "error";
  attendee?: {
    name: string;
    gate: string;
    pass: string;
  };
  previousScan?: {
    scanned_at: string;
  };
  message: string;
};

export default function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { user } = useAuth();

  // -------------------------
  // HANDLE QR SCAN
  // -------------------------
  const handleScan = async (qrValue: string) => {
    if (!user) return;

    try {
      // 🔥 CRITICAL FIX: Use ticket_label, NOT qr_code
      const { data: attendee, error } = await supabase
        .from("attendees")
        .select("*")
        .eq("ticket_label", qrValue)
        .single();

      if (error || !attendee) {
        setResult({
          status: "not_found",
          message: "QR Code not found in system"
        });
        return;
      }

      // Check if already scanned
      const { data: existingScan } = await supabase
        .from("scans")
        .select("*")
        .eq("attendee_id", attendee.id)
        .maybeSingle();

      if (existingScan) {
        setResult({
          status: "already_scanned",
          attendee: {
            name: attendee.Name,
            gate: attendee.Gate,
            pass: attendee.Passtype || "Regular"
          },
          previousScan: {
            scanned_at: existingScan.scanned_at
          },
          message: "Already scanned"
        });
        return;
      }

      // Insert scan
      await supabase.from("scans").insert({
        attendee_id: attendee.id,
        scanned_by: user.id
      });

      setResult({
        status: "success",
        attendee: {
          name: attendee.Name,
          gate: attendee.Gate,
          pass: attendee.Passtype || "Regular"
        },
        message: "Entry Allowed"
      });
    } catch (err: any) {
      setResult({
        status: "error",
        message: err.message || "Scan failed"
      });
    }
  };

  // -------------------------
  // START CAMERA
  // -------------------------
  const startScanning = async () => {
    setCameraError("");
    setResult(null);
    setScanning(true);

    setTimeout(async () => {
      try {
        if (!scannerRef.current) {
          const scanner = new Html5Qrcode("qr-reader");
          scannerRef.current = scanner;

          await scanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
              handleScan(decodedText.trim()); // trim avoids invisible mismatch
              stopScanning();
            }
          );
        }
      } catch {
        setCameraError("Camera permission denied or not available");
      }
    }, 300);
  };

  // -------------------------
  // STOP CAMERA
  // -------------------------
  const stopScanning = async () => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) scannerRef.current.stop().catch(() => {});
    };
  }, []);

  // -------------------------
  // UI ICON
  // -------------------------
  const icon = () => {
    if (result?.status === "success") return <CheckCircle className="w-14 h-14 text-green-500" />;
    if (result?.status === "already_scanned") return <AlertCircle className="w-14 h-14 text-yellow-500" />;
    return <XCircle className="w-14 h-14 text-red-500" />;
  };

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="bg-white p-6 rounded-xl shadow border">
      <h2 className="text-2xl font-bold mb-4">QR Scanner</h2>

      {cameraError && <div className="bg-red-100 p-3 mb-4">{cameraError}</div>}

      {!scanning && !result && (
        <div className="text-center py-10">
          <Camera className="w-12 h-12 mx-auto mb-4 text-blue-500" />
          <button onClick={startScanning} className="bg-blue-600 text-white px-6 py-3 rounded-lg">
            Start Scanning
          </button>
        </div>
      )}

      {scanning && (
        <>
          <div id="qr-reader" className="mb-4 rounded-lg" />
          <button onClick={stopScanning} className="bg-red-600 text-white w-full py-2 rounded">
            Stop
          </button>
        </>
      )}

      {result && (
        <div className="mt-6 border rounded p-6 text-center">
          {icon()}
          <h3 className="text-xl font-bold mt-3">{result.message}</h3>

          {result.attendee && (
            <div className="mt-4 text-left">
              <p><b>Name:</b> {result.attendee.name}</p>
              <p><b>Gate:</b> {result.attendee.gate}</p>
              <p><b>Pass:</b> {result.attendee.pass}</p>
            </div>
          )}

          <button
            onClick={() => {
              setResult(null);
              startScanning();
            }}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded"
          >
            Scan Next
          </button>
        </div>
      )}
    </div>
  );
}

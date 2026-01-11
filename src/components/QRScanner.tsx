import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

type ScanResult = {
  status: 'success' | 'already_scanned' | 'not_found' | 'error';
  attendee?: {
    name: string;
    entry_gate: string;
    seating_position: string;
  };
  previousScan?: {
    scanned_at: string;
  };
  message: string;
};

export default function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { user } = useAuth();

  const handleScan = async (qrCode: string) => {
    if (!user) return;

    try {
      const { data: attendee, error: attendeeError } = await supabase
        .from('attendees')
        .select('*')
        .eq('qr_code', qrCode)
        .maybeSingle();

      if (attendeeError || !attendee) {
        setResult({
          status: 'not_found',
          message: 'QR Code not found in system',
        });
        return;
      }

      const { data: existingScan, error: scanError } = await supabase
        .from('scans')
        .select('*')
        .eq('attendee_id', attendee.id)
        .maybeSingle();

      if (scanError) throw scanError;

      if (existingScan) {
        setResult({
          status: 'already_scanned',
          attendee: {
            name: attendee.name,
            entry_gate: attendee.entry_gate,
            seating_position: attendee.seating_position,
          },
          previousScan: {
            scanned_at: existingScan.scanned_at,
          },
          message: 'Already scanned previously',
        });
        return;
      }

      const { error: insertError } = await supabase
        .from('scans')
        .insert({
          attendee_id: attendee.id,
          scanned_by: user.id,
        });

      if (insertError) throw insertError;

      setResult({
        status: 'success',
        attendee: {
          name: attendee.name,
          entry_gate: attendee.entry_gate,
          seating_position: attendee.seating_position,
        },
        message: 'Successfully scanned',
      });
    } catch (error) {
      setResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to process scan',
      });
    }
  };

  const startScanning = async () => {
    try {
      setCameraError('');
      setResult(null);

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScan(decodedText);
          stopScanning();
        },
        () => {
          // Ignore scan failures
        }
      );

      setScanning(true);
    } catch (error) {
      setCameraError('Failed to access camera. Please ensure camera permissions are granted.');
      console.error('Camera error:', error);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const getStatusIcon = () => {
    switch (result?.status) {
      case 'success':
        return <CheckCircle className="w-16 h-16 text-green-500" />;
      case 'already_scanned':
        return <AlertCircle className="w-16 h-16 text-yellow-500" />;
      case 'not_found':
      case 'error':
        return <XCircle className="w-16 h-16 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (result?.status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'already_scanned':
        return 'bg-yellow-50 border-yellow-200';
      case 'not_found':
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">QR Code Scanner</h2>

      {cameraError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {cameraError}
        </div>
      )}

      {!scanning && !result && (
        <div className="text-center py-12">
          <div className="bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Camera className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Scan</h3>
          <p className="text-gray-600 mb-6">Click the button below to start scanning QR codes</p>
          <button
            onClick={startScanning}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Start Scanning
          </button>
        </div>
      )}

      {scanning && (
        <div>
          <div id="qr-reader" className="rounded-lg overflow-hidden mb-4" />
          <button
            onClick={stopScanning}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Stop Scanning
          </button>
        </div>
      )}

      {result && (
        <div className={`border rounded-lg p-6 ${getStatusColor()}`}>
          <div className="flex flex-col items-center text-center">
            {getStatusIcon()}
            <h3 className="text-xl font-bold text-gray-900 mt-4 mb-2">
              {result.message}
            </h3>

            {result.attendee && (
              <div className="mt-4 space-y-2 text-left w-full max-w-md">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-semibold text-gray-900">{result.attendee.name}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600">Entry Gate</p>
                  <p className="font-semibold text-gray-900">{result.attendee.entry_gate}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <p className="text-sm text-gray-600">Seating Position</p>
                  <p className="font-semibold text-gray-900">{result.attendee.seating_position}</p>
                </div>
              </div>
            )}

            {result.previousScan && (
              <div className="mt-4 bg-white rounded-lg p-4 shadow-sm w-full max-w-md">
                <p className="text-sm text-gray-600">Previously Scanned At</p>
                <p className="font-semibold text-gray-900">
                  {new Date(result.previousScan.scanned_at).toLocaleString()}
                </p>
              </div>
            )}

            <button
              onClick={() => {
                setResult(null);
                startScanning();
              }}
              className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Scan Another QR Code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

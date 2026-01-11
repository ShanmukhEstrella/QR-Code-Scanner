import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Upload, ScanLine, Users, LogOut } from 'lucide-react';
import UploadCSV from './UploadCSV';
import QRScanner from './QRScanner';
import AttendeesList from './AttendeesList';

type Tab = 'upload' | 'scanner' | 'attendees';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const { user, signOut } = useAuth();

  const tabs = [
    { id: 'upload' as Tab, label: 'Upload CSV', icon: Upload },
    { id: 'scanner' as Tab, label: 'Scan QR', icon: ScanLine },
    { id: 'attendees' as Tab, label: 'Attendees', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <ScanLine className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">QR Attendance System</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={signOut}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {activeTab === 'upload' && <UploadCSV />}
          {activeTab === 'scanner' && <QRScanner />}
          {activeTab === 'attendees' && <AttendeesList />}
        </div>
      </div>
    </div>
  );
}

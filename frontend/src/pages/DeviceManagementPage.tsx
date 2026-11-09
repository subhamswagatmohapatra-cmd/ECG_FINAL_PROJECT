import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Device } from '../types';
import {
  Watch, Bluetooth, Battery, RefreshCw, Plus, CheckCircle2,
  Trash2, ShieldCheck, Smartphone, Wifi, Radio, Zap
} from 'lucide-react';

export const DeviceManagementPage: React.FC = () => {
  const { showToast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  // New Device Modal
  const [showPairModal, setShowPairModal] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string>('');
  const [deviceType, setDeviceType] = useState<string>('smartwatch');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [pairingLoading, setPairingLoading] = useState<boolean>(false);

  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await api.getDevices();
      setDevices(data);
    } catch (err: any) {
      showToast('Error Loading Devices', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const handlePairDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName || !serialNumber) {
      showToast('Missing Details', 'Please fill in device name and serial number.', 'warning');
      return;
    }

    setPairingLoading(true);
    try {
      const newDev = await api.registerDevice({
        device_name: deviceName,
        device_type: deviceType,
        serial_number: serialNumber,
        firmware_version: 'v2.4.1',
      });
      setDevices((prev) => [...prev, newDev]);
      setShowPairModal(false);
      setDeviceName('');
      setSerialNumber('');
      showToast('Device Paired', `${newDev.device_name} successfully linked to your patient profile.`, 'success');
    } catch (err: any) {
      showToast('Pairing Failed', err.message, 'error');
    } finally {
      setPairingLoading(false);
    }
  };

  const handleSyncReading = async (device: Device) => {
    setSyncingId(device.id);
    try {
      // Generate realistic vitals reading
      const simulatedBpm = Math.floor(Math.random() * (85 - 65 + 1)) + 65;
      await api.syncDeviceReading(device.id, simulatedBpm, 'resting');
      await loadDevices();
      showToast('Telemetry Synced', `Transmitted ${simulatedBpm} BPM from ${device.device_name}.`, 'success');
    } catch (err: any) {
      showToast('Sync Failed', err.message, 'error');
    } finally {
      setSyncingId(null);
    }
  };

  const handleToggleConnection = async (deviceId: number) => {
    try {
      const updated = await api.toggleDeviceConnection(deviceId);
      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, is_connected: updated.is_connected } : d))
      );
      showToast(
        updated.is_connected ? 'Device Connected' : 'Device Disconnected',
        `Connection state toggled.`,
        'info'
      );
    } catch (err: any) {
      showToast('Action Failed', err.message, 'error');
    }
  };

  const handleRemoveDevice = async (deviceId: number) => {
    if (!window.confirm('Are you sure you want to unpair and remove this device?')) return;
    try {
      await api.removeDevice(deviceId);
      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      showToast('Device Removed', 'The wearable has been unpaired.', 'info');
    } catch (err: any) {
      showToast('Unpairing Failed', err.message, 'error');
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-700/80 shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold mb-2">
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            BIOMETRIC TELEMETRY & WEARABLE INTEGRATION
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Connected Wearables & Sensor Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Manage Bluetooth Low Energy (BLE) monitors, smartwatches, pulse oximeters, and Apple Health / Health Connect data pipelines.
          </p>
        </div>

        <button
          onClick={() => setShowPairModal(true)}
          className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-teal-500/20 transition flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Pair New Sensor / BLE Wearable
        </button>
      </div>

      {/* Paired Devices Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Watch className="w-4 h-4 text-teal-400" />
          Active Device Fleet ({devices.length})
        </h2>

        {devices.length === 0 ? (
          <div className="glass-panel p-10 rounded-3xl border border-slate-700/60 text-center space-y-3">
            <Watch className="w-12 h-12 text-slate-600 mx-auto stroke-[1.5]" />
            <h3 className="text-sm font-bold text-slate-300">No Wearables Paired</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Link your Apple Watch, Garmin, Polar H10, or Omron pulse monitor to enable continuous heart rate streaming.
            </p>
            <button
              onClick={() => setShowPairModal(true)}
              className="mt-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 px-4 py-2 rounded-xl text-xs font-semibold transition"
            >
              Add First Device
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {devices.map((dev) => (
              <div
                key={dev.id}
                className="glass-panel p-5 rounded-2xl border border-slate-700/60 flex flex-col justify-between space-y-4 hover:border-slate-600 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400">
                        <Watch className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-white">{dev.device_name}</h4>
                        <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                          {dev.device_type}
                        </span>
                      </div>
                    </div>

                    <span
                      onClick={() => handleToggleConnection(dev.id)}
                      className={`cursor-pointer px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase flex items-center gap-1 transition ${
                        dev.is_connected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${dev.is_connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                      {dev.is_connected ? 'CONNECTED' : 'STANDBY'}
                    </span>
                  </div>

                  {/* Device Specs */}
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Serial Number:</span>
                      <span className="text-slate-200">{dev.serial_number}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Firmware Version:</span>
                      <span className="text-cyan-300">{dev.firmware_version || 'v2.4.1'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Battery Status:</span>
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <Battery className="w-3.5 h-3.5" />
                        {dev.battery_level}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Last Ingestion:</span>
                      <span className="text-slate-300 text-[11px]">
                        {dev.last_sync_time ? new Date(dev.last_sync_time).toLocaleTimeString() : 'Baseline'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleSyncReading(dev)}
                    disabled={syncingId === dev.id || !dev.is_connected}
                    className="flex items-center gap-1.5 text-xs text-teal-400 hover:text-teal-300 font-semibold transition disabled:opacity-40"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingId === dev.id ? 'animate-spin' : ''}`} />
                    <span>Sync Vitals</span>
                  </button>

                  <button
                    onClick={() => handleRemoveDevice(dev.id)}
                    className="text-xs text-slate-500 hover:text-red-400 transition p-1"
                    title="Unpair Device"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cloud & Platform Sync Integration Guides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Apple HealthKit */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-700/60 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold">
              
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Apple HealthKit Integration</h3>
              <p className="text-[11px] text-slate-400 font-mono">HKQuantityTypeIdentifierHeartRate</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            CardioPulse AI seamlessly maps Apple Watch optical photoplethysmography (PPG) and ECG Lead I recordings
            to HL7 FHIR Observation standards with automatic resting heart rate stratification.
          </p>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="text-teal-400 font-bold">Supported Apple Watch Metrics:</div>
            <div>• Continuous High/Low Heart Rate Notifications</div>
            <div>• Irregular Rhythm Notifications (AFib detection)</div>
            <div>• Heart Rate Variability (SDNN) in ms</div>
          </div>
        </div>

        {/* Google Health Connect */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-700/60 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Android Health Connect</h3>
              <p className="text-[11px] text-slate-400 font-mono">androidx.health.connect.client</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Standardized on-device privacy-preserving bridge linking Samsung Galaxy Watch, Google Pixel Watch,
            and Fitbit telemetry securely into your CardioPulse clinical record.
          </p>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="text-cyan-400 font-bold">Supported Android Metrics:</div>
            <div>• HeartRateRecord with continuous sample series</div>
            <div>• RestingHeartRateRecord baseline calculation</div>
            <div>• OxygenSaturationRecord (SpO2 percentage)</div>
          </div>
        </div>
      </div>

      {/* PAIR DEVICE MODAL */}
      {showPairModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-slate-700 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Bluetooth className="w-4 h-4 text-cyan-400" />
                Pair Bluetooth LE / Optical Sensor
              </h3>
              <button
                onClick={() => setShowPairModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ ESC
              </button>
            </div>

            <form onSubmit={handlePairDevice} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Device Name / Brand</label>
                <input
                  type="text"
                  placeholder="e.g. Polar H10 Chest Strap, Garmin Forerunner 965"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Device Hardware Category</label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="smartwatch">Smartwatch (Optical PPG)</option>
                  <option value="chest_strap">ECG Chest Strap (Polar / Garmin)</option>
                  <option value="pulse_oximeter">Clinical Fingertip Pulse Oximeter</option>
                  <option value="blood_pressure_cuff">Digital Sphygmomanometer Cuff</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Hardware Serial / BLE Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. SN-88942-PLR"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPairModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pairingLoading}
                  className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 text-white font-bold px-5 py-2 rounded-xl shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
                >
                  {pairingLoading ? 'Initiating BLE Handshake...' : 'Pair & Authorize Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


const API_BASE = '/api/v1';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('cardiopulse_token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `Request failed: ${response.statusText}`;
      try {
        const errorJson = await response.json();
        errorMsg = errorJson.detail || errorMsg;
      } catch (e) {
        // fallback
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(data: any) {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // Patient Profile
  async getPatientProfile() {
    return this.request<any>('/patients/profile');
  }

  async updatePatientProfile(data: any) {
    return this.request<any>('/patients/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateMedicalHistory(data: any) {
    return this.request<any>('/patients/medical-history', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async addMedication(data: any) {
    return this.request<any>('/patients/medications', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteMedication(id: number) {
    return this.request<any>(`/patients/medications/${id}`, {
      method: 'DELETE',
    });
  }

  async addAllergy(data: any) {
    return this.request<any>('/patients/allergies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAllergy(id: number) {
    return this.request<any>(`/patients/allergies/${id}`, {
      method: 'DELETE',
    });
  }

  // Readings
  async createReading(data: any) {
    return this.request<any>('/readings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getReadings(limit: number = 50) {
    return this.request<any[]>(`/readings?limit=${limit}`);
  }

  async getMetricsSummary(days: number = 7) {
    return this.request<any>(`/readings/metrics/summary?days=${days}`);
  }

  // AI Analysis
  async evaluateReading(readingId: number) {
    return this.request<any>(`/analysis/evaluate/${readingId}`, {
      method: 'POST',
    });
  }

  async getLatestAnalysis() {
    return this.request<any>('/analysis/latest');
  }

  // Reports
  async generateReport() {
    return this.request<any>('/reports/generate', {
      method: 'POST',
    });
  }

  async getReports() {
    return this.request<any[]>('/reports');
  }

  async getReportById(id: number) {
    return this.request<any>(`/reports/${id}`);
  }

  getPdfDownloadUrl(reportId: number): string {
    return `${API_BASE}/reports/${reportId}/download-pdf`;
  }

  // Doctor Portal
  async getDoctorPatients(query?: string) {
    const q = query ? `?query=${encodeURIComponent(query)}` : '';
    return this.request<any[]>(`/doctor/patients${q}`);
  }

  async getDoctorPatientDossier(patientId: number) {
    return this.request<any>(`/doctor/patients/${patientId}`);
  }

  async reviewDoctorReport(reportId: number, data: { clinician_notes: string; recommended_followup?: string; approved: boolean }) {
    return this.request<any>(`/doctor/reports/${reportId}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Chat
  async sendChatMessage(message: string, history: any[] = []) {
    return this.request<any>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversation_history: history }),
    });
  }

  // Privacy & Consent
  async getConsent() {
    return this.request<any>('/privacy/consent');
  }

  async updateConsent(data: any) {
    return this.request<any>('/privacy/consent', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getAuditLogs(limit: number = 50) {
    return this.request<any[]>(`/privacy/audit-logs?limit=${limit}`);
  }

  async requestDataDeletion() {
    return this.request<any>('/privacy/delete-my-data', {
      method: 'POST',
    });
  }

  // Appointments
  async getAvailableDoctors() {
    return this.request<any[]>('/appointments/doctors');
  }

  async getAppointments(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<any[]>(`/appointments${query}`);
  }

  async createAppointment(data: { doctor_id: number; appointment_date: string; appointment_type?: string; reason: string; clinical_notes?: string }) {
    return this.request<any>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAppointment(id: number, data: { status?: string; clinical_notes?: string; appointment_date?: string }) {
    return this.request<any>(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Messaging
  async getMessages(otherUserId?: number) {
    const query = otherUserId ? `?other_user_id=${otherUserId}` : '';
    return this.request<any[]>(`/messages${query}`);
  }

  async sendMessage(data: { recipient_id: number; content: string; is_urgent?: boolean; patient_id?: number }) {
    return this.request<any>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async markMessageRead(id: number) {
    return this.request<any>(`/messages/${id}/read`, {
      method: 'PATCH',
    });
  }

  async getUnreadMessageCount() {
    return this.request<{ unread_count: number }>('/messages/unread/count');
  }

  // Notifications
  async getNotifications(category?: string) {
    const query = category ? `?category=${category}` : '';
    return this.request<any[]>(`/notifications${query}`);
  }

  async markNotificationRead(id: number) {
    return this.request<any>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsRead() {
    return this.request<any>('/notifications/read-all', {
      method: 'POST',
    });
  }

  async getUnreadNotificationCount() {
    return this.request<{ unread_count: number }>('/notifications/unread/count');
  }

  // Wearables & Devices
  async getDevices() {
    return this.request<any[]>('/devices');
  }

  async registerDevice(data: { device_name: string; device_type: string; serial_number: string; mac_address?: string; firmware_version?: string }) {
    return this.request<any>('/devices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async syncDeviceReading(deviceId: number, bpm?: number, restingStatus: string = 'resting') {
    const query = bpm ? `?bpm=${bpm}&resting_status=${restingStatus}` : `?resting_status=${restingStatus}`;
    return this.request<any>(`/devices/${deviceId}/sync${query}`, {
      method: 'POST',
    });
  }

  async toggleDeviceConnection(deviceId: number) {
    return this.request<any>(`/devices/${deviceId}/toggle-connection`, {
      method: 'PATCH',
    });
  }

  async removeDevice(deviceId: number) {
    return this.request<any>(`/devices/${deviceId}`, {
      method: 'DELETE',
    });
  }

  // Education Center
  async getEducationModules() {
    return this.request<any[]>('/education/modules');
  }

  async getEducationModuleBySlug(slug: string) {
    return this.request<any>(`/education/modules/${slug}`);
  }

  async submitModuleQuiz(moduleId: number, answers: Record<string, string>) {
    return this.request<any>(`/education/modules/${moduleId}/quiz`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  }

  // Cardiovascular Analytics
  async getCardiovascularAnalytics() {
    return this.request<any>('/analytics/overview');
  }

  // Admin Management
  async getAdminStats() {
    return this.request<any>('/admin/stats');
  }

  async getAdminUsers() {
    return this.request<any[]>('/admin/users');
  }

  async updateAdminUser(userId: number, data: { is_active?: boolean; role?: string }) {
    return this.request<any>(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async verifyDoctorLicense(doctorId: number, verified: boolean = true) {
    return this.request<any>(`/admin/doctors/${doctorId}/verify?verified=${verified}`, {
      method: 'POST',
    });
  }

  async getGlobalAuditLogs(limit: number = 100) {
    return this.request<any[]>(`/admin/audit-logs?limit=${limit}`);
  }

  // AI ECG Signal Analysis
  async uploadECG(formData: FormData) {
    return this.request<any>('/ecg/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async getECGUploads() {
    return this.request<any[]>('/ecg/uploads');
  }

  async getECGUploadDetails(uploadId: number) {
    return this.request<any>(`/ecg/uploads/${uploadId}`);
  }

  async submitECGToDoctor(uploadId: number, data: { doctor_id?: number; patient_notes?: string }) {
    return this.request<any>(`/ecg/uploads/${uploadId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getECGDemoPresets() {
    return this.request<any[]>('/ecg/demo-presets');
  }

  getECGPdfUrl(uploadId: number) {
    return `/api/v1/ecg/uploads/${uploadId}/pdf`;
  }

  // Doctor Clinical Portal
  async getDoctorProfile() {
    return this.request<any>('/doctor/me');
  }

  async updateDoctorProfile(data: { specialty?: string; hospital_affiliation?: string; qualifications?: string; years_of_experience?: number; bio?: string; phone_number?: string }) {
    return this.request<any>('/doctor/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async getDoctorECGSubmissions(statusFilter?: string) {
    const q = statusFilter ? `?status_filter=${statusFilter}` : '';
    return this.request<any[]>(`/doctor/submissions${q}`);
  }

  async recordClinicalObservation(uploadId: number, data: { observations_text: string; differential_diagnosis?: string; recommendations?: string; prescriptions_updated?: string; urgency_level?: string }) {
    return this.request<any>(`/doctor/submissions/${uploadId}/observe`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDoctorAvailability() {
    return this.request<any[]>('/doctor/availability');
  }

  async setDoctorAvailability(data: { day_of_week: string; start_time: string; end_time: string; slot_duration_minutes?: number; is_available?: boolean }) {
    return this.request<any>('/doctor/availability', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDoctorAppointments() {
    return this.request<any[]>('/doctor/appointments');
  }

  async scheduleDoctorAppointment(data: { patient_id: number; appointment_date: string; appointment_type?: string; reason?: string }) {
    const q = new URLSearchParams({
      patient_id: data.patient_id.toString(),
      appointment_date: data.appointment_date,
      appointment_type: data.appointment_type || 'telehealth',
      reason: data.reason || 'ECG rhythm follow-up and review'
    }).toString();
    return this.request<any>(`/doctor/appointments?${q}`, {
      method: 'POST',
    });
  }

  async updateAppointmentStatus(appointmentId: number, status: string, clinicalNotes?: string) {
    const q = new URLSearchParams({ status_update: status });
    if (clinicalNotes) q.append('clinical_notes', clinicalNotes);
    return this.request<any>(`/doctor/appointments/${appointmentId}/status?${q.toString()}`, {
      method: 'PUT',
    });
  }

  // Admin Extended Management
  async getPendingDoctors() {
    return this.request<any[]>('/admin/doctors/pending');
  }

  async reviewDoctorVerification(doctorId: number, data: { status: string; review_notes?: string }) {
    return this.request<any>(`/admin/doctors/${doctorId}/review-verification`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAdminECGMonitoring() {
    return this.request<any>('/admin/ecg-monitoring');
  }
}

export const api = new ApiService();

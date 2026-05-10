import { useState } from 'react';
import { createEntry } from '@/features/entry-upload/entryUpload.service';

export default function ManualEntryForm({ eventId, onEntryCreated, onError }) {
  const [formData, setFormData] = useState({
    employeeId: '',
    fullName: '',
    department: '',
    email: '',
    entryCode: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field, value) => {
    if (field === 'employeeId') {
      // Allow only digits and limit to 7 characters
      value = value.replace(/\D/g, '').slice(0, 7);
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createEntry({ eventId, ...formData });
      setFormData({
        employeeId: '',
        fullName: '',
        department: '',
        email: '',
        entryCode: ''
      });
      onEntryCreated();
    } catch (err) {
      onError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.employeeId.length === 7 && formData.fullName.trim() !== '' && formData.department.trim() !== '' && formData.email.trim() !== '' && formData.entryCode.trim() !== '';

  return (
    <div className="feature-shell">
      <h3 className="text-lg font-semibold mb-4">Add Entry Manually</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
              Employee ID *
            </label>
            <input
              type="text"
              id="employeeId"
              value={formData.employeeId}
              onChange={(e) => handleChange('employeeId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              maxLength="7"
              inputMode="numeric"
              pattern="[0-9]{7}"
              placeholder="1234567"
              required
            />
          </div>

          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-1">
              Department *
            </label>
            <input
              type="text"
              id="department"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="IT Department"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="john.doe@company.com"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="entryCode" className="block text-sm font-medium text-gray-700 mb-1">
              Entry Code *
            </label>
            <input
              type="text"
              id="entryCode"
              value={formData.entryCode}
              onChange={(e) => handleChange('entryCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="ABC123"
              required
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}
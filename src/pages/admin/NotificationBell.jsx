// src/pages/admin/NotificationBell.jsx
import React from 'react';
import { useSelector } from 'react-redux';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const navigate = useNavigate();

  // Get notifications from Redux (same state used in AdminLayout)
  const notifications = useSelector((state) => state.notifications?.notifications || {
    matricules: { total: 0, critical: 0 },
    reservations: { total: 0, critical: 0 },
    accidents: { total: 0, critical: 0 },
    payments: { total: 0, critical: 0 },
  });

  // Sum up total notifications across all categories
  const totalCount = Object.values(notifications).reduce(
    (sum, cat) => sum + (cat.total || 0),
    0
  );

  const handleClick = () => {
    // Navigate to a page where all notifications are listed
    // Adjust the route if your app has a different notifications page
    navigate('/notifications');
  };

  return (
    <button
      onClick={handleClick}
      className="relative p-2 rounded-full hover:bg-gray-700 transition-colors"
      aria-label="Notifications"
    >
      <Bell className="w-5 h-5 text-gray-300" />
      {totalCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
          {totalCount > 9 ? '9+' : totalCount}
        </span>
      )}
    </button>
  );
}